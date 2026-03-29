"""Tests for db/fingerprint_store.py — covers save, retrieve, match, and risk assessment using Convex."""
import pytest

from db import fingerprint_store as fs

class MockConvexClient:
    def __init__(self):
        self.data = []
        self.next_id = 1

    def query(self, route: str, args: dict = None):
        if route == "fingerprints:list":
            if args and "repoPath" in args:
                return [d for d in self.data if d.get("repoPath") == args["repoPath"]]
            return self.data
        return []

    def mutation(self, route: str, args: dict):
        if route == "fingerprints:create":
            args["_id"] = f"mock-id-{self.next_id}"
            args["_creationTime"] = 123456789.0
            self.next_id += 1
            self.data.append(args)

mock_client = MockConvexClient()

@pytest.fixture(autouse=True)
def mock_convex(monkeypatch):
    """Replace the real convex client with our mock."""
    mock_client.data = []
    monkeypatch.setattr(fs, "client", mock_client)


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
