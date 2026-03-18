import sqlite3
import json
from pathlib import Path


DB_PATH = Path(__file__).parent / "fingerprints.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the fingerprints table if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS fingerprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            antecedents TEXT NOT NULL,
            consequents TEXT NOT NULL,
            support REAL NOT NULL,
            confidence REAL NOT NULL,
            lift REAL NOT NULL,
            repo_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


def save_fingerprints(rules: list[dict], repo_path: str):
    """Save a list of association rules to the database."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    for rule in rules:
        cursor.execute("""
            INSERT INTO fingerprints (antecedents, consequents, support, confidence, lift, repo_path)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            json.dumps(rule["antecedents"]),
            json.dumps(rule["consequents"]),
            rule["support"],
            rule["confidence"],
            rule["lift"],
            repo_path,
        ))

    conn.commit()
    conn.close()


def get_all_fingerprints(repo_path: str = None) -> list[dict]:
    """Retrieve all fingerprints, optionally filtered by repo."""
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    if repo_path:
        cursor.execute("SELECT * FROM fingerprints WHERE repo_path = ?", (repo_path,))
    else:
        cursor.execute("SELECT * FROM fingerprints")

    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "id": row["id"],
            "antecedents": json.loads(row["antecedents"]),
            "consequents": json.loads(row["consequents"]),
            "support": row["support"],
            "confidence": row["confidence"],
            "lift": row["lift"],
            "repo_path": row["repo_path"],
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def match_pr(changed_files: list[str], repo_path: str = None) -> dict:
    """
    Given a list of changed files in a PR, find matching fingerprints.
    Returns a risk assessment based on historical patterns.
    """
    fingerprints = get_all_fingerprints(repo_path)
    matched = []

    for fp in fingerprints:
        antecedent_set = set(fp["antecedents"])
        changed_set = set(changed_files)

        if antecedent_set.issubset(changed_set):
            matched.append(fp)

    matched.sort(key=lambda x: x["confidence"], reverse=True)
    risk_tier = _calculate_risk_tier(matched)

    return {
        "matched": len(matched) > 0,
        "risk_tier": risk_tier,
        "matching_fingerprints": matched[:10],
        "summary": _generate_summary(matched, risk_tier),
    }


def _calculate_risk_tier(matched: list[dict]) -> str:
    """Calculate risk tier based on matched fingerprints."""
    if not matched:
        return "LOW"

    max_confidence = max(fp["confidence"] for fp in matched)
    max_lift = max(fp["lift"] for fp in matched)

    if max_confidence >= 0.8 or max_lift >= 3.0:
        return "HIGH"
    elif max_confidence >= 0.5 or max_lift >= 2.0:
        return "MEDIUM"
    else:
        return "LOW"


def _generate_summary(matched: list[dict], risk_tier: str) -> str:
    """Generate a human readable summary of the match results."""
    if not matched:
        return "No historical patterns matched. This PR appears low risk."

    top = matched[0]
    confidence_pct = int(top["confidence"] * 100)

    return (
        f"Found {len(matched)} matching historical pattern(s). "
        f"Top match shows these files have caused issues together "
        f"{confidence_pct}% of the time. Risk level: {risk_tier}."
    )


if __name__ == "__main__":
    init_db()
    print("DB initialised at:", DB_PATH)

    sample_rules = [
        {
            "antecedents": ["backend/api/main.py"],
            "consequents": ["backend/engines/post_mortem.py"],
            "support": 0.15,
            "confidence": 0.75,
            "lift": 2.5,
        }
    ]

    save_fingerprints(sample_rules, "./demo/repos/django")
    print("Saved sample fingerprints.")

    result = match_pr(["backend/api/main.py"], "./demo/repos/django")
    print(json.dumps(result, indent=2))