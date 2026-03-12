import subprocess
import pytest

from fastapi.testclient import TestClient
from api.main import app

@pytest.fixture
def client():
    """
    Returns a FastAPI TestClient wrapping the app.
    """
    return TestClient(app)

@pytest.fixture
def valid_repo(tmp_path):
    """
    Creates a temporary real Git repository for testing.

    We initialise a real Git repo inside it so path_validator
    passes and the engines have something to scan.
    """

    subprocess.run(["git", "init"], cwd=tmp_path, check=True)

    subprocess.run(
        ["git", "config", "user.email", "test@mergeguard.dev"],
        cwd=tmp_path, check=True
    )
    subprocess.run(
        ["git", "config", "user.name", "MergeGuard Test"],
        cwd=tmp_path, check=True
    )

    sample = tmp_path / "sample.py"
    sample.write_text(
        "def hello():\n"
        "    return 'hello'\n"
    )


    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(
        ["git", "commit", "-m", "fix: initial commit"],
        cwd=tmp_path, check=True
    )

    return tmp_path


@pytest.fixture
def valid_request(valid_repo):
    """
    Returns a dict representing a valid POST request body.
    """
    return {
        "repo_path": str(valid_repo),
        "base_branch": "main",
        "pr_branch": "sample.hello"   
    }



@pytest.fixture
def invalid_request():
    return {
        "repo_path": "/this/path/does/not/exist",
        "base_branch": "main",
        "pr_branch": "dev/feature"
    }