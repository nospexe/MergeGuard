"""
blast_radius.py — BlastRadius Engine for MergeGuard
=====================================================

PURPOSE
-------
Given a set of changed Python symbols (functions, classes), this module
answers: "What else in this codebase depends on the changed code?"

It does this in three stages:

  1. PARSE   — Walk every .py file in the repo and extract a symbol table:
               what is defined where, and what does each file import.

  2. RESOLVE — Build an import graph: file A imports symbol X from file B.
               This tells us who *could* be affected by a change to X in B.

  3. TRACE   — Starting from the changed symbols, do a breadth-first
               traversal of the import graph to find all direct and
               transitive dependents, then score the result.

WHAT IS AN AST?
---------------
When Python reads source code, it doesn't work with raw text. It converts
the text into a tree of objects called an Abstract Syntax Tree (AST).
Each node in the tree represents one piece of the program's structure —
a function definition, an import statement, a function call, etc.

Python's built-in `ast` module lets us parse any .py file and walk this
tree programmatically. That is how we extract "what is defined here" and
"what does this file call" without executing the code.

WHAT IS A CALL GRAPH?
---------------------
A directed graph where:
  - nodes  = symbols (functions, classes, methods)
  - edges  = "symbol A depends on symbol B" (A imports or calls B)

If you change symbol B, every node that has an edge pointing *to* B is
potentially broken. Nodes reachable by following edges transitively form
the blast radius.
"""

from __future__ import annotations

import ast
import json
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data Classes — structured objects we pass around the system
# ---------------------------------------------------------------------------

@dataclass
class SymbolDefinition:
    """
    Represents a single named symbol found in a Python file.

    A symbol can be a top-level function, a class, or a method inside
    a class. We record both the qualified name (e.g. "MyClass.my_method")
    and the exact line number so we can later cross-reference with
    coverage data.
    """
    name: str            # Simple name, e.g. "validate_token"
    qualified_name: str  # Module-qualified, e.g. "auth.utils.validate_token"
    symbol_type: str     # "function", "class", or "method"
    file_path: str       # Absolute path to the source file
    line_start: int      # Line where the definition begins
    line_end: int        # Line where the definition ends


@dataclass
class ImportedName:
    """
    Represents a single import statement resolved to a source location.

    Examples
    --------
    `from auth.utils import validate_token` becomes:
        source_module = "auth.utils"
        imported_name = "validate_token"
        alias         = "validate_token"  (or "vt" if `as vt` was used)

    `import os` becomes:
        source_module = "os"
        imported_name = None
        alias         = "os"
    """
    source_module: str            # The module being imported from
    imported_name: Optional[str]  # The specific name, or None for bare imports
    alias: str                    # How the name is used in the current file
    is_dynamic: bool = False      # True if we can't statically resolve this


@dataclass
class FileSymbolTable:
    """Everything we learned about a single Python file after parsing it."""
    file_path: str
    module_path: str                            # e.g. "auth.utils" derived from path
    definitions: list[SymbolDefinition] = field(default_factory=list)
    imports: list[ImportedName] = field(default_factory=list)
    call_expressions: list[str] = field(default_factory=list)


@dataclass
class BlastRadiusResult:
    """
    The final output of the engine, ready to be serialised to JSON and
    consumed by the API layer and the LLM reasoning agents.
    """
    changed_symbols: list[str]
    direct_dependents: list[str]
    transitive_dependents: list[str]
    uncovered_nodes: list[str]          # populated later by coverage overlay
    total_affected_files: int
    dependency_edges: list[dict]        # [{from: str, to: str, depth: int}]
    risk_score: float                   # 0.0 – 1.0
    risk_tier: str                      # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    dynamic_import_warnings: list[str]  # symbols we could not trace statically
    analysis_time_seconds: float


# ---------------------------------------------------------------------------
# Stage 1 — AST Parser
# ---------------------------------------------------------------------------

class ASTParser:
    """
    Parses a single Python source file using Python's built-in `ast` module.

    HOW IT WORKS
    ------------
    `ast.parse(source_text)` turns raw text into a tree of node objects.
    We then "walk" the tree — visiting each node — and collect:

      * FunctionDef / AsyncFunctionDef → function and method definitions
      * ClassDef                       → class definitions
      * Import / ImportFrom            → import statements
      * Call nodes                     → function calls made in this file

    WHY NOT JUST USE grep OR regex?
    --------------------------------
    Text search cannot distinguish between:
      - A function *definition* named `foo`
      - A function *call* to `foo`
      - A comment or string containing "foo"
      - A variable also named `foo`

    The AST makes this distinction exact and unambiguous.
    """

    def parse_file(self, file_path: str | Path, module_path: str) -> FileSymbolTable:
        """
        Parse a single .py file and return its complete symbol table.

        Parameters
        ----------
        file_path   : Path to the .py file.
        module_path : Dotted module path, e.g. "auth.utils" for auth/utils.py.
        """
        file_path = Path(file_path)
        table = FileSymbolTable(file_path=str(file_path), module_path=module_path)

        try:
            source = file_path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            logger.warning("Could not read %s: %s", file_path, exc)
            return table

        try:
            tree = ast.parse(source, filename=str(file_path))
        except SyntaxError as exc:
            logger.warning("Syntax error in %s: %s", file_path, exc)
            return table

        self._extract_definitions(tree, module_path, str(file_path), table)
        self._extract_imports(tree, table)
        self._extract_calls(tree, table)

        return table

    def _extract_definitions(
        self,
        tree: ast.AST,
        module_path: str,
        file_path: str,
        table: FileSymbolTable,
    ) -> None:
        """
        Walk the AST and collect every function and class definition.

        We track a class_stack so nested definitions get correct qualified
        names, e.g. "auth.utils.TokenValidator.validate" instead of just
        "auth.utils.validate".
        """

        class DefinitionVisitor(ast.NodeVisitor):
            def __init__(self_inner):
                self_inner.class_stack: list[str] = []

            def visit_ClassDef(self_inner, node: ast.ClassDef) -> None:
                qualified = f"{module_path}.{node.name}"
                table.definitions.append(SymbolDefinition(
                    name=node.name,
                    qualified_name=qualified,
                    symbol_type="class",
                    file_path=file_path,
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                ))
                self_inner.class_stack.append(node.name)
                self_inner.generic_visit(node)
                self_inner.class_stack.pop()

            def visit_FunctionDef(self_inner, node: ast.FunctionDef) -> None:
                self_inner._handle_function(node)

            def visit_AsyncFunctionDef(
                self_inner, node: ast.AsyncFunctionDef
            ) -> None:
                self_inner._handle_function(node)

            def _handle_function(
                self_inner,
                node: ast.FunctionDef | ast.AsyncFunctionDef,
            ) -> None:
                parts = [module_path] + self_inner.class_stack + [node.name]
                qualified = ".".join(parts)
                sym_type = "method" if self_inner.class_stack else "function"
                table.definitions.append(SymbolDefinition(
                    name=node.name,
                    qualified_name=qualified,
                    symbol_type=sym_type,
                    file_path=file_path,
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                ))
                # Recurse to catch nested functions
                self_inner.generic_visit(node)

        DefinitionVisitor().visit(tree)

    def _extract_imports(self, tree: ast.AST, table: FileSymbolTable) -> None:
        """
        Walk the AST and collect every import statement.

        Two kinds exist:
          * `import foo.bar`           → ast.Import
          * `from foo.bar import baz`  → ast.ImportFrom

        Dynamic imports (importlib.import_module) cannot be resolved
        statically; we flag them with is_dynamic=True.
        """
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    table.imports.append(ImportedName(
                        source_module=alias.name,
                        imported_name=None,
                        alias=alias.asname or alias.name,
                    ))

            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                level = node.level  # leading dots for relative imports

                if level > 0:
                    # Relative import — resolve against current module path
                    parts = table.module_path.split(".")
                    base = ".".join(parts[: max(len(parts) - level, 0)])
                    resolved = f"{base}.{module}".strip(".")
                else:
                    resolved = module

                for alias in node.names:
                    table.imports.append(ImportedName(
                        source_module=resolved,
                        imported_name=alias.name,
                        alias=alias.asname or alias.name,
                    ))

            elif isinstance(node, ast.Call):
                # Detect: importlib.import_module("something")
                func = node.func
                if (
                    isinstance(func, ast.Attribute)
                    and func.attr == "import_module"
                ):
                    table.imports.append(ImportedName(
                        source_module="<dynamic>",
                        imported_name=None,
                        alias="<dynamic>",
                        is_dynamic=True,
                    ))

    def _extract_calls(self, tree: ast.AST, table: FileSymbolTable) -> None:
        """
        Walk the AST and collect every function call site.

        We collect call names as strings, e.g.:
          foo()        → "foo"
          obj.method() → "obj.method"
        """
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                callee = self._unpack_call_name(node.func)
                if callee:
                    table.call_expressions.append(callee)

    @staticmethod
    def _unpack_call_name(node: ast.expr) -> Optional[str]:
        """Recursively extract a dotted name string from a Call's func node."""
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            parent = ASTParser._unpack_call_name(node.value)
            return f"{parent}.{node.attr}" if parent else node.attr
        return None  # e.g. computed call like funcs[0]()


# ---------------------------------------------------------------------------
# Stage 2 — Repository Scanner
# ---------------------------------------------------------------------------

class RepositoryScanner:
    """
    Walks an entire repository, parses every .py file, and returns a
    unified map of module_path → FileSymbolTable.

    WHY WE SCAN EVERYTHING
    ----------------------
    We don't know in advance which files import the changed symbol. We
    need the full picture to correctly trace transitive dependencies.
    For a 50k-LOC repo, pure AST parsing (no execution) is fast enough
    to finish well within our 90-second budget.
    """

    SKIP_DIRS = frozenset({
        ".git", "__pycache__", "venv", ".venv", "env",
        "node_modules", ".tox", "dist", "build",
    })

    def __init__(self, repo_root: str | Path) -> None:
        self.repo_root = Path(repo_root).resolve()
        self._parser = ASTParser()

    def scan(self) -> dict[str, FileSymbolTable]:
        """
        Parse every .py file under repo_root (skipping build/env dirs).

        Returns
        -------
        dict mapping module_path (e.g. "auth.utils") to FileSymbolTable.
        """
        symbol_tables: dict[str, FileSymbolTable] = {}

        for py_file in self.repo_root.rglob("*.py"):
            if any(part in self.SKIP_DIRS for part in py_file.parts):
                continue
            module_path = self._file_to_module_path(py_file)
            symbol_tables[module_path] = self._parser.parse_file(py_file, module_path)

        logger.info(
            "Scanned %d Python files under %s",
            len(symbol_tables),
            self.repo_root,
        )
        return symbol_tables

    def _file_to_module_path(self, file_path: Path) -> str:
        """
        Convert a filesystem path to a Python dotted module path.

        /projects/myapp/auth/utils.py  →  "auth.utils"
        /projects/myapp/auth/__init__.py  →  "auth"
        """
        relative = file_path.relative_to(self.repo_root)
        parts = list(relative.parts)

        if parts[-1] == "__init__.py":
            parts = parts[:-1]
        else:
            parts[-1] = parts[-1][:-3]  # strip ".py"

        return ".".join(parts) if parts else "<root>"


# ---------------------------------------------------------------------------
# Stage 3 — Call Graph Tracer (BFS over import graph)
# ---------------------------------------------------------------------------

class CallGraphTracer:
    """
    Given the full symbol tables, traces transitive dependents of
    changed symbols using Breadth-First Search on the import graph.

    HOW BFS WORKS HERE
    ------------------
    Imagine the changed symbol is the centre of a pond.
    Dropping a stone creates ripples outward:

      Depth 0 → the changed module itself
      Depth 1 → modules that directly import it      (direct dependents)
      Depth 2 → modules that import *those* modules  (transitive)
      Depth N → continues until no new modules found

    BFS processes nodes level by level using a queue (deque). We mark
    each visited module so we never process the same one twice, which
    also prevents infinite loops from circular imports.

    PERFORMANCE
    -----------
    We pre-build a reverse import index so each BFS step is O(1)
    instead of O(total files). Without it, each step would scan all
    files — O(files²) total. With it, the full traversal is O(edges).
    """

    def __init__(self, symbol_tables: dict[str, FileSymbolTable]) -> None:
        self._tables = symbol_tables
        self._import_index = self._build_import_index()

    def _build_import_index(self) -> dict[str, list[str]]:
        """
        Build a reverse map: module_path → [list of modules that import it].

        Example
        -------
        If auth/middleware.py contains `from auth.utils import validate_token`,
        then import_index["auth.utils"] will contain "auth.middleware".
        """
        index: dict[str, list[str]] = defaultdict(list)
        for module_path, table in self._tables.items():
            for imp in table.imports:
                if not imp.is_dynamic:
                    index[imp.source_module].append(module_path)
        return dict(index)

    def trace(
        self,
        changed_symbols: list[str],
        max_depth: int = 10,
    ) -> tuple[list[str], list[str], list[dict], list[str]]:
        """
        BFS from the changed symbols through the import graph.

        Parameters
        ----------
        changed_symbols : Qualified symbol names, e.g. ["auth.utils.validate_token"].
        max_depth       : Safety cap against pathological deep chains.

        Returns
        -------
        (direct_dependents, transitive_dependents, edges, dynamic_warnings)
        """
        changed_modules: set[str] = set()
        dynamic_warnings: list[str] = []

        for sym in changed_symbols:
            defining_module = self._find_defining_module(sym)
            if defining_module:
                changed_modules.add(defining_module)
            else:
                dynamic_warnings.append(sym)
                logger.warning("Could not locate defining module for symbol: %s", sym)

        if not changed_modules:
            return [], [], [], dynamic_warnings

        visited: set[str] = set(changed_modules)
        frontier: deque[tuple[str, int]] = deque((m, 0) for m in changed_modules)
        direct: list[str] = []
        transitive: list[str] = []
        edges: list[dict] = []

        while frontier:
            current_module, depth = frontier.popleft()

            if depth >= max_depth:
                continue

            for dep in self._import_index.get(current_module, []):
                edges.append({"from": dep, "to": current_module, "depth": depth + 1})

                if dep not in visited:
                    visited.add(dep)
                    (direct if depth == 0 else transitive).append(dep)
                    frontier.append((dep, depth + 1))

        return direct, transitive, edges, dynamic_warnings

    def _find_defining_module(self, qualified_name: str) -> Optional[str]:
        """
        Given "auth.utils.validate_token", find the module "auth.utils"
        that actually defines the symbol.

        Strategy: try progressively shorter prefixes until we find a
        module in our symbol tables that defines a matching name.
        """
        parts = qualified_name.split(".")
        for i in range(len(parts), 0, -1):
            candidate = ".".join(parts[:i])
            if candidate in self._tables:
                suffix = parts[i:]
                if not suffix:
                    return candidate
                symbol_name = parts[-1]
                for defn in self._tables[candidate].definitions:
                    if defn.name == symbol_name:
                        return candidate
        return None


# ---------------------------------------------------------------------------
# Stage 4 — Risk Scorer
# ---------------------------------------------------------------------------

class RiskScorer:
    """
    Produces a deterministic 0.0–1.0 risk score from blast radius data.

    SCORING FORMULA
    ---------------
    score = (breadth_score  * 0.30)
          + (depth_score    * 0.25)
          + (coverage_gap   * 0.35)   ← highest weight: untested = dangerous
          + (core_penalty   * 0.10)

    Each component is normalised to [0.0, 1.0].

    TIER THRESHOLDS
    ---------------
    0.00 – 0.24 → LOW
    0.25 – 0.49 → MEDIUM
    0.50 – 0.74 → HIGH
    0.75 – 1.00 → CRITICAL
    """

    CORE_PATH_SEGMENTS = frozenset({"auth", "db", "api", "middleware", "security", "core"})
    BREADTH_SATURATION = 50   # 50+ affected files = maximum breadth score
    DEPTH_SATURATION = 8      # 8+ hops = maximum depth score

    def score(
        self,
        direct: list[str],
        transitive: list[str],
        edges: list[dict],
        uncovered_nodes: list[str],
    ) -> tuple[float, str]:
        """
        Compute score and tier from blast radius components.

        Returns
        -------
        (score ∈ [0.0, 1.0], tier ∈ {"LOW", "MEDIUM", "HIGH", "CRITICAL"})
        """
        all_affected = set(direct + transitive)
        total = len(all_affected)

        breadth_score = min(total / self.BREADTH_SATURATION, 1.0)
        max_depth = max((e["depth"] for e in edges), default=0)
        depth_score = min(max_depth / self.DEPTH_SATURATION, 1.0)
        coverage_gap = len(uncovered_nodes) / total if total > 0 else 0.0
        core_penalty = 1.0 if any(
            seg in mod for mod in all_affected for seg in self.CORE_PATH_SEGMENTS
        ) else 0.0

        raw = (
            breadth_score * 0.30
            + depth_score * 0.25
            + coverage_gap * 0.35
            + core_penalty * 0.10
        )

        score = round(min(raw, 1.0), 4)
        return score, self._tier(score)

    @staticmethod
    def _tier(score: float) -> str:
        """Convert a 0.0–1.0 score into a human-readable risk tier."""
        if score < 0.25:
            return "LOW"
        if score < 0.50:
            return "MEDIUM"
        if score < 0.75:
            return "HIGH"
        return "CRITICAL"


# ---------------------------------------------------------------------------
# Public API — single entry point for external callers
# ---------------------------------------------------------------------------

def analyze_blast_radius(
    repo_root: str | Path,
    changed_symbols: list[str],
    uncovered_nodes: Optional[list[str]] = None,
) -> BlastRadiusResult:
    """
    Run the full BlastRadius pipeline for a set of changed symbols.

    This is what the FastAPI backend calls. It orchestrates all stages
    (scan → trace → score) and returns one structured result object.

    Parameters
    ----------
    repo_root        : Root of the local Git repository clone.
    changed_symbols  : Qualified names of the changed symbols,
                       e.g. ["auth.utils.validate_token"].
    uncovered_nodes  : Optional list of uncovered module paths from
                       the CoverageOverlay engine.

    Returns
    -------
    BlastRadiusResult — serialisable via dataclasses.asdict().

    Example
    -------
    >>> result = analyze_blast_radius(
    ...     repo_root="/path/to/myproject",
    ...     changed_symbols=["auth.utils.validate_token"],
    ... )
    >>> print(result.risk_tier)
    'HIGH'
    """
    start = time.monotonic()
    uncovered_nodes = uncovered_nodes or []

    scanner = RepositoryScanner(repo_root)
    symbol_tables = scanner.scan()

    tracer = CallGraphTracer(symbol_tables)
    direct, transitive, edges, dynamic_warnings = tracer.trace(changed_symbols)

    scorer = RiskScorer()
    risk_score, risk_tier = scorer.score(direct, transitive, edges, uncovered_nodes)

    return BlastRadiusResult(
        changed_symbols=changed_symbols,
        direct_dependents=sorted(direct),
        transitive_dependents=sorted(transitive),
        uncovered_nodes=uncovered_nodes,
        total_affected_files=len(set(direct + transitive)),
        dependency_edges=edges,
        risk_score=risk_score,
        risk_tier=risk_tier,
        dynamic_import_warnings=dynamic_warnings,
        analysis_time_seconds=round(time.monotonic() - start, 3),
    )


def result_to_json(result: BlastRadiusResult) -> str:
    """Serialise a BlastRadiusResult to a pretty-printed JSON string."""
    return json.dumps(asdict(result), indent=2)