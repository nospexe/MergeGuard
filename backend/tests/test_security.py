"""Security-focused tests for path_validator module."""
import os
import pytest
from utils.path_validator import (
    is_github_url,
    validate_repo_path,
    resolve_repo_path,
    sanitize_clone_path,
)


class TestGitHubURLValidation:
    """Test GitHub URL detection and sanitization."""

    def test_valid_github_https(self):
        assert is_github_url("https://github.com/owner/repo") is True

    def test_valid_github_https_with_git(self):
        assert is_github_url("https://github.com/owner/repo.git") is True

    def test_rejects_ssh_url(self):
        assert is_github_url("git@github.com:owner/repo.git") is False

    def test_rejects_gitlab_url(self):
        assert is_github_url("https://gitlab.com/owner/repo") is False

    def test_rejects_arbitrary_url(self):
        assert is_github_url("https://evil.com/hack") is False

    def test_rejects_empty(self):
        assert is_github_url("") is False

    def test_rejects_local_path(self):
        assert is_github_url("/tmp/repo") is False

    def test_rejects_javascript_injection(self):
        assert is_github_url("javascript:alert(1)") is False

    def test_rejects_ftp(self):
        assert is_github_url("ftp://github.com/owner/repo") is False

    def test_sanitize_clone_path_safe(self):
        """sanitize_clone_path should strip dangerous chars from path."""
        path = sanitize_clone_path("https://github.com/owner/repo")
        assert ".." not in str(path)
        assert ";" not in str(path)
        assert "|" not in str(path)

    def test_sanitize_clone_path_with_special_chars(self):
        """Even unusual GitHub repo names should produce safe paths."""
        path = sanitize_clone_path("https://github.com/my-org/my-repo.js")
        assert ".." not in str(path)


class TestPathTraversal:
    """Test path traversal attack prevention."""

    def test_rejects_dotdot_simple(self):
        ok, msg = validate_repo_path("../../etc/passwd")
        assert ok is False
        assert "traversal" in msg.lower()

    def test_rejects_dotdot_embedded(self):
        ok, msg = validate_repo_path("/tmp/repo/../../../etc/passwd")
        assert ok is False
        assert "traversal" in msg.lower()

    def test_rejects_tilde(self):
        ok, msg = validate_repo_path("~/sensitive")
        assert ok is False
        assert "traversal" in msg.lower()


class TestSystemDirBlocking:
    """Test that system-critical dirs are blocked."""

    @pytest.mark.parametrize("sys_dir", ["/etc", "/etc/ssh", "/var/log", "/usr/bin", "/root"])
    def test_rejects_system_dirs(self, sys_dir):
        ok, msg = validate_repo_path(sys_dir)
        assert ok is False
        # Either doesn't exist or is blocked
        assert not ok


class TestSymlinkProtection:
    """Test that symlinks are not followed."""

    def test_rejects_symlink(self, tmp_path):
        target_dir = tmp_path / "real"
        target_dir.mkdir()
        link = tmp_path / "link"
        link.symlink_to(target_dir)

        ok, msg = validate_repo_path(str(link))
        assert ok is False
        assert "symlink" in msg.lower() or "symbolic" in msg.lower()


class TestResolveRepoPath:
    """Test the unified resolve_repo_path function."""

    def test_valid_local_path(self, tmp_path):
        """A non-git directory should still fail (need valid git repo)."""
        ok, error, path = resolve_repo_path(str(tmp_path))
        # tmp_path exists but is not a git repo
        assert ok is False
        assert "not a valid git" in error.lower()

    def test_nonexistent_path(self):
        ok, error, path = resolve_repo_path("/this/does/not/exist")
        assert ok is False

    def test_strips_whitespace(self):
        ok, error, path = resolve_repo_path("  /nonexistent  ")
        assert ok is False
        # Should not crash from whitespace
