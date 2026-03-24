import asyncio
import json
import os
from dataclasses import asdict
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from collections import Counter

from engines.blast_radius import analyze_blast_radius, RepositoryScanner
from engines.post_mortem import mine_association_rules
from engines.coverage_overlay import build_coverage_overlay
from utils.path_validator import validate_repo_path

load_dotenv()
OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder")


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
    version="0.1.0",
    description="Pre-merge intelligence for engineering teams."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_methods=["*"],                      
    allow_headers=["*"],                     
)


class AnalyzeRequest(BaseModel):
    repo_path: str        
    base_branch: str = "main"  
    pr_branch: str        


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
        "version": "0.1.0"
    }

def resolve_changed_symbols(repo_path: str, base: str, pr: str) -> list[str]:
    """Helper to find symbols affected by changes between base and pr branches."""
    # Special handle for demo scenarios
    if "high_risk" in pr:
        return ["engines.post_mortem.mine_commits", "api.main.get_blast_radius"]
    if "medium_risk" in pr:
        return ["utils.path_validator.validate_repo_path"]
    if "low_risk" in pr:
        return ["api.main.health_check"]

    try:
        from git import Repo
        repo = Repo(repo_path)
        # Get list of changed Python files between base and pr
        diff = repo.git.diff(f"{base}...{pr}", "--name-only", "*.py")
        files = diff.splitlines()
        if not files: return [pr] # Fallback
        
        # Simplified: all symbols in changed files are considered "changed"
        # for the purpose of a high-level blast radius report.
        from engines.blast_radius import RepositoryScanner
        scanner = RepositoryScanner(repo_path)
        tables = scanner.scan()
        
        affected_symbols = []
        for f in files:
            # Map file path back to dotted module path
            f_path = Path(repo_path) / f
            # Using repository scanner's logic for consistency
            mod_path = scanner._file_to_module_path(f_path)
            if mod_path in tables:
                affected_symbols.extend([d.qualified_name for d in tables[mod_path].definitions])
        
        return affected_symbols if affected_symbols else [pr]
    except Exception as e:
        print(f"Symbol resolution error: {e}")
        return [pr]

@app.post("/api/blast-radius", response_model=BlastRadiusResponse)
def get_blast_radius(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        # 1. Resolve symbols
        scanner = RepositoryScanner(req.repo_path)
        tables = scanner.scan()
        symbols = resolve_changed_symbols(req.repo_path, req.base_branch, req.pr_branch)

        # 2. Get Coverage Overlay
        uncovered_nodes = []
        overall_coverage = 0.0
        coverage_annotations = []
        coverage_path = Path(req.repo_path) / ".coverage"
        
        if coverage_path.exists():
            try:
                cvm = build_coverage_overlay(coverage_path, tables, req.repo_path)
                uncovered_nodes = cvm.uncovered_module_paths
                overall_coverage = cvm.overall_coverage_percent
                coverage_annotations = cvm.annotations
            except Exception as e:
                print(f"Coverage overlay error: {e}")

        # 3. Analyze Blast Radius with Coverage Data
        result = analyze_blast_radius(
            repo_root=req.repo_path,
            changed_symbols=symbols, 
            uncovered_nodes=uncovered_nodes,
            use_rope=False
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BlastRadius engine error: {str(e)}")
    
    translated = translate_blast_radius(result, tables, coverage_annotations)
    translated["overall_coverage"] = overall_coverage
    return BlastRadiusResponse(**translated)



@app.post("/api/postmortem", response_model=PostMortemResponse)
def get_postmortem(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        rules = mine_association_rules(
            repo_path=req.repo_path,
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

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        blast_result = analyze_blast_radius(
            repo_root=req.repo_path,
            changed_symbols=[req.pr_branch],
            uncovered_nodes=[],
            use_rope=False
        )
        blast_data = asdict(blast_result)
    except Exception as e:
        blast_data = {"error": str(e)}

    try:
        postmortem_data = mine_association_rules(
            repo_path=req.repo_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception as e:
        postmortem_data = {"error": str(e)}


    prompt = f"""You are a senior engineering lead reviewing a pull request.

BLAST RADIUS ANALYSIS:
{json.dumps(blast_data, indent=2)}

HISTORICAL PATTERN ANALYSIS:
{json.dumps(postmortem_data, indent=2)}

Based on the above data:
1. Summarise the structural risk from the blast radius in 2 sentences.
2. Summarise the historical pattern risk in 2 sentences.
3. Give a final verdict: exactly one of GREEN, YELLOW, or RED.
   GREEN = safe to merge. YELLOW = review recommended. RED = do not merge.
4. State one concrete action the developer must take.

Do not invent file names or commit hashes not present in the data above.
Keep your total response under 120 words."""

    async def token_generator():
        try:
            import ollama
            client = ollama.AsyncClient(host=OLLAMA_HOST)
            async for chunk in await client.chat(
                model=OLLAMA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            ):
                token = chunk["message"]["content"]
                if token:
                    yield f"data: {token}\n\n"

        except Exception as e:
            yield f"data: [ERROR] LLM unavailable: {str(e)}\n\n"

        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/recommendation", response_model=RecommendationResponse)
def get_recommendation(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        blast_result = analyze_blast_radius(
            repo_root=req.repo_path,
            changed_symbols=[req.pr_branch],
            uncovered_nodes=[],
            use_rope=False
        )
        blast_data = asdict(blast_result)
    except Exception as e:
        blast_data = {"error": str(e)}

    try:
        postmortem_data = mine_association_rules(
            repo_path=req.repo_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception as e:
        postmortem_data = {"error": str(e)}

    prompt = f"""You are a senior engineering lead making a merge decision.

BLAST RADIUS DATA:
{json.dumps(blast_data, indent=2)}

HISTORICAL PATTERN DATA:
{json.dumps(postmortem_data, indent=2)}

Respond in this exact format and nothing else:
VERDICT: <GREEN|YELLOW|RED>
SUMMARY: <one paragraph, max 60 words>
BLAST_RISK: <one sentence about structural risk>
PATTERN_RISK: <one sentence about historical pattern risk>

Do not add any text outside this format."""

    try:
        import ollama
        client = ollama.Client(host=OLLAMA_HOST)
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response["message"]["content"]

        lines = {
            line.split(":")[0].strip(): ":".join(line.split(":")[1:]).strip()
            for line in raw.strip().splitlines()
            if ":" in line
        }

        return RecommendationResponse(
            verdict=lines.get("VERDICT", "YELLOW"),
            summary=lines.get("SUMMARY", raw),
            blast_risk=lines.get("BLAST_RISK", "Unable to parse blast risk."),
            pattern_risk=lines.get("PATTERN_RISK", "Unable to parse pattern risk.")
        )

    except Exception as e:
        return RecommendationResponse(
            verdict="YELLOW",
            summary=f"LLM unavailable: {str(e)}. Manual review recommended.",
            blast_risk="Could not compute blast risk.",
            pattern_risk="Could not compute pattern risk."
        )




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )