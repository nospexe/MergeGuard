"""
run_tests.py — Week 1 Test Runner for MergeGuard
=================================================
Run with: python3 run_tests.py
"""

import sys
import textwrap
import tempfile
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from engines.blast_radius import (
    ASTParser,
    RepositoryScanner,
    CallGraphTracer,
    RiskScorer,
    FileSymbolTable,
    SymbolDefinition,
    ImportedName,
    analyze_blast_radius,
    result_to_json,
)
from engines.coverage_overlay import (
    LineCoverageData,
    SymbolCoverageAnnotator,
    SymbolCoverageAnnotation,
    overlay_to_json,
)

# ─────────────────────────────────────────────
# Tiny test framework
# ─────────────────────────────────────────────

passed = []
failed = []

def test(name):
    """Decorator that registers and runs a test function."""
    def decorator(fn):
        try:
            fn()
            passed.append(name)
            print(f"  ✅  {name}")
        except Exception as e:
            failed.append((name, e))
            print(f"  ❌  {name}")
            # Show only the relevant line, not the full traceback
            tb = traceback.extract_tb(sys.exc_info()[2])
            for frame in tb:
                if "run_tests.py" in frame.filename:
                    print(f"       → line {frame.lineno}: {frame.line}")
                    print(f"       → {type(e).__name__}: {e}")
                    break
    return decorator

def write_file(directory, rel_path, content):
    full = Path(directory) / rel_path
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(textwrap.dedent(content), encoding="utf-8")
    return full


# ─────────────────────────────────────────────
# SECTION 1: AST Parser
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" AST PARSER TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("finds a top-level function")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "utils.py", """\
            def validate_token(token: str) -> bool:
                return bool(token)
        """)
        table = ASTParser().parse_file(f, "utils")
        assert len(table.definitions) == 1
        assert table.definitions[0].name == "validate_token"
        assert table.definitions[0].symbol_type == "function"


@test("finds a class")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "models.py", """\
            class User:
                pass
        """)
        table = ASTParser().parse_file(f, "models")
        classes = [d for d in table.definitions if d.symbol_type == "class"]
        assert len(classes) == 1
        assert classes[0].name == "User"


@test("finds methods inside a class")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "models.py", """\
            class User:
                def __init__(self, name):
                    self.name = name
                def greet(self):
                    return f"Hello {self.name}"
        """)
        table = ASTParser().parse_file(f, "models")
        methods = [d for d in table.definitions if d.symbol_type == "method"]
        assert len(methods) == 2


@test("method qualified name includes class name")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "models.py", """\
            class User:
                def greet(self):
                    pass
        """)
        table = ASTParser().parse_file(f, "models")
        method = next(d for d in table.definitions if d.name == "greet")
        assert method.qualified_name == "models.User.greet"


@test("finds from-import statement")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "middleware.py", """\
            from auth.utils import validate_token
            def check(req): pass
        """)
        table = ASTParser().parse_file(f, "middleware")
        assert len(table.imports) == 1
        assert table.imports[0].source_module == "auth.utils"
        assert table.imports[0].imported_name == "validate_token"


@test("finds bare import statement")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "utils.py", """\
            import os
            def get_home(): return os.getcwd()
        """)
        table = ASTParser().parse_file(f, "utils")
        os_imp = next(i for i in table.imports if i.source_module == "os")
        assert os_imp.imported_name is None


@test("captures import alias")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "views.py", """\
            from auth.utils import validate_token as vt
        """)
        table = ASTParser().parse_file(f, "views")
        assert table.imports[0].alias == "vt"
        assert table.imports[0].imported_name == "validate_token"


@test("flags dynamic imports as is_dynamic=True")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "loader.py", """\
            import importlib
            def load(name):
                return importlib.import_module(name)
        """)
        table = ASTParser().parse_file(f, "loader")
        dynamic = [i for i in table.imports if i.is_dynamic]
        assert len(dynamic) == 1


@test("finds function call expressions")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "middleware.py", """\
            from auth.utils import validate_token
            def process(req):
                return validate_token(req.token)
        """)
        table = ASTParser().parse_file(f, "middleware")
        assert "validate_token" in table.call_expressions


@test("handles file with syntax error gracefully")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "broken.py", "def (this is broken\n")
        table = ASTParser().parse_file(f, "broken")
        assert table.definitions == []
        assert table.imports == []


@test("handles async functions")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "views.py", """\
            async def get_user(user_id: int):
                pass
        """)
        table = ASTParser().parse_file(f, "views")
        assert len(table.definitions) == 1
        assert table.definitions[0].symbol_type == "function"
        assert table.definitions[0].name == "get_user"


@test("records line numbers for definitions")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        f = write_file(tmp, "utils.py", """\
            def foo():
                x = 1
                return x
        """)
        table = ASTParser().parse_file(f, "utils")
        defn = table.definitions[0]
        assert defn.line_start == 1
        assert defn.line_end >= 3


# ─────────────────────────────────────────────
# SECTION 2: Repository Scanner
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" REPOSITORY SCANNER TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("scans all python files in nested folders")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "auth/__init__.py", "")
        write_file(tmp, "auth/utils.py", "def foo(): pass")
        write_file(tmp, "api/routes.py", "def bar(): pass")
        tables = RepositoryScanner(tmp).scan()
        assert "auth.utils" in tables
        assert "api.routes" in tables


@test("skips venv directory")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "venv/requests/api.py", "def get(): pass")
        write_file(tmp, "myapp/utils.py", "def helper(): pass")
        tables = RepositoryScanner(tmp).scan()
        for key in tables:
            assert "venv" not in key
        assert "myapp.utils" in tables


@test("skips __pycache__ directory")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "__pycache__/utils.cpython-312.pyc", "garbage")
        write_file(tmp, "myapp/utils.py", "def helper(): pass")
        tables = RepositoryScanner(tmp).scan()
        for key in tables:
            assert "__pycache__" not in key


@test("__init__.py becomes the package path, not auth.__init__")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "auth/__init__.py", "")
        tables = RepositoryScanner(tmp).scan()
        assert "auth" in tables
        assert "auth.__init__" not in tables


@test("converts nested path to dotted module name")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "a/b/c.py", "x = 1")
        tables = RepositoryScanner(tmp).scan()
        assert "a.b.c" in tables


# ─────────────────────────────────────────────
# SECTION 3: Call Graph Tracer
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" CALL GRAPH TRACER TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

def make_defn_table(module_path, symbol_name):
    table = FileSymbolTable(
        file_path=f"/{module_path.replace('.', '/')}.py",
        module_path=module_path,
    )
    table.definitions.append(SymbolDefinition(
        name=symbol_name,
        qualified_name=f"{module_path}.{symbol_name}",
        symbol_type="function",
        file_path=table.file_path,
        line_start=1,
        line_end=5,
    ))
    return table

def make_import_table(module_path, imports):
    table = FileSymbolTable(
        file_path=f"/{module_path.replace('.', '/')}.py",
        module_path=module_path,
    )
    for source_mod, name in imports:
        table.imports.append(ImportedName(
            source_module=source_mod,
            imported_name=name,
            alias=name or source_mod,
        ))
    return table


@test("finds direct dependent (1 hop)")
def _():
    tables = {
        "auth.utils": make_defn_table("auth.utils", "validate_token"),
        "auth.middleware": make_import_table("auth.middleware", [("auth.utils", "validate_token")]),
    }
    tracer = CallGraphTracer(tables)
    direct, transitive, edges, warnings = tracer.trace(["auth.utils.validate_token"])
    assert "auth.middleware" in direct
    assert transitive == []


@test("finds transitive dependent (2 hops)")
def _():
    tables = {
        "auth.utils": make_defn_table("auth.utils", "validate_token"),
        "auth.middleware": make_import_table("auth.middleware", [("auth.utils", "validate_token")]),
        "api.routes": make_import_table("api.routes", [("auth.middleware", "check")]),
    }
    tracer = CallGraphTracer(tables)
    direct, transitive, edges, warnings = tracer.trace(["auth.utils.validate_token"])
    assert "auth.middleware" in direct
    assert "api.routes" in transitive


@test("no duplicate modules in results")
def _():
    tables = {
        "x": make_defn_table("x", "func"),
        "a": make_import_table("a", [("x", "func")]),
        "b": make_import_table("b", [("x", "func")]),
        "c": make_import_table("c", [("a", "something"), ("b", "something")]),
    }
    tracer = CallGraphTracer(tables)
    direct, transitive, _, _ = tracer.trace(["x.func"])
    all_found = direct + transitive
    assert len(all_found) == len(set(all_found))


@test("unknown symbol returns warning, not crash")
def _():
    tables = {"mymodule": make_defn_table("mymodule", "real_func")}
    tracer = CallGraphTracer(tables)
    direct, transitive, edges, warnings = tracer.trace(["ghost.module.nonexistent"])
    assert direct == []
    assert len(warnings) == 1


@test("edges contain depth field")
def _():
    tables = {
        "a": make_defn_table("a", "func"),
        "b": make_import_table("b", [("a", "func")]),
    }
    tracer = CallGraphTracer(tables)
    _, _, edges, _ = tracer.trace(["a.func"])
    assert all("depth" in edge for edge in edges)


@test("circular import does not cause infinite loop")
def _():
    tables = {
        "a": make_defn_table("a", "func"),
        "b": make_import_table("b", [("a", "func")]),
    }
    # Add circular: a also imports from b
    tables["a"].imports.append(ImportedName(
        source_module="b", imported_name="something", alias="something"
    ))
    tracer = CallGraphTracer(tables)
    direct, _, _, _ = tracer.trace(["a.func"], max_depth=5)
    assert isinstance(direct, list)  # just verify it returned


# ─────────────────────────────────────────────
# SECTION 4: Risk Scorer
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" RISK SCORER TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("empty blast radius scores 0.0 / LOW")
def _():
    score, tier = RiskScorer().score([], [], [], [])
    assert score == 0.0
    assert tier == "LOW"


@test("tier boundaries are correct")
def _():
    scorer = RiskScorer()
    cases = [
        (0.00, "LOW"), (0.24, "LOW"),
        (0.25, "MEDIUM"), (0.49, "MEDIUM"),
        (0.50, "HIGH"), (0.74, "HIGH"),
        (0.75, "CRITICAL"), (1.00, "CRITICAL"),
    ]
    for raw, expected in cases:
        assert scorer._tier(raw) == expected, f"score {raw} → expected {expected}"


@test("uncovered nodes increase the score")
def _():
    scorer = RiskScorer()
    modules = [f"mod.file{i}" for i in range(5)]
    edges = [{"from": m, "to": "root", "depth": 1} for m in modules]
    score_without, _ = scorer.score(modules, [], edges, [])
    score_with, _    = scorer.score(modules, [], edges, modules)
    assert score_with > score_without


@test("auth/db modules trigger core penalty")
def _():
    scorer = RiskScorer()
    edges = [{"from": "utils.helpers", "to": "root", "depth": 1}]

    score_normal, _ = scorer.score(["utils.helpers"], [], edges, [])
    score_core,   _ = scorer.score(["auth.helpers"],  [], edges, [])
    assert score_core > score_normal


@test("score never exceeds 1.0")
def _():
    scorer = RiskScorer()
    big = [f"auth.db.file{i}" for i in range(500)]
    edges = [{"from": m, "to": "root", "depth": i % 20} for i, m in enumerate(big)]
    score, _ = scorer.score(big, big, edges, big)
    assert score <= 1.0


# ─────────────────────────────────────────────
# SECTION 5: Full Pipeline
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" FULL PIPELINE TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("end-to-end: 3-file repo traces correctly")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "auth/__init__.py", "")
        write_file(tmp, "auth/utils.py", """\
            def validate_token(token: str) -> bool:
                return bool(token)
        """)
        write_file(tmp, "auth/middleware.py", """\
            from auth.utils import validate_token
            def check_request(request):
                return validate_token(request)
        """)
        write_file(tmp, "api/__init__.py", "")
        write_file(tmp, "api/routes.py", """\
            from auth.middleware import check_request
            def get_user(request):
                return check_request(request)
        """)

        result = analyze_blast_radius(tmp, ["auth.utils.validate_token"])

        assert "auth.middleware" in result.direct_dependents
        assert "api.routes" in result.transitive_dependents
        assert result.total_affected_files == 2
        assert result.risk_tier in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


@test("trivial isolated change scores LOW")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "standalone.py", """\
            def add(a: int, b: int) -> int:
                return a + b
        """)
        result = analyze_blast_radius(tmp, ["standalone.add"])
        assert result.risk_tier == "LOW"
        assert result.total_affected_files == 0


@test("result is JSON serialisable")
def _():
    import json
    from dataclasses import asdict
    with tempfile.TemporaryDirectory() as tmp:
        write_file(tmp, "simple.py", "def foo(): pass")
        result = analyze_blast_radius(tmp, ["simple.foo"])
        parsed = json.loads(result_to_json(result))
        assert "risk_tier" in parsed
        assert "direct_dependents" in parsed
        assert "analysis_time_seconds" in parsed


@test("analysis completes in under 10 seconds on small repo")
def _():
    import time
    with tempfile.TemporaryDirectory() as tmp:
        # Create 20 files
        for i in range(20):
            write_file(tmp, f"module_{i}.py", f"""\
                def func_{i}():
                    pass
            """)
        start = time.monotonic()
        analyze_blast_radius(tmp, ["module_0.func_0"])
        elapsed = time.monotonic() - start
        assert elapsed < 10.0, f"Took {elapsed:.2f}s — too slow"


# ─────────────────────────────────────────────
# SECTION 6: Coverage Overlay
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" COVERAGE OVERLAY TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

def make_cov(file_path, covered, missing):
    total = len(covered) + len(missing)
    pct = len(covered) / total * 100.0 if total else 0.0
    return LineCoverageData(file_path, covered, missing, total, round(pct, 2))

def make_sym(name, module, fpath, ls, le):
    return SymbolDefinition(name=name, qualified_name=f"{module}.{name}",
        symbol_type="function", file_path=fpath, line_start=ls, line_end=le)

def make_table(module, fpath, defs):
    t = FileSymbolTable(file_path=fpath, module_path=module)
    t.definitions = defs
    return t


@test("fully covered symbol → status: covered")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        fpath = str(Path(tmp) / "utils.py")
        defn = make_sym("foo", "utils", fpath, 1, 5)
        tables = {"utils": make_table("utils", fpath, [defn])}
        cov = make_cov(fpath, covered=[1,2,3,4,5], missing=[])
        result = SymbolCoverageAnnotator().annotate(tables, {fpath: cov}, tmp)
        assert result.annotations[0].coverage_status == "covered"
        assert result.annotations[0].coverage_percent == 100.0


@test("no lines executed → status: uncovered")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        fpath = str(Path(tmp) / "utils.py")
        defn = make_sym("dead", "utils", fpath, 1, 5)
        tables = {"utils": make_table("utils", fpath, [defn])}
        cov = make_cov(fpath, covered=[], missing=[1,2,3,4,5])
        result = SymbolCoverageAnnotator().annotate(tables, {fpath: cov}, tmp)
        assert result.annotations[0].coverage_status == "uncovered"
        assert result.annotations[0].coverage_percent == 0.0


@test("some lines executed → status: partial")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        fpath = str(Path(tmp) / "utils.py")
        defn = make_sym("mixed", "utils", fpath, 1, 4)
        tables = {"utils": make_table("utils", fpath, [defn])}
        cov = make_cov(fpath, covered=[1,2], missing=[3,4])
        result = SymbolCoverageAnnotator().annotate(tables, {fpath: cov}, tmp)
        assert result.annotations[0].coverage_status == "partial"
        assert 0 < result.annotations[0].coverage_percent < 100


@test("no coverage data at all → status: unknown")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        fpath = str(Path(tmp) / "utils.py")
        defn = make_sym("helper", "utils", fpath, 1, 3)
        tables = {"utils": make_table("utils", fpath, [defn])}
        result = SymbolCoverageAnnotator().annotate(tables, {}, tmp)
        assert result.annotations[0].coverage_status == "unknown"


@test("uncovered symbols appear in uncovered_module_paths")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        # On Mac, /var/folders is a symlink to /private/var/folders.
        # resolve() gives the real path so all comparisons match.
        tmp = str(Path(tmp).resolve())
        (Path(tmp) / "auth").mkdir()
        fpath = str((Path(tmp) / "auth" / "utils.py").resolve())
        Path(fpath).write_text("def foo(): pass\n")
        defn = make_sym("foo", "auth.utils", fpath, 1, 1)
        tables = {"auth.utils": make_table("auth.utils", fpath, [defn])}
        cov = make_cov(fpath, covered=[], missing=[1])
        result = SymbolCoverageAnnotator().annotate(tables, {fpath: cov}, tmp)
        assert "auth.utils" in result.uncovered_module_paths


@test("three symbols in one file get three annotations")
def _():
    with tempfile.TemporaryDirectory() as tmp:
        fpath = str(Path(tmp) / "utils.py")
        defs = [
            make_sym("func_a", "utils", fpath, 1, 3),
            make_sym("func_b", "utils", fpath, 5, 8),
            make_sym("func_c", "utils", fpath, 10, 12),
        ]
        tables = {"utils": make_table("utils", fpath, defs)}
        cov = make_cov(fpath, covered=[1,2,3,5,6], missing=[7,8,10,11,12])
        result = SymbolCoverageAnnotator().annotate(tables, {fpath: cov}, tmp)
        assert len(result.annotations) == 3
        statuses = {a.qualified_name: a.coverage_status for a in result.annotations}
        assert statuses["utils.func_a"] == "covered"
        assert statuses["utils.func_b"] == "partial"
        assert statuses["utils.func_c"] == "uncovered"


@test("coverage overlay result is JSON serialisable")
def _():
    import json
    with tempfile.TemporaryDirectory() as tmp:
        fpath = str(Path(tmp) / "utils.py")
        defn = make_sym("foo", "utils", fpath, 1, 3)
        tables = {"utils": make_table("utils", fpath, [defn])}
        result = SymbolCoverageAnnotator().annotate(tables, {}, tmp)
        parsed = json.loads(overlay_to_json(result))
        assert "annotations" in parsed
        assert "uncovered_module_paths" in parsed
        assert "overall_coverage_percent" in parsed


# ─────────────────────────────────────────────
# RESULTS
# ─────────────────────────────────────────────

total = len(passed) + len(failed)
print(f"\n{'━'*42}")
print(f" RESULTS: {len(passed)}/{total} passed")
print(f"{'━'*42}")

if failed:
    print(f"\n  {len(failed)} test(s) FAILED:\n")
    for name, err in failed:
        print(f"  ✗ {name}")
        print(f"    {type(err).__name__}: {err}\n")
    sys.exit(1)
else:
    print("\n  All tests passed. Week 1 is working. ✓\n")
    sys.exit(0)
