import git
from pathlib import Path


def classify_commit(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["fix", "bug", "patch", "error", "issue"]):
        return "bug-fix"
    elif any(w in msg for w in ["refactor", "cleanup", "rename", "move"]):
        return "refactor"
    else:
        return "feature"


def mine_commits(repo_path: str) -> list[dict]:
    repo = git.Repo(repo_path)
    commits = []

    for commit in repo.iter_commits("HEAD", max_count=500):
        changed_files = list(commit.stats.files.keys())
        commits.append({
            "sha": commit.hexsha[:8],
            "message": commit.message.strip(),
            "type": classify_commit(commit.message),
            "files": changed_files,
            "date": commit.committed_datetime.isoformat(),
        })

    return commits


if __name__ == "__main__":
    import json
    results = mine_commits(".")
    print(json.dumps(results[:5], indent=2))