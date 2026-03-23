from pathlib import Path
from git import Repo, InvalidGitRepositoryError, NoSuchPathError


def validate_repo_path(repo_path: str) -> tuple[bool, str]:

    path = Path(repo_path)

    if not path.exists():
        return False, f"Path does not exist: '{repo_path}'"


    if not path.is_dir():
        return False, f"Path is not a directory: '{repo_path}'"


    try:
        Repo(repo_path)
        return True, ""

    except InvalidGitRepositoryError:
        return False, f"Not a valid Git repository: '{repo_path}'"

    except NoSuchPathError:
        return False, f"Path does not exist: '{repo_path}'"

    except Exception as e:
        return False, f"Unexpected error reading repository: {str(e)}"  