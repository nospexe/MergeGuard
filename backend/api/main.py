import asyncio
import logging
import os
import re
import time
from pathlib import Path
from dataclasses import asdict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, field_validator
from starlette.middleware.base import BaseHTTPMiddleware

from collections import Counter

from engines.blast_radius import analyze_blast_radius, RepositoryScanner
from engines.post_mortem import mine_association_rules
from engines.coverage_overlay import build_coverage_overlay
from utils.path_validator import validate_repo_path, resolve_repo_path

load_dotenv()

logger = logging.getLogger(__name__)

VERSION = "0.2.0"
OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder")


# ---------------------------------------------------------------------------
# Python source root detection
# ---------------------------------------------------------------------------

# Common directory names that are likely to be Python source roots
_PYTHON_ROOT_CANDIDATES = {"backend", "src", "app", "lib", "server", "service", "core"}

def find_python_source_root(repo_path: str) -> str:
    """Find the actual Python source root within a repository.

    The blast radius engine needs module paths that match the import
    statements in the code.  For example, if api/main.py does
    ``from engines.blast_radius import ...``, the scanner must be rooted
    at the directory that contains both ``api/`` and ``engines/``.

    If the repo root itself is that directory, we return it unchanged.
    If the Python packages live inside a subdirectory (e.g. ``backend/``),
    we return that subdirectory instead.

    Detection strategy:
      1. If the repo root contains typical Python package dirs with
         __init__.py (like api/, engines/, utils/), use the repo root.
      2. Otherwise, look one level down for known candidate dirs
         (backend/, src/, app/, etc.) that contain __init__.py and
         at least two Python sub-packages.
      3. If nothing matches, return the repo root as-is.
    """
    root = Path(repo_path).resolve()

    # Check if repo root itself is a valid Python source root
    if _is_python_source_root(root):
        logger.info("Python source root: %s (repo root)", root)
        return str(root)

    # Look one level down for common candidate directories
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name.startswith(".") or child.name in {"node_modules", "venv", ".venv", "__pycache__"}:
            continue

        # Prioritise known candidate names
        if child.name.lower() in _PYTHON_ROOT_CANDIDATES and _is_python_source_root(child):
            logger.info("Python source root: %s (candidate '%s')", child, child.name)
            return str(child)

    # Second pass: any child directory that looks like a Python root
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name.startswith(".") or child.name in {"node_modules", "venv", ".venv", "__pycache__"}:
            continue
        if child.name.lower() not in _PYTHON_ROOT_CANDIDATES and _is_python_source_root(child):
            logger.info("Python source root: %s (auto-detected)", child)
            return str(child)

    logger.info("Python source root: %s (fallback to repo root)", root)
    return str(root)


def _is_python_source_root(directory: Path) -> bool:
    """Check whether *directory* looks like a Python source root.

    A directory qualifies if it contains at least two immediate
    subdirectories that each have an ``__init__.py`` (i.e. two Python
    packages).  This filters out directories that only happen to have
    a single ``__init__.py`` at their own level.
    """
    py_packages = 0
    try:
        for child in directory.iterdir():
            if child.is_dir() and (child / "__init__.py").exists():
                py_packages += 1
                if py_packages >= 2:
                    return True
    except PermissionError:
        pass
    return False


def translate_blast_radius(result, symbol_tables: dict = None, coverage_results: list = None) -> dict:
    raw = asdict(result)
    nodes = []

    # Map for easy lookup of coverage pct and functions
    coverage_map = {a.qualified_name: a.coverage_percent / 100.0 for a in (coverage_results or [])}
    
    def get_node_metadata(symbol_path: str):
        # coverage_status is used for the ring logic, but numeric 'coverage' is used for the heatmap
        pct = coverage_map.get(symbol_path, 1.0) # Default to 1.0 if no info
        
        # Get function names from symbol_tables
        funcs = []
        if symbol_tables:
            # symbol_path might be module.func or just module
            parts = symbol_path.split('.')
            mod_path = ".".join(parts[:-1]) if len(parts) > 1 else symbol_path
            if mod_path in symbol_tables:
                funcs = [d.qualified_name.split('.')[-1] for d in symbol_tables[mod_path].definitions]
        
        return pct, funcs

    for i, symbol in enumerate(raw["changed_symbols"]):
        cov, funcs = get_node_metadata(symbol)
        nodes.append({
            "id": f"n{i}",
            "file": symbol.replace(".", "/") + ".py",
            "symbol": symbol.split(".")[-1],
            "coverage_status": "covered",
            "coverage": cov,
            "functions": funcs,
            "ring": 0
        })

    offset = len(nodes)
    for i, module in enumerate(raw["direct_dependents"]):
        cov, funcs = get_node_metadata(module)
        nodes.append({
            "id": f"n{offset + i}",
            "file": module.replace(".", "/") + ".py",
            "symbol": module.split(".")[-1],
            "coverage_status": ("uncovered" if module in raw["uncovered_nodes"] else "covered"),
            "coverage": cov,
            "functions": funcs,
            "ring": 1
        })

    offset = len(nodes)
    for i, module in enumerate(raw["transitive_dependents"]):
        cov, funcs = get_node_metadata(module)
        nodes.append({
            "id": f"n{offset + i}",
            "file": module.replace(".", "/") + ".py",
            "symbol": module.split(".")[-1],
            "coverage_status": ("uncovered" if module in raw["uncovered_nodes"] else "partial"),
            "coverage": cov,
            "functions": funcs,
            "ring": 2
        })

    module_to_id = {node["file"]: node["id"] for node in nodes}

    edges = []
    for edge in raw["dependency_edges"]:
        source_file = edge["from"].replace(".", "/") + ".py"
        target_file = edge["to"].replace(".", "/") + ".py"
        if source_file in module_to_id and target_file in module_to_id:
            edges.append({
                "source": module_to_id[source_file],
                "target": module_to_id[target_file]
            })

    tier_map = {
        "LOW":      "low",
        "MEDIUM":   "medium",
        "HIGH":     "high",
        "CRITICAL": "high"  
    }
    risk_level = tier_map.get(raw["risk_tier"], "medium")

    return {
        "nodes": nodes,
        "edges": edges,
        "risk_score": raw["risk_score"],
        "risk_level": risk_level,
        "overall_coverage": raw.get("overall_coverage", 0.0)
    }


def translate_postmortem(rules: list[dict]) -> dict:
    matches = []
    all_files = set()

    for i, rule in enumerate(rules):

        involved_files = list(rule["antecedents"]) + list(rule["consequents"])
        all_files.update(involved_files)

        support_count = max(1, round(rule["support"] * 500))

        matches.append({
            "pattern_id": f"FP-{i + 1:03d}",     
            "files": involved_files,
            "support": support_count,
            "confidence": rule["confidence"],
            "evidence_commits": []                  
        })


    file_counts = Counter(
        f for rule in rules
        for f in list(rule["antecedents"]) + list(rule["consequents"])
    )
    top_risk_files = [f for f, _ in file_counts.most_common(5)]

    return {
        "matches": matches,
        "top_risk_files": top_risk_files
    }


app = FastAPI(
    title="MergeGuard API",
    version=VERSION,
    description="Pre-merge intelligence for engineering teams."
)


# ── Security Headers Middleware ──

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Exception Handlers ──

DAN_CHARS_RE = re.compile(r"[;|`$\n\r\t\x00]")


def _make_serializable(obj):
    """Recursively convert an object to JSON-safe primitives."""
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {str(k): _make_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_make_serializable(i) for i in obj]
    return str(obj)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s: %s", request.url.path, str(exc))
    safe_errors = _make_serializable(exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": safe_errors},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


class AnalyzeRequest(BaseModel):
    repo_path: str
    base_branch: str = "main"
    pr_branch: str

    @field_validator("repo_path", "base_branch", "pr_branch")
    @classmethod
    def must_not_be_empty(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError(f"{info.field_name} must not be empty")
        return v

    @field_validator("repo_path", "base_branch", "pr_branch")
    @classmethod
    def must_not_be_too_long(cls, v: str, info) -> str:
        if len(v) > 500:
            raise ValueError(f"{info.field_name} exceeds maximum length of 500 characters")
        return v

    @field_validator("repo_path")
    @classmethod
    def must_not_contain_dangerous_chars(cls, v: str) -> str:
        if DAN_CHARS_RE.search(v):
            raise ValueError("repo_path contains forbidden characters")
        return v

    @field_validator("base_branch", "pr_branch")
    @classmethod
    def branch_must_be_safe(cls, v: str, info) -> str:
        if DAN_CHARS_RE.search(v):
            raise ValueError(f"{info.field_name} contains forbidden characters")
        return v


# Response Models

class BlastRadiusNode(BaseModel):
    id: str               
    file: str              
    symbol: str             
    coverage_status: str     
    coverage: float
    functions: list[str]
    ring: int               


class BlastRadiusEdge(BaseModel):
    source: str            
    target: str             


class BlastRadiusResponse(BaseModel):
    nodes: list[BlastRadiusNode]   
    edges: list[BlastRadiusEdge]
    risk_score: float             
    risk_level: str
    overall_coverage: float

class FingerprintMatch(BaseModel):
    pattern_id: str             
    files: list[str]            
    support: int                 
    confidence: float           
    evidence_commits: list[str]  


class PostMortemResponse(BaseModel):
    matches: list[FingerprintMatch]  
    top_risk_files: list[str]         


class RecommendationResponse(BaseModel):
    verdict: str     
    summary: str       
    blast_risk: str  
    pattern_risk: str 



#Routes

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": VERSION,
    }

def resolve_changed_symbols(
    repo_path: str, base: str, pr: str, source_root: str | None = None,
) -> tuple[list[str], dict, str]:
    """Find symbols affected by changes between base and pr branches.
    
    Returns (changed_symbols, symbol_tables, source_root) so callers
    can reuse both the scan and the detected source root.
    When git diff fails or finds no Python changes, falls back to scanning
    the entire repo and treating all top-level symbols as changed.
    """
    # Detect the correct Python source root if not provided
    if source_root is None:
        source_root = find_python_source_root(repo_path)

    scanner = RepositoryScanner(source_root)
    tables = scanner.scan()

    # Try git diff between the two branches (uses the git repo root)
    diff_files: list[str] = []
    try:
        from git import Repo as GitRepo
        repo = GitRepo(repo_path)
        
        # Check if both branches exist
        branch_names = [ref.name for ref in repo.references]
        base_exists = any(base in name for name in branch_names)
        pr_exists = any(pr in name for name in branch_names)

        if base_exists and pr_exists:
            diff_output = repo.git.diff(f"{base}...{pr}", "--name-only")
            diff_files = [f for f in diff_output.splitlines() if f.endswith(".py")]
            logger.info("Git diff found %d changed Python files between %s...%s", len(diff_files), base, pr)
        else:
            logger.warning(
                "Branch lookup: base '%s' exists=%s, pr '%s' exists=%s. "
                "Falling back to full-repo scan.",
                base, base_exists, pr, pr_exists,
            )
    except Exception as e:
        logger.warning("Git diff failed (%s), falling back to full-repo scan", e)

    # Resolve diff files to symbols
    # Git diff paths are relative to the git root, but the scanner is rooted
    # at source_root. We need to resolve the absolute path and check if it
    # falls under source_root.
    if diff_files:
        affected_symbols = []
        repo_root_path = Path(repo_path).resolve()
        source_root_path = Path(source_root).resolve()

        for f in diff_files:
            abs_path = repo_root_path / f
            # Check if this file is under the source root
            try:
                abs_path.relative_to(source_root_path)
            except ValueError:
                continue  # file is outside the Python source root
            try:
                mod_path = scanner._file_to_module_path(abs_path)
            except ValueError:
                continue
            if mod_path in tables:
                symbols = [d.qualified_name for d in tables[mod_path].definitions]
                affected_symbols.extend(symbols)
                logger.info("  %s -> %d symbols", f, len(symbols))

        if affected_symbols:
            logger.info("Resolved %d symbols from %d changed files", len(affected_symbols), len(diff_files))
            return affected_symbols, tables, source_root

        # Diff found files but no symbols — treat the module paths themselves as changed
        module_paths = []
        for f in diff_files:
            abs_path = repo_root_path / f
            try:
                abs_path.relative_to(source_root_path)
            except ValueError:
                continue
            try:
                mod_path = scanner._file_to_module_path(abs_path)
                if mod_path in tables:
                    module_paths.append(mod_path)
            except ValueError:
                continue
        if module_paths:
            logger.info("Using %d module paths as changed symbols (no defs found)", len(module_paths))
            return module_paths, tables, source_root

    # Fallback: treat ALL symbols in the repo as changed
    # This gives a meaningful blast radius for demo/exploration purposes
    all_symbols = []
    for mod_path, table in tables.items():
        for defn in table.definitions:
            all_symbols.append(defn.qualified_name)
    
    if all_symbols:
        # Limit to first 20 symbols to keep analysis manageable
        limited = all_symbols[:20]
        logger.info(
            "Fallback: using %d/%d symbols from full repo scan",
            len(limited), len(all_symbols),
        )
        return limited, tables, source_root

    logger.warning("No symbols found in repo at all")
    return [], tables, source_root

@app.post("/api/blast-radius", response_model=BlastRadiusResponse)
def get_blast_radius(req: AnalyzeRequest):

    is_valid, error, resolved_path = resolve_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        # 1. Resolve symbols (also returns symbol tables and detected source root)
        symbols, tables, source_root = resolve_changed_symbols(resolved_path, req.base_branch, req.pr_branch)
        logger.info("Blast radius: resolved %d symbols for %s...%s (source_root=%s)", len(symbols), req.base_branch, req.pr_branch, source_root)

        # 2. Get Coverage Overlay
        uncovered_nodes = []
        overall_coverage = 0.0
        coverage_annotations = []
        coverage_path = Path(source_root) / ".coverage"
        
        if coverage_path.exists():
            try:
                cvm = build_coverage_overlay(coverage_path, tables, source_root)
                uncovered_nodes = cvm.uncovered_module_paths
                overall_coverage = cvm.overall_coverage_percent
                coverage_annotations = cvm.annotations
            except Exception as e:
                logging.warning("Coverage overlay error: %s", e)

        # 3. Analyze Blast Radius with Coverage Data (using source root, not git root)
        result = analyze_blast_radius(
            repo_root=source_root,
            changed_symbols=symbols, 
            uncovered_nodes=uncovered_nodes,
            use_rope=False
        )
        
    except Exception as e:
        logger.error("BlastRadius engine error: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"BlastRadius engine error: {str(e)}")
    
    translated = translate_blast_radius(result, tables, coverage_annotations)
    translated["overall_coverage"] = overall_coverage
    logger.info("Blast radius result: score=%.4f tier=%s nodes=%d", result.risk_score, result.risk_tier, len(translated['nodes']))
    return BlastRadiusResponse(**translated)



@app.post("/api/postmortem", response_model=PostMortemResponse)
def get_postmortem(req: AnalyzeRequest):

    is_valid, error, resolved_path = resolve_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        rules = mine_association_rules(
            repo_path=resolved_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostMortem engine error: {str(e)}")

    if not rules:
        return PostMortemResponse(matches=[], top_risk_files=[])

    translated = translate_postmortem(rules)
    return PostMortemResponse(**translated)

@app.post("/api/analyze/stream")
async def analyze_stream(req: AnalyzeRequest):

    is_valid, error, resolved_path = resolve_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Resolve symbols properly via git diff (runs in thread to avoid blocking)
    source_root = resolved_path
    try:
        symbols, _tables, source_root = await asyncio.to_thread(
            resolve_changed_symbols, resolved_path, req.base_branch, req.pr_branch
        )
        logger.info("Stream: resolved %d symbols (source_root=%s)", len(symbols), source_root)
    except Exception as e:
        logger.warning("Symbol resolution failed for stream: %s", e)
        symbols = []

    # Run blast radius with properly resolved symbols (using source root)
    try:
        blast_result = await asyncio.to_thread(
            analyze_blast_radius,
            repo_root=source_root,
            changed_symbols=symbols if symbols else [req.pr_branch],
            uncovered_nodes=[],
            use_rope=False,
        )
        blast_data = asdict(blast_result)
        logger.info("Stream blast result: score=%.4f tier=%s", blast_result.risk_score, blast_result.risk_tier)
    except Exception as e:
        logger.warning("Blast radius failed for stream: %s", e)
        blast_data = {"error": str(e), "risk_tier": "MEDIUM"}

    try:
        postmortem_data = await asyncio.to_thread(
            mine_association_rules,
            repo_path=resolved_path,
            min_support=0.02,
            min_confidence=0.5,
        )
    except Exception:
        postmortem_data = []

    from agents.langgraph_pipeline import run_pipeline_stream

    return StreamingResponse(
        run_pipeline_stream(blast_data, postmortem_data),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/recommendation", response_model=RecommendationResponse)
def get_recommendation(req: AnalyzeRequest):

    is_valid, error, resolved_path = resolve_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Resolve symbols properly via git diff
    source_root = resolved_path
    try:
        symbols, _tables, source_root = resolve_changed_symbols(resolved_path, req.base_branch, req.pr_branch)
        logger.info("Recommendation: resolved %d symbols (source_root=%s)", len(symbols), source_root)
    except Exception as e:
        logger.warning("Symbol resolution failed for recommendation: %s", e)
        symbols = []

    try:
        blast_result = analyze_blast_radius(
            repo_root=source_root,
            changed_symbols=symbols if symbols else [req.pr_branch],
            uncovered_nodes=[],
            use_rope=False
        )
        blast_data = asdict(blast_result)
        logger.info("Recommendation blast: score=%.4f tier=%s", blast_result.risk_score, blast_result.risk_tier)
    except Exception as e:
        blast_data = {"error": str(e), "risk_tier": "MEDIUM"}

    try:
        postmortem_data = mine_association_rules(
            repo_path=resolved_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception:
        postmortem_data = []

    from agents.langgraph_pipeline import run_pipeline
    result = run_pipeline(blast_data, postmortem_data)

    return RecommendationResponse(
        verdict=      result.verdict,
        summary=      result.summary,
        blast_risk=   result.blast_risk,
        pattern_risk= result.pattern_risk,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )