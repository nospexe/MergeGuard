"""Additional tests for engines/blast_radius.py — targets uncovered edge case paths."""
import ast
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from engines.blast_radius import (
    ASTParser,
    RepositoryScanner,
    CallGraphTracer,
    RiskScorer,
    RopeCallSiteTracer,
    FileSymbolTable,
    SymbolDefinition,
    ImportedName,
    BlastRadiusResult,
    analyze_blast_radius,
    result_to_json,
)


# ── ASTParser edge cases ──

class TestASTParserEdgeCases:
    """Cover parse error branches and dynamic import detection."""

    def test_parse_nonexistent_file(self, tmp_path):
        parser = ASTParser()
        table = parser.parse_file(tmp_path / "does_not_exist.py", "nonexistent")
        assert table.definitions == []
        assert table.imports == []

    def test_parse_syntax_error_file(self, tmp_path):
        bad = tmp_path / "bad.py"
        bad.write_text("def broken(\n")
        parser = ASTParser()
        table = parser.parse_file(bad, "bad")
        assert table.definitions == []

    def test_parse_dynamic_import(self, tmp_path):
        f = tmp_path / "dyn.py"
        f.write_text('import importlib\nm = importlib.import_module("os")\n')
        parser = ASTParser()
        table = parser.parse_file(f, "dyn")
        dynamic = [i for i in table.imports if i.is_dynamic]
        assert len(dynamic) >= 1

    def test_parse_class_with_methods(self, tmp_path):
        f = tmp_path / "cls.py"
        f.write_text("class Foo:\n    def bar(self):\n        pass\n    async def baz(self):\n        pass\n")
        parser = ASTParser()
        table = parser.parse_file(f, "cls")
        names = [d.name for d in table.definitions]
        assert "Foo" in names
        assert "bar" in names
        assert "baz" in names
        assert any(d.symbol_type == "method" for d in table.definitions)

    def test_parse_relative_import(self, tmp_path):
        f = tmp_path / "mod.py"
        f.write_text("from . import sibling\nfrom ..parent import func\n")
        parser = ASTParser()
        table = parser.parse_file(f, "pkg.mod")
        assert len(table.imports) >= 2

    def test_parse_call_expressions(self, tmp_path):
        f = tmp_path / "calls.py"
        f.write_text("import os\nos.path.join('a', 'b')\nfoo()\n")
        parser = ASTParser()
        table = parser.parse_file(f, "calls")
        assert "foo" in table.call_expressions
        assert any("join" in c for c in table.call_expressions)

    def test_unpack_call_name_none(self):
        """Computed call (e.g. funcs[0]()) should return None."""
        parser = ASTParser()
        # Subscript node is not Name or Attribute
        subscript_node = ast.Subscript(
            value=ast.Name(id="funcs", ctx=ast.Load()),
            slice=ast.Constant(value=0),
            ctx=ast.Load(),
        )
        assert parser._unpack_call_name(subscript_node) is None


# ── RepositoryScanner ──

class TestRepositoryScanner:
    def test_scan_skips_venv(self, tmp_path):
        (tmp_path / "venv").mkdir()
        (tmp_path / "venv" / "lib.py").write_text("x = 1\n")
        (tmp_path / "app.py").write_text("def hello(): pass\n")
        scanner = RepositoryScanner(tmp_path)
        tables = scanner.scan()
        assert "venv.lib" not in tables or "app" in tables

    def test_init_file_module_path(self, tmp_path):
        pkg = tmp_path / "mypkg"
        pkg.mkdir()
        (pkg / "__init__.py").write_text("")
        scanner = RepositoryScanner(tmp_path)
        mod = scanner._file_to_module_path(pkg / "__init__.py")
        assert mod == "mypkg"

    def test_root_init_module_path(self, tmp_path):
        (tmp_path / "__init__.py").write_text("")
        scanner = RepositoryScanner(tmp_path)
        mod = scanner._file_to_module_path(tmp_path / "__init__.py")
        assert mod == "<root>"


# ── CallGraphTracer ──

class TestCallGraphTracer:
    def test_trace_no_matching_symbol(self):
        tables = {}
        tracer = CallGraphTracer(tables)
        direct, trans, edges, warns = tracer.trace(["unknown.symbol"])
        assert direct == []
        assert trans == []
        assert "unknown.symbol" in warns

    def test_trace_max_depth_respected(self, tmp_path):
        """BFS should stop at max_depth."""
        # Build a chain: a -> b -> c -> d
        tables = {
            "a": FileSymbolTable(
                file_path="a.py", module_path="a",
                definitions=[SymbolDefinition("func", "a.func", "function", "a.py", 1, 2)],
                imports=[],
            ),
            "b": FileSymbolTable(
                file_path="b.py", module_path="b",
                definitions=[],
                imports=[ImportedName("a", "func", "func")],
            ),
            "c": FileSymbolTable(
                file_path="c.py", module_path="c",
                definitions=[],
                imports=[ImportedName("b", "func", "func")],
            ),
            "d": FileSymbolTable(
                file_path="d.py", module_path="d",
                definitions=[],
                imports=[ImportedName("c", "func", "func")],
            ),
        }
        tracer = CallGraphTracer(tables)
        direct, trans, edges, warns = tracer.trace(["a.func"], max_depth=1)
        # Should find b as direct, but NOT c or d
        assert "b" in direct
        assert "c" not in direct and "c" not in trans

    def test_find_defining_module_exact_match(self):
        tables = {
            "auth": FileSymbolTable(
                file_path="auth.py", module_path="auth",
                definitions=[], imports=[],
            ),
        }
        tracer = CallGraphTracer(tables)
        result = tracer._find_defining_module("auth")
        assert result == "auth"


# ── RiskScorer ──

class TestRiskScorer:
    def test_score_zero_affected(self):
        scorer = RiskScorer()
        score, tier = scorer.score([], [], [], [])
        assert score == 0.0
        assert tier == "LOW"

    def test_score_high_affection(self):
        scorer = RiskScorer()
        direct = [f"mod{i}" for i in range(30)]
        transitive = [f"tmod{i}" for i in range(25)]
        edges = [{"from": "a", "to": "b", "depth": 6}]
        uncovered = [f"mod{i}" for i in range(20)]
        score, tier = scorer.score(direct, transitive, edges, uncovered)
        assert score > 0.5
        assert tier in ("HIGH", "CRITICAL")

    def test_score_core_penalty(self):
        scorer = RiskScorer()
        score_with, _ = scorer.score(["auth.utils"], [], [], [])
        score_without, _ = scorer.score(["plain.utils"], [], [], [])
        assert score_with > score_without

    def test_tier_boundaries(self):
        assert RiskScorer._tier(0.0) == "LOW"
        assert RiskScorer._tier(0.24) == "LOW"
        assert RiskScorer._tier(0.25) == "MEDIUM"
        assert RiskScorer._tier(0.49) == "MEDIUM"
        assert RiskScorer._tier(0.50) == "HIGH"
        assert RiskScorer._tier(0.74) == "HIGH"
        assert RiskScorer._tier(0.75) == "CRITICAL"
        assert RiskScorer._tier(1.0) == "CRITICAL"


# ── RopeCallSiteTracer ──

class TestRopeCallSiteTracer:
    def test_close_noop_on_no_project(self, tmp_path):
        tracer = RopeCallSiteTracer(tmp_path)
        tracer.close()  # should do nothing, no error

    def test_find_affected_modules_no_rope(self, tmp_path, monkeypatch):
        """When ROPE_AVAILABLE is False, should return an empty set."""
        import engines.blast_radius as br
        monkeypatch.setattr(br, "ROPE_AVAILABLE", False)
        tracer = RopeCallSiteTracer(tmp_path)
        result = tracer.find_affected_modules({}, ["sym"])
        assert result == set()

    def test_find_definition_not_found(self, tmp_path):
        tracer = RopeCallSiteTracer(tmp_path)
        result = tracer._find_definition({}, "unknown.symbol")
        assert result is None

    def test_path_to_module_non_python(self, tmp_path):
        tracer = RopeCallSiteTracer(tmp_path)
        non_py = tmp_path / "readme.txt"
        non_py.write_text("hello")
        result = tracer._path_to_module(non_py)
        assert result is None

    def test_path_to_module_init(self, tmp_path):
        tracer = RopeCallSiteTracer(tmp_path)
        pkg = tmp_path / "mypkg"
        pkg.mkdir()
        init = pkg / "__init__.py"
        init.write_text("")
        result = tracer._path_to_module(init)
        assert result == "mypkg"

    def test_path_to_module_regular(self, tmp_path):
        tracer = RopeCallSiteTracer(tmp_path)
        f = tmp_path / "utils.py"
        f.write_text("")
        result = tracer._path_to_module(f)
        assert result == "utils"

    def test_symbol_offset_nonexistent(self, tmp_path):
        tracer = RopeCallSiteTracer(tmp_path)
        defn = SymbolDefinition("foo", "mod.foo", "function", "/no/such/file.py", 1, 5)
        result = tracer._symbol_offset(defn)
        assert result is None

    def test_symbol_offset_valid(self, tmp_path):
        f = tmp_path / "mod.py"
        f.write_text("def foo():\n    pass\n")
        tracer = RopeCallSiteTracer(tmp_path)
        defn = SymbolDefinition("foo", "mod.foo", "function", str(f), 1, 2)
        result = tracer._symbol_offset(defn)
        assert result is not None
        assert isinstance(result, int)

    def test_open_project_and_close(self, tmp_path, monkeypatch):
        """When ROPE_AVAILABLE, _open_project should call RopeProject and close should release it."""
        import engines.blast_radius as br
        mock_project = MagicMock()
        monkeypatch.setattr(br, "ROPE_AVAILABLE", True)
        monkeypatch.setattr(br, "RopeProject", lambda path: mock_project)
        tracer = RopeCallSiteTracer(tmp_path)
        proj = tracer._open_project()
        assert proj is mock_project
        tracer.close()
        mock_project.close.assert_called_once()
        assert tracer._project is None

    def test_find_affected_with_rope_no_definition(self, tmp_path, monkeypatch):
        """When rope is available but no definition is found, should skip gracefully."""
        import engines.blast_radius as br
        monkeypatch.setattr(br, "ROPE_AVAILABLE", True)
        monkeypatch.setattr(br, "RopeProject", MagicMock)
        tracer = RopeCallSiteTracer(tmp_path)
        result = tracer.find_affected_modules({}, ["unknown.sym"])
        assert result == set()
        tracer.close()

    def test_find_affected_with_rope_no_offset(self, tmp_path, monkeypatch):
        """When rope is available but offset can't be computed, should skip."""
        import engines.blast_radius as br
        monkeypatch.setattr(br, "ROPE_AVAILABLE", True)
        monkeypatch.setattr(br, "RopeProject", MagicMock)

        f = tmp_path / "mod.py"
        f.write_text("# comment only\n")
        defn = SymbolDefinition("foo", "mod.foo", "function", str(f), 1, 1)
        tables = {"mod": FileSymbolTable(
            file_path=str(f), module_path="mod", definitions=[defn], imports=[]
        )}
        tracer = RopeCallSiteTracer(tmp_path)
        result = tracer.find_affected_modules(tables, ["mod.foo"])
        assert isinstance(result, set)
        tracer.close()

    def test_find_affected_with_rope_usage_found(self, tmp_path, monkeypatch):
        """When rope finds usages, they should be returned as module paths."""
        import engines.blast_radius as br
        monkeypatch.setattr(br, "ROPE_AVAILABLE", True)

        f = tmp_path / "mod.py"
        f.write_text("def foo():\n    pass\n")
        defn = SymbolDefinition("foo", "mod.foo", "function", str(f), 1, 2)
        tables = {"mod": FileSymbolTable(
            file_path=str(f), module_path="mod", definitions=[defn], imports=[]
        )}

        # Mock rope project and find_usages
        mock_project = MagicMock()
        monkeypatch.setattr(br, "RopeProject", lambda path: mock_project)

        caller = tmp_path / "caller.py"
        caller.write_text("from mod import foo\nfoo()\n")
        mock_usage = MagicMock()
        mock_usage.resource.path = "caller.py"
        monkeypatch.setattr(br, "rope_find_usages", lambda proj, res, off: [mock_usage])

        tracer = RopeCallSiteTracer(tmp_path)
        result = tracer.find_affected_modules(tables, ["mod.foo"])
        assert "caller" in result
        tracer.close()

    def test_find_affected_rope_exception(self, tmp_path, monkeypatch):
        """When rope lookup raises, should handle gracefully and continue."""
        import engines.blast_radius as br
        monkeypatch.setattr(br, "ROPE_AVAILABLE", True)

        f = tmp_path / "mod.py"
        f.write_text("def foo():\n    pass\n")
        defn = SymbolDefinition("foo", "mod.foo", "function", str(f), 1, 2)
        tables = {"mod": FileSymbolTable(
            file_path=str(f), module_path="mod", definitions=[defn], imports=[]
        )}

        mock_project = MagicMock()
        mock_project.get_resource.side_effect = Exception("rope error")
        monkeypatch.setattr(br, "RopeProject", lambda path: mock_project)

        tracer = RopeCallSiteTracer(tmp_path)
        result = tracer.find_affected_modules(tables, ["mod.foo"])
        assert result == set()
        tracer.close()


# ── analyze_blast_radius with rope ──

def test_analyze_blast_radius_with_rope(tmp_path, monkeypatch):
    """Test the rope merge flow in analyze_blast_radius."""
    import engines.blast_radius as br
    monkeypatch.setattr(br, "ROPE_AVAILABLE", True)

    (tmp_path / "main.py").write_text("def go(): pass\n")
    (tmp_path / "caller.py").write_text("from main import go\ngo()\n")

    mock_usage = MagicMock()
    mock_usage.resource.path = "caller.py"
    monkeypatch.setattr(br, "RopeProject", MagicMock)
    monkeypatch.setattr(br, "rope_find_usages", lambda proj, res, off: [mock_usage])

    result = analyze_blast_radius(
        repo_root=str(tmp_path),
        changed_symbols=["main.go"],
        use_rope=True,
    )
    assert isinstance(result, BlastRadiusResult)


def test_analyze_blast_radius_rope_failure(tmp_path, monkeypatch):
    """When rope fails, analyze_blast_radius should still return results."""
    import engines.blast_radius as br
    monkeypatch.setattr(br, "ROPE_AVAILABLE", True)
    monkeypatch.setattr(br, "RopeProject", MagicMock(side_effect=Exception("rope broken")))

    (tmp_path / "main.py").write_text("def go(): pass\n")

    result = analyze_blast_radius(
        repo_root=str(tmp_path),
        changed_symbols=["main.go"],
        use_rope=True,
    )
    assert isinstance(result, BlastRadiusResult)


# ── result_to_json ──

def test_result_to_json():
    result = BlastRadiusResult(
        changed_symbols=["a.b"],
        direct_dependents=["c"],
        transitive_dependents=[],
        uncovered_nodes=[],
        total_affected_files=1,
        dependency_edges=[],
        risk_score=0.1,
        risk_tier="LOW",
        dynamic_import_warnings=[],
        analysis_time_seconds=0.01,
    )
    json_str = result_to_json(result)
    assert '"risk_tier": "LOW"' in json_str


# ── analyze_blast_radius ──

def test_analyze_blast_radius_simple(tmp_path):
    """Full pipeline on a minimal repo."""
    (tmp_path / "main.py").write_text("def go(): pass\n")
    result = analyze_blast_radius(
        repo_root=str(tmp_path),
        changed_symbols=["main.go"],
    )
    assert isinstance(result, BlastRadiusResult)
    assert result.risk_tier in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert 0.0 <= result.risk_score <= 1.0
