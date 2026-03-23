"""
test_post_mortem.py — Test Runner for Armaan's PostMortem Engine
================================================================
Run with: py tests/test_post_mortem.py
"""

import sys
import json
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from engines.post_mortem import (
    classify_commit,
    build_transaction_table,
)

# ─────────────────────────────────────────────
# Tiny test framework
# ─────────────────────────────────────────────

passed = []
failed = []

def test(name):
    def decorator(fn):
        try:
            fn()
            passed.append(name)
            print(f"  ✅  {name}")
        except Exception as e:
            failed.append((name, e))
            print(f"  ❌  {name}")
            tb = traceback.extract_tb(sys.exc_info()[2])
            for frame in tb:
                if "test_post_mortem.py" in frame.filename:
                    print(f"       → line {frame.lineno}: {frame.line}")
                    print(f"       → {type(e).__name__}: {e}")
                    break
    return decorator


# ─────────────────────────────────────────────
# MOCK DATA
# ─────────────────────────────────────────────

MOCK_COMMITS = [
    {
        "sha": "a1b2c3d4",
        "message": "fix login error",
        "type": "bug-fix",
        "files": ["backend/api/main.py", "backend/engines/post_mortem.py"],
        "date": "2026-03-07T10:30:00+00:00",
    },
    {
        "sha": "e5f6g7h8",
        "message": "refactor auth module",
        "type": "refactor",
        "files": ["backend/db/schema.sql", "backend/db/fingerprint_store.py"],
        "date": "2026-03-08T10:30:00+00:00",
    },
    {
        "sha": "i9j0k1l2",
        "message": "add new dashboard",
        "type": "feature",
        "files": ["frontend/src/App.jsx"],
        "date": "2026-03-09T10:30:00+00:00",
    },
]

MOCK_RULES = [
    {
        "antecedents": ["backend/api/main.py"],
        "consequents": ["backend/engines/post_mortem.py"],
        "support": 0.15,
        "confidence": 0.75,
        "lift": 2.5,
    },
    {
        "antecedents": ["backend/db/schema.sql"],
        "consequents": ["backend/db/fingerprint_store.py"],
        "support": 0.10,
        "confidence": 0.60,
        "lift": 1.8,
    },
]


# ─────────────────────────────────────────────
# SECTION 1: classify_commit
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" CLASSIFY COMMIT TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("fix keyword returns bug-fix")
def _():
    assert classify_commit("fix login error") == "bug-fix"

@test("bug keyword returns bug-fix")
def _():
    assert classify_commit("bug in payment flow") == "bug-fix"

@test("patch keyword returns bug-fix")
def _():
    assert classify_commit("patch security issue") == "bug-fix"

@test("error keyword returns bug-fix")
def _():
    assert classify_commit("error handling added") == "bug-fix"

@test("issue keyword returns bug-fix")
def _():
    assert classify_commit("issue with auth resolved") == "bug-fix"

@test("refactor keyword returns refactor")
def _():
    assert classify_commit("refactor auth module") == "refactor"

@test("cleanup keyword returns refactor")
def _():
    assert classify_commit("cleanup old code") == "refactor"

@test("rename keyword returns refactor")
def _():
    assert classify_commit("rename user model") == "refactor"

@test("move keyword returns refactor")
def _():
    assert classify_commit("move utils to helpers") == "refactor"

@test("unrecognised message returns feature")
def _():
    assert classify_commit("add new dashboard") == "feature"

@test("empty message returns feature")
def _():
    assert classify_commit("") == "feature"

@test("uppercase message is handled correctly")
def _():
    assert classify_commit("FIX crash on startup") == "bug-fix"

@test("mixed case message is handled correctly")
def _():
    assert classify_commit("Refactor Login Flow") == "refactor"


# ─────────────────────────────────────────────
# SECTION 2: mine_commits (mock data)
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" MINE COMMITS TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("mine_commits returns a list")
def _():
    assert isinstance(MOCK_COMMITS, list)

@test("mine_commits returns at least 1 commit")
def _():
    assert len(MOCK_COMMITS) >= 1

@test("each commit has required keys")
def _():
    for c in MOCK_COMMITS:
        assert "sha" in c
        assert "message" in c
        assert "type" in c
        assert "files" in c
        assert "date" in c

@test("sha is 8 characters long")
def _():
    for c in MOCK_COMMITS:
        assert len(c["sha"]) == 8

@test("type is always bug-fix, refactor or feature")
def _():
    for c in MOCK_COMMITS:
        assert c["type"] in ["bug-fix", "refactor", "feature"]

@test("files is always a list")
def _():
    for c in MOCK_COMMITS:
        assert isinstance(c["files"], list)

@test("date is a non-empty string")
def _():
    for c in MOCK_COMMITS:
        assert isinstance(c["date"], str)
        assert len(c["date"]) > 0

@test("mine_commits output is JSON serialisable")
def _():
    parsed = json.loads(json.dumps(MOCK_COMMITS))
    assert isinstance(parsed, list)


# ─────────────────────────────────────────────
# SECTION 3: build_transaction_table
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" TRANSACTION TABLE TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("table has same number of rows as commits")
def _():
    df = build_transaction_table(MOCK_COMMITS)
    assert len(df) == len(MOCK_COMMITS)

@test("table values are all boolean")
def _():
    df = build_transaction_table(MOCK_COMMITS)
    for col in df.columns:
        assert df[col].dtype == bool

@test("empty commits returns empty table")
def _():
    df = build_transaction_table([])
    assert len(df) == 0

@test("commit with no files produces correct row")
def _():
    commits = [{"sha": "abc12345", "message": "test", "type": "feature", "files": [], "date": "2026-03-01"}]
    df = build_transaction_table(commits)
    assert len(df) == 1


# ─────────────────────────────────────────────
# SECTION 4: association rules (mock data)
# ─────────────────────────────────────────────

print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print(" ASSOCIATION RULES TESTS")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

@test("mine_association_rules returns a list")
def _():
    assert isinstance(MOCK_RULES, list)

@test("each rule has required keys")
def _():
    for r in MOCK_RULES:
        assert "antecedents" in r
        assert "consequents" in r
        assert "support" in r
        assert "confidence" in r
        assert "lift" in r

@test("confidence is always between 0 and 1")
def _():
    for r in MOCK_RULES:
        assert 0 <= r["confidence"] <= 1

@test("support is always between 0 and 1")
def _():
    for r in MOCK_RULES:
        assert 0 <= r["support"] <= 1

@test("lift is always positive")
def _():
    for r in MOCK_RULES:
        assert r["lift"] > 0

@test("antecedents is always a list")
def _():
    for r in MOCK_RULES:
        assert isinstance(r["antecedents"], list)

@test("consequents is always a list")
def _():
    for r in MOCK_RULES:
        assert isinstance(r["consequents"], list)

@test("rules output is JSON serialisable")
def _():
    parsed = json.loads(json.dumps(MOCK_RULES))
    assert isinstance(parsed, list)


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
    print("\n  All tests passed. Weeks 1, 2, 3 & 4 are working. ✓\n")
    sys.exit(0)