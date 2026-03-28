"""Tests for db/fingerprint_store.py — covers init, save, retrieve, match, and risk assessment."""
import json
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest

from db import fingerprint_store as fs


@pytest.fixture(autouse=True)
def use_tmp_db(tmp_path, monkeypatch):
    """Point fingerprint_store.DB_PATH at a temp file so tests are isolated."""
    monkeypatch.setattr(fs, "DB_PATH", tmp_path / "test_fingerprints.db")


# ── init_db ──

def test_init_creates_table():
    fs.init_db()
    conn = sqlite3.connect(fs.DB_PATH)
    cursor = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='fingerprints';"
    )
    assert cursor.fetchone() is not None
    conn.close()


def test_init_idempotent():
    """Calling init_db twice should not raise."""
    fs.init_db()
    fs.init_db()


# ── save_fingerprints ──

SAMPLE_RULES = [
    {
        "antecedents": ["a.py"],
        "consequents": ["b.py"],
        "support": 0.15,
        "confidence": 0.75,
        "lift": 2.5,
    },
    {
        "antecedents": ["c.py", "d.py"],
        "consequents": ["e.py"],
        "support": 0.05,
        "confidence": 0.90,
        "lift": 4.0,
    },
]


def test_save_and_get_all():
    fs.save_fingerprints(SAMPLE_RULES, "/repos/test")
    results = fs.get_all_fingerprints("/repos/test")
    assert len(results) == 2
    assert results[0]["antecedents"] == ["a.py"]
    assert results[1]["confidence"] == 0.90


def test_get_all_no_filter():
    fs.save_fingerprints(SAMPLE_RULES[:1], "/repos/a")
    fs.save_fingerprints(SAMPLE_RULES[1:], "/repos/b")
    all_results = fs.get_all_fingerprints()   # No repo filter
    assert len(all_results) == 2


def test_get_all_empty():
    results = fs.get_all_fingerprints("/repos/nonexistent")
    assert results == []


# ── match_pr ──

def test_match_pr_finds_match():
    fs.save_fingerprints(SAMPLE_RULES, "/repos/test")
    result = fs.match_pr(["a.py", "b.py", "extra.py"], "/repos/test")
    assert result["matched"] is True
    assert result["risk_tier"] in ("LOW", "MEDIUM", "HIGH")
    assert len(result["matching_fingerprints"]) >= 1


def test_match_pr_no_match():
    fs.save_fingerprints(SAMPLE_RULES, "/repos/test")
    result = fs.match_pr(["x.py", "y.py"], "/repos/test")
    assert result["matched"] is False
    assert result["risk_tier"] == "LOW"


def test_match_pr_superset_changes():
    """All antecedents present → should match, even if extra files changed."""
    fs.save_fingerprints(SAMPLE_RULES, "/repos/test")
    result = fs.match_pr(["c.py", "d.py", "f.py"], "/repos/test")
    assert result["matched"] is True


# ── _calculate_risk_tier ──

def test_risk_tier_high_confidence():
    tier = fs._calculate_risk_tier([{"confidence": 0.85, "lift": 1.0}])
    assert tier == "HIGH"


def test_risk_tier_high_lift():
    tier = fs._calculate_risk_tier([{"confidence": 0.2, "lift": 3.5}])
    assert tier == "HIGH"


def test_risk_tier_medium():
    tier = fs._calculate_risk_tier([{"confidence": 0.6, "lift": 1.5}])
    assert tier == "MEDIUM"


def test_risk_tier_low():
    tier = fs._calculate_risk_tier([{"confidence": 0.3, "lift": 1.0}])
    assert tier == "LOW"


def test_risk_tier_empty():
    tier = fs._calculate_risk_tier([])
    assert tier == "LOW"


# ── _generate_summary ──

def test_summary_no_matches():
    summary = fs._generate_summary([], "LOW")
    assert "No historical patterns" in summary


def test_summary_with_matches():
    summary = fs._generate_summary(
        [{"confidence": 0.75, "lift": 2.0, "antecedents": ["a.py"], "consequents": ["b.py"]}],
        "HIGH",
    )
    assert "75%" in summary
    assert "HIGH" in summary
