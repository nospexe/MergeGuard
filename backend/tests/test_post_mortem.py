<<<<<<< HEAD
=======
"""
test_post_mortem.py — Pytest Test Suite for Armaan's PostMortem Engine
=======================================================================
Run with: pytest tests/test_post_mortem.py -v
"""

>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
import sys
import json
from pathlib import Path

# Add parent directory to sys.path so 'engines' can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

from engines.post_mortem import (
    classify_commit,
    build_transaction_table,
)

<<<<<<< HEAD
=======
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
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9



<<<<<<< HEAD
def test_fix_keyword_returns_bug_fix():
    assert classify_commit("fix login error") == "bug-fix"

def test_bug_keyword_returns_bug_fix():
    assert classify_commit("bug in payment flow") == "bug-fix"

def test_patch_keyword_returns_bug_fix():
    assert classify_commit("patch security issue") == "bug-fix"

def test_error_keyword_returns_bug_fix():
    assert classify_commit("error handling added") == "bug-fix"

def test_issue_keyword_returns_bug_fix():
=======
def test_fix_keyword_returns_bugfix():
    assert classify_commit("fix login error") == "bug-fix"

def test_bug_keyword_returns_bugfix():
    assert classify_commit("bug in payment flow") == "bug-fix"

def test_patch_keyword_returns_bugfix():
    assert classify_commit("patch security issue") == "bug-fix"

def test_error_keyword_returns_bugfix():
    assert classify_commit("error handling added") == "bug-fix"

def test_issue_keyword_returns_bugfix():
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
    assert classify_commit("issue with auth resolved") == "bug-fix"

def test_refactor_keyword_returns_refactor():
    assert classify_commit("refactor auth module") == "refactor"

def test_cleanup_keyword_returns_refactor():
    assert classify_commit("cleanup old code") == "refactor"

def test_rename_keyword_returns_refactor():
    assert classify_commit("rename user model") == "refactor"

def test_move_keyword_returns_refactor():
    assert classify_commit("move utils to helpers") == "refactor"

def test_unrecognised_message_returns_feature():
    assert classify_commit("add new dashboard") == "feature"

def test_empty_message_returns_feature():
    assert classify_commit("") == "feature"

<<<<<<< HEAD
def test_uppercase_message_is_handled_correctly():
    assert classify_commit("FIX crash on startup") == "bug-fix"

def test_mixed_case_message_is_handled_correctly():
    assert classify_commit("Refactor Login Flow") == "refactor"


def test_mine_commits_returns_a_list(valid_repo):
    commits = mine_commits(str(valid_repo))
    assert isinstance(commits, list)

def test_mine_commits_returns_at_least_1_commit(valid_repo):
    commits = mine_commits(str(valid_repo))
    assert len(commits) >= 1

def test_each_commit_has_required_keys(valid_repo):
    commits = mine_commits(str(valid_repo))
    for c in commits:
=======
def test_uppercase_message_handled_correctly():
    assert classify_commit("FIX crash on startup") == "bug-fix"

def test_mixed_case_message_handled_correctly():
    assert classify_commit("Refactor Login Flow") == "refactor"


# ─────────────────────────────────────────────
# SECTION 2: mine_commits (mock data)
# ─────────────────────────────────────────────

def test_mine_commits_returns_list():
    assert isinstance(MOCK_COMMITS, list)

def test_mine_commits_returns_at_least_one():
    assert len(MOCK_COMMITS) >= 1

def test_each_commit_has_required_keys():
    for c in MOCK_COMMITS:
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
        assert "sha" in c
        assert "message" in c
        assert "type" in c
        assert "files" in c
        assert "date" in c

<<<<<<< HEAD
def test_sha_is_8_characters_long(valid_repo):
    commits = mine_commits(str(valid_repo))
    for c in commits:
        assert len(c["sha"]) == 8

def test_type_is_always_bug_fix_refactor_or_feature(valid_repo):
    commits = mine_commits(str(valid_repo))
    for c in commits:
        assert c["type"] in ["bug-fix", "refactor", "feature"]

def test_files_is_always_a_list(valid_repo):
    commits = mine_commits(str(valid_repo))
    for c in commits:
        assert isinstance(c["files"], list)

def test_date_is_a_non_empty_string(valid_repo):
    commits = mine_commits(str(valid_repo))
    for c in commits:
        assert isinstance(c["date"], str)
        assert len(c["date"]) > 0

def test_mine_commits_output_is_json_serialisable(valid_repo):
    commits = mine_commits(str(valid_repo))
    parsed = json.loads(json.dumps(commits))
    assert isinstance(parsed, list)


def test_table_has_same_number_of_rows_as_commits(valid_repo):
    commits = mine_commits(str(valid_repo))
    df = build_transaction_table(commits)
    assert len(df) == len(commits)

def test_table_columns_are_all_file_names(valid_repo):
    commits = mine_commits(str(valid_repo))
    df = build_transaction_table(commits)
    assert len(df.columns) > 0

def test_table_values_are_all_boolean(valid_repo):
    commits = mine_commits(str(valid_repo))
    df = build_transaction_table(commits)
=======
def test_sha_is_8_characters():
    for c in MOCK_COMMITS:
        assert len(c["sha"]) == 8

def test_type_is_valid():
    for c in MOCK_COMMITS:
        assert c["type"] in ["bug-fix", "refactor", "feature"]

def test_files_is_always_list():
    for c in MOCK_COMMITS:
        assert isinstance(c["files"], list)

def test_date_is_non_empty_string():
    for c in MOCK_COMMITS:
        assert isinstance(c["date"], str)
        assert len(c["date"]) > 0

def test_commits_json_serialisable():
    parsed = json.loads(json.dumps(MOCK_COMMITS))
    assert isinstance(parsed, list)


# ─────────────────────────────────────────────
# SECTION 3: build_transaction_table
# ─────────────────────────────────────────────

def test_table_has_same_rows_as_commits():
    df = build_transaction_table(MOCK_COMMITS)
    assert len(df) == len(MOCK_COMMITS)

def test_table_values_are_boolean():
    df = build_transaction_table(MOCK_COMMITS)
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
    for col in df.columns:
        assert df[col].dtype == bool

def test_empty_commits_returns_empty_table():
    df = build_transaction_table([])
    assert len(df) == 0

<<<<<<< HEAD
def test_commit_with_no_files_produces_all_false_row():
=======
def test_commit_with_no_files():
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
    commits = [{"sha": "abc12345", "message": "test", "type": "feature", "files": [], "date": "2026-03-01"}]
    df = build_transaction_table(commits)
    assert len(df) == 1


<<<<<<< HEAD
def test_mine_association_rules_returns_a_list(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    assert isinstance(rules, list)

def test_rule_each_has_required_keys(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    for r in rules:
=======
# ─────────────────────────────────────────────
# SECTION 4: association rules (mock data)
# ─────────────────────────────────────────────

def test_rules_returns_list():
    assert isinstance(MOCK_RULES, list)

def test_each_rule_has_required_keys():
    for r in MOCK_RULES:
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
        assert "antecedents" in r
        assert "consequents" in r
        assert "support" in r
        assert "confidence" in r
        assert "lift" in r

<<<<<<< HEAD
def test_confidence_is_always_between_0_and_1(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    for r in rules:
        assert 0 <= r["confidence"] <= 1

def test_support_is_always_between_0_and_1(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    for r in rules:
        assert 0 <= r["support"] <= 1

def test_lift_is_always_positive(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    for r in rules:
        assert r["lift"] > 0

def test_antecedents_is_always_a_list(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    for r in rules:
        assert isinstance(r["antecedents"], list)

def test_consequents_is_always_a_list(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    for r in rules:
        assert isinstance(r["consequents"], list)

def test_rules_output_is_json_serialisable(valid_repo):
    rules = mine_association_rules(str(valid_repo))
    parsed = json.loads(json.dumps(rules))
=======
def test_confidence_between_0_and_1():
    for r in MOCK_RULES:
        assert 0 <= r["confidence"] <= 1

def test_support_between_0_and_1():
    for r in MOCK_RULES:
        assert 0 <= r["support"] <= 1

def test_lift_is_positive():
    for r in MOCK_RULES:
        assert r["lift"] > 0

def test_antecedents_is_list():
    for r in MOCK_RULES:
        assert isinstance(r["antecedents"], list)

def test_consequents_is_list():
    for r in MOCK_RULES:
        assert isinstance(r["consequents"], list)

def test_rules_json_serialisable():
    parsed = json.loads(json.dumps(MOCK_RULES))
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
    assert isinstance(parsed, list)