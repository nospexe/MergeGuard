"""Tests for utils/path_validator.py — covers GitHub URL detection, clone logic, and resolve_repo_path."""
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from utils.path_validator import (
    is_github_url,
    sanitize_clone_path,
    clone_github_repo,
    validate_repo_path,
    resolve_repo_path,
    CLONE_DIR,
)


# ── is_github_url ──

@pytest.mark.parametrize("url,expected", [
    ("https://github.com/owner/repo", True),
    ("https://github.com/owner/repo.git", True),
    ("http://github.com/owner/repo", True),
    ("https://github.com/owner-name/repo.name", True),
    ("https://gitlab.com/owner/repo", False),
    ("not-a-url", False),
    ("", False),
    ("https://github.com/owner/repo/extra/path", False),
])
def test_is_github_url(url, expected):
    assert is_github_url(url) is expected


# ── sanitize_clone_path ──

def test_sanitize_clone_path_basic():
    path = sanitize_clone_path("https://github.com/myorg/myrepo")
    assert path == CLONE_DIR / "myorg__myrepo"


def test_sanitize_clone_path_dotgit():
    path = sanitize_clone_path("https://github.com/owner/repo.git")
    assert "repo" in path.name
    assert ".git" not in path.name


def test_sanitize_special_chars():
    """Special characters get replaced with underscores."""
    path = sanitize_clone_path("https://github.com/my@org/my$repo")
    assert "@" not in path.name
    assert "$" not in path.name


# ── clone_github_repo ──

def test_clone_rejects_invalid_url():
    ok, err, local = clone_github_repo("not-a-url")
    assert ok is False
    assert "Invalid GitHub URL" in err
    assert local == ""


@patch("utils.path_validator.Repo")
def test_clone_reuses_cached(mock_repo, tmp_path, monkeypatch):
    """When a valid cached clone exists, should fetch and reuse."""
    monkeypatch.setattr("utils.path_validator.CLONE_DIR", tmp_path)
    cached_dir = tmp_path / "owner__repo"
    cached_dir.mkdir()

    # First call checks validity, second creates for fetch
    mock_instance = MagicMock()
    mock_repo.return_value = mock_instance

    ok, err, local = clone_github_repo("https://github.com/owner/repo")
    assert ok is True
    assert err == ""
    assert local == str(cached_dir)


@patch("utils.path_validator.Repo")
def test_clone_fresh(mock_repo, tmp_path, monkeypatch):
    """When no cached clone exists, should clone fresh."""
    monkeypatch.setattr("utils.path_validator.CLONE_DIR", tmp_path)
    ok, err, local = clone_github_repo("https://github.com/owner/repo")
    assert ok is True
    mock_repo.clone_from.assert_called_once()


@patch("utils.path_validator.Repo")
def test_clone_failure(mock_repo, tmp_path, monkeypatch):
    """If cloning fails, should return error and clean up."""
    monkeypatch.setattr("utils.path_validator.CLONE_DIR", tmp_path)
    mock_repo.clone_from.side_effect = Exception("network error")
    ok, err, local = clone_github_repo("https://github.com/owner/repo")
    assert ok is False
    assert "Failed to clone" in err


# ── validate_repo_path (additional coverage) ──

def test_validate_rejects_non_directory(tmp_path):
    f = tmp_path / "file.txt"
    f.write_text("test")
    ok, err = validate_repo_path(str(f))
    assert ok is False
    assert "not a directory" in err


def test_validate_rejects_nonexistent():
    ok, err = validate_repo_path("/no/such/path/anywhere")
    assert ok is False
    assert "does not exist" in err


def test_validate_valid_git_repo(tmp_path):
    """A real Git repo should pass validation."""
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    ok, err = validate_repo_path(str(tmp_path))
    assert ok is True
    assert err == ""


def test_validate_non_git_dir(tmp_path):
    """A plain directory that is not a Git repo should fail."""
    ok, err = validate_repo_path(str(tmp_path))
    assert ok is False
    assert "Not a valid Git" in err


# ── resolve_repo_path ──

def test_resolve_local_valid(tmp_path):
    subprocess.run(["git", "init"], cwd=tmp_path, check=True, capture_output=True)
    ok, err, path = resolve_repo_path(str(tmp_path))
    assert ok is True
    assert path == str(tmp_path)


def test_resolve_local_invalid():
    ok, err, path = resolve_repo_path("/no/such/path")
    assert ok is False
    assert path == ""


@patch("utils.path_validator.clone_github_repo")
def test_resolve_github_url(mock_clone):
    mock_clone.return_value = (True, "", "/tmp/clone")
    ok, err, path = resolve_repo_path("https://github.com/owner/repo")
    assert ok is True
    assert path == "/tmp/clone"
    mock_clone.assert_called_once()
