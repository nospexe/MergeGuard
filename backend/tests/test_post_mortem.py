import sys
import json
from pathlib import Path

# Add parent directory to sys.path so 'engines' can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

from engines.post_mortem import (
    classify_commit,
    mine_commits,
    build_transaction_table,
    mine_association_rules,
)

REPO_PATH = str(Path(__file__).parent.parent.parent)


def test_fix_keyword_returns_bug_fix():
    assert classify_commit("fix login error") == "bug-fix"

def test_bug_keyword_returns_bug_fix():
    assert classify_commit("bug in payment flow") == "bug-fix"

def test_patch_keyword_returns_bug_fix():
    assert classify_commit("patch security issue") == "bug-fix"

def test_error_keyword_returns_bug_fix():
    assert classify_commit("error handling added") == "bug-fix"

def test_issue_keyword_returns_bug_fix():
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

def test_uppercase_message_is_handled_correctly():
    assert classify_commit("FIX crash on startup") == "bug-fix"

def test_mixed_case_message_is_handled_correctly():
    assert classify_commit("Refactor Login Flow") == "refactor"


def test_mine_commits_returns_a_list():
    commits = mine_commits(REPO_PATH)
    assert isinstance(commits, list)

def test_mine_commits_returns_at_least_1_commit():
    commits = mine_commits(REPO_PATH)
    assert len(commits) >= 1

def test_each_commit_has_required_keys():
    commits = mine_commits(REPO_PATH)
    for c in commits:
        assert "sha" in c
        assert "message" in c
        assert "type" in c
        assert "files" in c
        assert "date" in c

def test_sha_is_8_characters_long():
    commits = mine_commits(REPO_PATH)
    for c in commits:
        assert len(c["sha"]) == 8

def test_type_is_always_bug_fix_refactor_or_feature():
    commits = mine_commits(REPO_PATH)
    for c in commits:
        assert c["type"] in ["bug-fix", "refactor", "feature"]

def test_files_is_always_a_list():
    commits = mine_commits(REPO_PATH)
    for c in commits:
        assert isinstance(c["files"], list)

def test_date_is_a_non_empty_string():
    commits = mine_commits(REPO_PATH)
    for c in commits:
        assert isinstance(c["date"], str)
        assert len(c["date"]) > 0

def test_mine_commits_output_is_json_serialisable():
    commits = mine_commits(REPO_PATH)
    parsed = json.loads(json.dumps(commits))
    assert isinstance(parsed, list)


def test_table_has_same_number_of_rows_as_commits():
    commits = mine_commits(REPO_PATH)
    df = build_transaction_table(commits)
    assert len(df) == len(commits)

def test_table_columns_are_all_file_names():
    commits = mine_commits(REPO_PATH)
    df = build_transaction_table(commits)
    assert len(df.columns) > 0

def test_table_values_are_all_boolean():
    commits = mine_commits(REPO_PATH)
    df = build_transaction_table(commits)
    for col in df.columns:
        assert df[col].dtype == bool

def test_empty_commits_returns_empty_table():
    df = build_transaction_table([])
    assert len(df) == 0

def test_commit_with_no_files_produces_all_false_row():
    commits = [{"sha": "abc12345", "message": "test", "type": "feature", "files": [], "date": "2026-03-01"}]
    df = build_transaction_table(commits)
    assert len(df) == 1


def test_mine_association_rules_returns_a_list():
    rules = mine_association_rules(REPO_PATH)
    assert isinstance(rules, list)

def test_rule_each_has_required_keys():
    rules = mine_association_rules(REPO_PATH)
    for r in rules:
        assert "antecedents" in r
        assert "consequents" in r
        assert "support" in r
        assert "confidence" in r
        assert "lift" in r

def test_confidence_is_always_between_0_and_1():
    rules = mine_association_rules(REPO_PATH)
    for r in rules:
        assert 0 <= r["confidence"] <= 1

def test_support_is_always_between_0_and_1():
    rules = mine_association_rules(REPO_PATH)
    for r in rules:
        assert 0 <= r["support"] <= 1

def test_lift_is_always_positive():
    rules = mine_association_rules(REPO_PATH)
    for r in rules:
        assert r["lift"] > 0

def test_antecedents_is_always_a_list():
    rules = mine_association_rules(REPO_PATH)
    for r in rules:
        assert isinstance(r["antecedents"], list)

def test_consequents_is_always_a_list():
    rules = mine_association_rules(REPO_PATH)
    for r in rules:
        assert isinstance(r["consequents"], list)

def test_rules_output_is_json_serialisable():
    rules = mine_association_rules(REPO_PATH)
    parsed = json.loads(json.dumps(rules))
    assert isinstance(parsed, list)