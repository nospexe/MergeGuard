import git
import json
from pathlib import Path
from mlxtend.frequent_patterns import apriori, association_rules
import pandas as pd


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


def build_transaction_table(commits: list[dict]) -> pd.DataFrame:
    all_files = set()
    for c in commits:
        all_files.update(c["files"])

    all_files = sorted(all_files)

    rows = []
    for c in commits:
        row = {f: (f in c["files"]) for f in all_files}
        rows.append(row)

    return pd.DataFrame(rows)


def mine_association_rules(repo_path: str, min_support=0.02, min_confidence=0.5):
    commits = mine_commits(repo_path)
    df = build_transaction_table(commits)

    frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True)

    if frequent_itemsets.empty:
        return []

    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)

    output = []
    for _, row in rules.iterrows():
        output.append({
            "antecedents": list(row["antecedents"]),
            "consequents": list(row["consequents"]),
            "support": round(row["support"], 4),
            "confidence": round(row["confidence"], 4),
            "lift": round(row["lift"], 4),
        })

    return output


if __name__ == "__main__":
    results = mine_commits(".")
    print(json.dumps(results[:5], indent=2))