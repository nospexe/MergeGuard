import os
import re
import shutil
import tempfile
import logging
from pathlib import Path

from git import Repo, InvalidGitRepositoryError, NoSuchPathError

logger = logging.getLogger(__name__)

CLONE_DIR = Path(tempfile.gettempdir()) / "mergeguard_repos"
MAX_REPO_SIZE_MB = 500
GITHUB_URL_PATTERN = re.compile(
    r"^https?://github\.com/[\w.\-]+/[\w.\-]+(?:\.git)?$"
)


def is_github_url(repo_input: str) -> bool:
    """Check if the input looks like a GitHub URL."""
    return bool(GITHUB_URL_PATTERN.match(repo_input.strip()))


def sanitize_clone_path(url: str) -> Path:
    """Derive a safe local directory name from a GitHub URL."""
    parts = url.rstrip("/").rstrip(".git").split("/")
    owner = re.sub(r"[^a-zA-Z0-9_\-.]", "_", parts[-2])
    repo = re.sub(r"[^a-zA-Z0-9_\-.]", "_", parts[-1])
    return CLONE_DIR / f"{owner}__{repo}"


def clone_github_repo(url: str) -> tuple[bool, str, str]:
    """Clone a GitHub repo to a temp directory.

    Returns (success, error_message, local_path).
    """
    url = url.strip()
    if not is_github_url(url):
        return False, "Invalid GitHub URL format. Expected: https://github.com/owner/repo", ""

    clone_path = sanitize_clone_path(url)

    # Reuse existing clone if present and valid
    if clone_path.exists():
        try:
            Repo(str(clone_path))
            logger.info("Reusing cached clone at %s", clone_path)
            # Pull latest
            repo = Repo(str(clone_path))
            repo.remotes.origin.fetch()
            return True, "", str(clone_path)
        except (InvalidGitRepositoryError, Exception):
            shutil.rmtree(clone_path, ignore_errors=True)

    CLONE_DIR.mkdir(parents=True, exist_ok=True)

    try:
        logger.info("Cloning %s -> %s", url, clone_path)
        Repo.clone_from(
            url,
            str(clone_path),
            depth=200,  # shallow clone for speed, enough for postmortem
            no_single_branch=True,
        )
        return True, "", str(clone_path)
    except Exception as e:
        shutil.rmtree(clone_path, ignore_errors=True)
        return False, f"Failed to clone repository: {str(e)}", ""


def validate_repo_path(repo_path: str) -> tuple[bool, str]:
    """Validate that the given path is a valid Git repository.

    Blocks path traversal, symlink attacks, null bytes, and
    various OS-specific evasion techniques.
    """
    # Normalise whitespace
    repo_path = repo_path.strip()

    # Block null bytes — can confuse C-based path resolution
    if "\x00" in repo_path:
        return False, "Path contains null bytes"

    # Block URL-encoded traversal (%2e = '.', %2f = '/', %5c = '\\')
    normalised_for_check = repo_path.replace("%2e", ".").replace("%2E", ".")
    normalised_for_check = normalised_for_check.replace("%2f", "/").replace("%2F", "/")
    normalised_for_check = normalised_for_check.replace("%5c", "\\").replace("%5C", "\\")

    # Block path traversal — Unix (..) and Windows (..\)
    if ".." in normalised_for_check or repo_path.startswith("~"):
        return False, "Path traversal not allowed"

    path = Path(repo_path)

    # Block symlink following to prevent access to unintended directories
    if path.is_symlink():
        return False, "Symbolic links are not allowed"

    if not path.exists():
        return False, f"Path does not exist: '{repo_path}'"

    if not path.is_dir():
        return False, f"Path is not a directory: '{repo_path}'"

    # Block access to sensitive system directories (Unix + Windows)
    resolved = path.resolve()
    resolved_str = str(resolved)
    blocked_unix = [Path("/etc"), Path("/var"), Path("/usr"), Path("/root"), Path("/sys")]
    blocked_win  = ["C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"]
    for b in blocked_unix:
        if resolved_str.startswith(str(b)):
            return False, f"Access to system directory not allowed: '{repo_path}'"
    for b in blocked_win:
        if resolved_str.lower().startswith(b.lower()):
            return False, f"Access to system directory not allowed: '{repo_path}'"

    try:
        Repo(repo_path)
        return True, ""

    except InvalidGitRepositoryError:
        return False, f"Not a valid Git repository: '{repo_path}'"

    except NoSuchPathError:
        return False, f"Path does not exist: '{repo_path}'"

    except Exception as e:
        return False, f"Unexpected error reading repository: {str(e)}"


def resolve_repo_path(repo_input: str) -> tuple[bool, str, str]:
    """Resolve a repo input which can be a local path or GitHub URL.

    Returns (success, error_message, resolved_local_path).
    """
    repo_input = repo_input.strip()

    if is_github_url(repo_input):
        return clone_github_repo(repo_input)

    is_valid, error = validate_repo_path(repo_input)
    if not is_valid:
        return False, error, ""

    return True, "", repo_input