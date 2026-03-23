"""
test_blast_radius.py — Unit Tests for the BlastRadius Engine
=============================================================
"""

import textwrap
from pathlib import Path

import pytest

from engines.blast_radius import (
    ASTParser,
    BlastRadiusResult,
    CallGraphTracer,
    FileSymbolTable,
    RepositoryScanner,
    RiskScorer,
    SymbolDefinition,
    analyze_blast_radius,
)


def write_file(directory: Path, rel_path: str, content: str) -> Path:
    full = directory / rel_path
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(textwrap.dedent(content), encoding="utf-8")
    return full


class TestASTParser:

    def test_extracts_top_level_function(self, tmp_path):
        f = write_file(tmp_path, "utils.py", """\
            def validate_token(token: str) -> bool:
                return len(token) > 0
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="utils")
        assert len(table.definitions) == 1
        defn = table.definitions[0]
        assert defn.name == "validate_token"
        assert defn.qualified_name == "utils.validate_token"
        assert defn.symbol_type == "function"
        assert defn.line_start == 1

    def test_extracts_class_and_its_methods(self, tmp_path):
        f = write_file(tmp_path, "models.py", """\
            class User:
                def __init__(self, name: str):
                    self.name = name

                def greet(self):
                    return f"Hello {self.name}"
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="models")
        type_counts = {d.symbol_type: 0 for d in table.definitions}
        for d in table.definitions:
            type_counts[d.symbol_type] += 1
        assert type_counts["class"] == 1
        assert type_counts["method"] == 2

    def test_method_qualified_name_includes_class(self, tmp_path):
        f = write_file(tmp_path, "models.py", """\
            class User:
                def greet(self):
                    pass
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="models")
        method = next(d for d in table.definitions if d.symbol_type == "method")
        assert method.qualified_name == "models.User.greet"

    def test_extracts_from_import(self, tmp_path):
        f = write_file(tmp_path, "middleware.py", """\
            from auth.utils import validate_token

            def check(request):
                return validate_token(request.token)
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="middleware")
        assert len(table.imports) == 1
        imp = table.imports[0]
        assert imp.source_module == "auth.utils"
        assert imp.imported_name == "validate_token"
        assert not imp.is_dynamic

    def test_extracts_bare_import(self, tmp_path):
        f = write_file(tmp_path, "utils.py", """\
            import os

            def get_home():
                return os.path.expanduser("~")
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="utils")
        os_import = next(i for i in table.imports if i.source_module == "os")
        assert os_import.imported_name is None

    def test_flags_dynamic_imports(self, tmp_path):
        f = write_file(tmp_path, "loader.py", """\
            import importlib

            def load_plugin(name: str):
                return importlib.import_module(name)
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="loader")
        dynamic = [i for i in table.imports if i.is_dynamic]
        assert len(dynamic) == 1

    def test_extracts_call_expressions(self, tmp_path):
        f = write_file(tmp_path, "middleware.py", """\
            from auth.utils import validate_token

            def process(req):
                result = validate_token(req.token)
                return result
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="middleware")
        assert "validate_token" in table.call_expressions

    def test_handles_syntax_error_gracefully(self, tmp_path):
        f = write_file(tmp_path, "broken.py", "def (broken syntax\n")
        parser = ASTParser()
        table = parser.parse_file(f, module_path="broken")
        assert table.definitions == []
        assert table.imports == []

    def test_handles_async_function(self, tmp_path):
        f = write_file(tmp_path, "views.py", """\
            async def get_user(user_id: int):
                pass
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="views")
        assert len(table.definitions) == 1
        assert table.definitions[0].symbol_type == "function"
        assert table.definitions[0].name == "get_user"

    def test_import_alias_captured(self, tmp_path):
        f = write_file(tmp_path, "views.py", """\
            from auth.utils import validate_token as vt
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="views")
        assert table.imports[0].alias == "vt"
        assert table.imports[0].imported_name == "validate_token"

    def test_relative_import_resolved(self, tmp_path):
        f = write_file(tmp_path, "auth/views.py", """\
            from . import utils
        """)
        parser = ASTParser()
        table = parser.parse_file(f, module_path="auth.views")
        assert table.imports[0].source_module == "auth"


class TestRepositoryScanner:

    def test_scans_all_python_files(self, tmp_path):
        write_file(tmp_path, "auth/__init__.py", "")
        write_file(tmp_path, "auth/utils.py", "def foo(): pass")
        write_file(tmp_path, "api/routes.py", "def bar(): pass")
        scanner = RepositoryScanner(tmp_path)
        tables = scanner.scan()
        assert "auth.utils" in tables
        assert "api.routes" in tables

    def test_skips_venv_directory(self, tmp_path):
        write_file(tmp_path, "venv/site-packages/requests/api.py", "def get(): pass")
        write_file(tmp_path, "myapp/utils.py", "def helper(): pass")
        scanner = RepositoryScanner(tmp_path)
        tables = scanner.scan()
        for key in tables:
            assert "venv" not in key
        assert "myapp.utils" in tables

    def test_init_file_becomes_package_path(self, tmp_path):
        write_file(tmp_path, "auth/__init__.py", "")
        scanner = RepositoryScanner(tmp_path)
        tables = scanner.scan()
        assert "auth" in tables
        assert "auth.__init__" not in tables

    def test_module_path_derivation(self, tmp_path):
        write_file(tmp_path, "a/b/c.py", "x = 1")
        scanner = RepositoryScanner(tmp_path)
        tables = scanner.scan()
        assert "a.b.c" in tables


class TestCallGraphTracer:

    def _make_table(self, module_path, imports):
        from engines.blast_radius import ImportedName
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

    def _make_defn_table(self, module_path, symbol_name):
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

    def test_finds_direct_dependent(self):
        tables = {
            "auth.utils": self._make_defn_table("auth.utils", "validate_token"),
            "auth.middleware": self._make_table("auth.middleware", [("auth.utils", "validate_token")]),
        }
        tracer = CallGraphTracer(tables)
        direct, transitive, edges, warnings = tracer.trace(["auth.utils.validate_token"])
        assert "auth.middleware" in direct
        assert transitive == []

    def test_finds_transitive_dependent(self):
        tables = {
            "auth.utils": self._make_defn_table("auth.utils", "validate_token"),
            "auth.middleware": self._make_table("auth.middleware", [("auth.utils", "validate_token")]),
            "api.routes": self._make_table("api.routes", [("auth.middleware", "check")]),
        }
        tracer = CallGraphTracer(tables)
        direct, transitive, edges, warnings = tracer.trace(["auth.utils.validate_token"])
        assert "auth.middleware" in direct
        assert "api.routes" in transitive

    def test_no_duplicates_from_multiple_paths(self):
        tables = {
            "x": self._make_defn_table("x", "func"),
            "a": self._make_table("a", [("x", "func")]),
            "b": self._make_table("b", [("x", "func")]),
            "c": self._make_table("c", [("a", "something"), ("b", "something")]),
        }
        tracer = CallGraphTracer(tables)
        direct, transitive, _, _ = tracer.trace(["x.func"])
        all_found = direct + transitive
        assert len(all_found) == len(set(all_found))

    def test_handles_unknown_symbol_gracefully(self):
        tables = {"mymodule": self._make_defn_table("mymodule", "real_func")}
        tracer = CallGraphTracer(tables)
        direct, transitive, edges, warnings = tracer.trace(["nonexistent.module.ghost_function"])
        assert direct == []
        assert transitive == []
        assert len(warnings) == 1

    def test_edges_contain_depth_information(self):
        tables = {
            "a": self._make_defn_table("a", "func"),
            "b": self._make_table("b", [("a", "func")]),
        }
        tracer = CallGraphTracer(tables)
        _, _, edges, _ = tracer.trace(["a.func"])
        assert all("depth" in edge for edge in edges)
        assert edges[0]["depth"] == 1

    def test_max_depth_prevents_infinite_loop(self):
        tables = {
            "a": self._make_defn_table("a", "func"),
            "b": self._make_table("b", [("a", "func")]),
        }
        tables["a"].imports.append(
            __import__("engines.blast_radius", fromlist=["ImportedName"]).ImportedName(
                source_module="b",
                imported_name="something",
                alias="something",
            )
        )
        tracer = CallGraphTracer(tables)
        direct, transitive, edges, _ = tracer.trace(["a.func"], max_depth=5)
        assert isinstance(direct, list)


class TestRiskScorer:

    def test_empty_blast_radius_scores_zero(self):
        scorer = RiskScorer()
        score, tier = scorer.score([], [], [], [])
        assert score == 0.0
        assert tier == "LOW"

    def test_tier_boundaries_are_correct(self):
        scorer = RiskScorer()
        for raw, expected_tier in [
            (0.00, "LOW"), (0.24, "LOW"),
            (0.25, "MEDIUM"), (0.49, "MEDIUM"),
            (0.50, "HIGH"), (0.74, "HIGH"),
            (0.75, "CRITICAL"), (1.00, "CRITICAL"),
        ]:
            tier = scorer._tier(raw)
            assert tier == expected_tier, f"score {raw} → expected {expected_tier}, got {tier}"

    def test_uncovered_nodes_increase_score(self):
        scorer = RiskScorer()
        modules = [f"mod.file{i}" for i in range(5)]
        edges = [{"from": f"mod.file{i}", "to": "mod.base", "depth": 1} for i in range(5)]
        score_no_uncovered, _ = scorer.score(modules, [], edges, [])
        score_with_uncovered, _ = scorer.score(modules, [], edges, modules)
        assert score_with_uncovered > score_no_uncovered

    def test_core_module_increases_score(self):
        """
        NOTE: 'api' is in CORE_PATH_SEGMENTS, so we use 'utils.helpers'
        (genuinely non-core) as the baseline.
        """
        scorer = RiskScorer()
        edges = [{"from": "utils.helpers", "to": "base", "depth": 1}]
        score_normal, _ = scorer.score(["utils.helpers"], [], edges, [])
        score_core, _ = scorer.score(["auth.helpers"], [], edges, [])
        assert score_core > score_normal

    def test_score_does_not_exceed_one(self):
        scorer = RiskScorer()
        huge_modules = [f"auth.db.file{i}" for i in range(1000)]
        huge_edges = [{"from": m, "to": "root", "depth": i % 20} for i, m in enumerate(huge_modules)]
        score, _ = scorer.score(huge_modules, huge_modules, huge_edges, huge_modules)
        assert score <= 1.0


class TestAnalyzeBlastRadius:

    def test_full_pipeline_produces_valid_result(self, tmp_path):
        write_file(tmp_path, "auth/__init__.py", "")
        write_file(tmp_path, "auth/utils.py", """\
            def validate_token(token: str) -> bool:
                return bool(token)
        """)
        write_file(tmp_path, "auth/middleware.py", """\
            from auth.utils import validate_token

            def check_request(request):
                return validate_token(request.headers.get("token", ""))
        """)
        write_file(tmp_path, "api/__init__.py", "")
        write_file(tmp_path, "api/routes.py", """\
            from auth.middleware import check_request

            def get_user(request):
                if not check_request(request):
                    return {"error": "unauthorized"}
                return {"user": "ok"}
        """)
        result = analyze_blast_radius(
            repo_root=tmp_path,
            changed_symbols=["auth.utils.validate_token"],
        )
        assert isinstance(result, BlastRadiusResult)
        assert "auth.middleware" in result.direct_dependents
        assert "api.routes" in result.transitive_dependents
        assert result.total_affected_files == 2
        assert result.risk_tier in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        assert result.analysis_time_seconds >= 0

    def test_result_is_json_serialisable(self, tmp_path):
        import json
        from engines.blast_radius import result_to_json
        write_file(tmp_path, "simple.py", "def foo(): pass")
        result = analyze_blast_radius(repo_root=tmp_path, changed_symbols=["simple.foo"])
        json_str = result_to_json(result)
        parsed = json.loads(json_str)
        assert "risk_tier" in parsed
        assert "direct_dependents" in parsed

    def test_trivial_change_scores_low(self, tmp_path):
        write_file(tmp_path, "standalone.py", """\
            def compute_sum(a: int, b: int) -> int:
                return a + b
        """)
        result = analyze_blast_radius(
            repo_root=tmp_path,
            changed_symbols=["standalone.compute_sum"],
        )
        assert result.risk_tier == "LOW"
        assert result.total_affected_files == 0