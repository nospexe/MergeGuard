import json
import logging
from db.convex_client import client

logger = logging.getLogger(__name__)

def get_all_fingerprints(repo_path: str = None) -> list[dict]:
    """Retrieve all fingerprints, optionally filtered by repo, from Convex."""
    if client is None:
        logger.warning("Convex client not configured — fingerprint queries will return empty")
        return []
    if repo_path:
        fingerprints = client.query("fingerprints:list", {"repoPath": repo_path})
    else:
        fingerprints = client.query("fingerprints:list")
    
    # Map back to the expected Python dict format for the engine
    return [
        {
            "id": fp["_id"],
            "antecedents": fp.get("antecedents", []),
            "consequents": fp.get("consequents", []),
            "support": fp["support"],
            "confidence": fp["confidence"],
            "lift": fp.get("lift", 0.0), # Lift is optional right now
            "repo_path": fp.get("repoPath", repo_path),
            "created_at": fp["_creationTime"],
        }
        for fp in fingerprints
    ]


def save_fingerprints(rules: list[dict], repo_path: str):
    """Save a list of association rules to the Convex database.

    Raises ValueError if repo_path is None or empty.
    """
    if not repo_path:
        raise ValueError(
            "repo_path is required for saving fingerprints — "
            "cannot store rules without a known repository path"
        )

    if client is None:
        logger.warning(
            "Convex client not configured — %d fingerprints will NOT be persisted for %s",
            len(rules), repo_path,
        )
        return

    saved = 0
    for rule in rules:
        antecedents_str = json.dumps(rule.get("antecedents", []))
        pattern_id = f"pattern-{hash(f'{repo_path}-{antecedents_str}')}"
        try:
            client.mutation("fingerprints:create", {
                "patternId": rule.get("patternId", pattern_id),
                "repoPath": repo_path,
                "filesInvolved": rule.get("antecedents", []) + rule.get("consequents", []),
                "antecedents": rule.get("antecedents", []),
                "consequents": rule.get("consequents", []),
                "support": rule.get("support", 0.0),
                "confidence": rule.get("confidence", 0.0),
                "lift": rule.get("lift", 0.0),
                "evidenceCommits": [],
                "timestampRange": {"start": 0, "end": 0}
            })
            saved += 1
        except Exception as exc:
            logger.error("Failed to save fingerprint %s: %s", pattern_id, exc)

    logger.info("Saved %d/%d fingerprints for %s", saved, len(rules), repo_path)


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
    
    # Lift isn't standard in Convex right now but handling gracefully
    max_lift = max(fp.get("lift", 0) for fp in matched)

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