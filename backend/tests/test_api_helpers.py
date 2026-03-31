"""Tests for api/main.py translation & helper functions — covers translate_blast_radius,
translate_postmortem, _make_serializable, resolve_changed_symbols, and the VERSION constant."""
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from api.main import (
    translate_blast_radius,
    translate_postmortem,
    _make_serializable,
    resolve_changed_symbols,
    VERSION,
)


# ── VERSION constant ──

def test_version_is_string():
    assert isinstance(VERSION, str)
    assert VERSION == "0.2.0"


# ── _make_serializable ──

def test_serializable_primitives():
    assert _make_serializable(None) is None
    assert _make_serializable(42) == 42
    assert _make_serializable(3.14) == 3.14
    assert _make_serializable(True) is True
    assert _make_serializable("hello") == "hello"


def test_serializable_dict():
    result = _make_serializable({"a": 1, "b": ValueError("oops")})
    assert result["a"] == 1
    assert isinstance(result["b"], str)


def test_serializable_list():
    result = _make_serializable([1, "two", ValueError("e")])
    assert result[0] == 1
    assert result[1] == "two"
    assert isinstance(result[2], str)


def test_serializable_nested():
    result = _make_serializable({"errors": [{"ctx": {"error": ValueError("bad")}}]})
    assert isinstance(result["errors"][0]["ctx"]["error"], str)


# ── translate_blast_radius ──

def _make_blast_result_dict(**overrides):
    base = {
        "changed_symbols": ["sample.hello"],
        "direct_dependents": [],
        "transitive_dependents": [],
        "uncovered_nodes": [],
        "total_affected_files": 0,
        "dependency_edges": [],
        "risk_score": 0.0,
        "risk_tier": "LOW",
        "dynamic_import_warnings": [],
        "analysis_time_seconds": 0.1,
    }
    base.update(overrides)
    from types import SimpleNamespace
    from dataclasses import dataclass, field, asdict, fields
    # Build a simple object that acts like a BlastRadiusResult for asdict()
    from engines.blast_radius import BlastRadiusResult

    return BlastRadiusResult(**base)


def test_translate_blast_radius_empty():
    result = _make_blast_result_dict()
    translated = translate_blast_radius(result)
    assert "nodes" in translated
    assert "edges" in translated
    assert "risk_score" in translated
    assert "risk_level" in translated
    assert translated["risk_level"] == "low"


def test_translate_blast_radius_with_direct_deps():
    result = _make_blast_result_dict(
        direct_dependents=["utils.helpers"],
        dependency_edges=[{"from": "utils.helpers", "to": "sample", "depth": 1}],
    )
    translated = translate_blast_radius(result)
    assert len(translated["nodes"]) >= 2


def test_translate_blast_radius_risk_tiers():
    for tier, expected in [("LOW", "low"), ("MEDIUM", "medium"), ("HIGH", "high"), ("CRITICAL", "high")]:
        result = _make_blast_result_dict(risk_tier=tier)
        translated = translate_blast_radius(result)
        assert translated["risk_level"] == expected


# ── translate_postmortem ──

def test_translate_postmortem_empty():
    result = translate_postmortem([])
    assert result["matches"] == []
    assert result["top_risk_files"] == []


def test_translate_postmortem_with_rules():
    rules = [
        {"antecedents": frozenset(["a.py"]), "consequents": frozenset(["b.py"]), "support": 0.10, "confidence": 0.80},
        {"antecedents": frozenset(["c.py"]), "consequents": frozenset(["d.py"]), "support": 0.05, "confidence": 0.60},
    ]
    result = translate_postmortem(rules)
    assert len(result["matches"]) == 2
    assert result["matches"][0]["pattern_id"] == "FP-001"
    assert len(result["top_risk_files"]) <= 5


# ── resolve_changed_symbols ──

def test_resolve_changed_symbols_fallback(tmp_path):
    """When repo has no diffs, should fallback to pr_branch name."""
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "t@t.com"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.name", "T"], cwd=tmp_path, check=True, capture_output=True)
    (tmp_path / "f.py").write_text("x = 1\n")
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=tmp_path, check=True, capture_output=True)

    symbols, tables, source_root = resolve_changed_symbols(str(tmp_path), "HEAD", "HEAD")
    assert isinstance(symbols, list)


def test_resolve_changed_symbols_bad_repo():
    """Non-existent repo should fallback gracefully."""
    symbols, tables, source_root = resolve_changed_symbols("/nonexistent", "main", "dev")
    assert symbols == []
