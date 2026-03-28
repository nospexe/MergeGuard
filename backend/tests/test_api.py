"""Comprehensive test suite for MergeGuard API.

Tests cover: accuracy, security, efficiency, and edge cases.
"""
import time


# ── Health ──

def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == "0.2.0"


def test_health_speed(client):
    """Health check should respond in under 100ms."""
    start = time.time()
    response = client.get("/health")
    elapsed = time.time() - start
    assert response.status_code == 200
    assert elapsed < 0.1, f"Health check took {elapsed:.3f}s"


# ── Security: Input Validation ──

def test_blast_radius_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/blast-radius", json=invalid_request)
    assert response.status_code == 400


def test_postmortem_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/postmortem", json=invalid_request)
    assert response.status_code == 400


def test_recommendation_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/recommendation", json=invalid_request)
    assert response.status_code == 400


def test_rejects_empty_repo_path(client):
    """Empty repo_path should be rejected by pydantic validator."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_empty_branch(client):
    """Empty branch name should be rejected."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/test",
        "base_branch": "",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_path_traversal(client):
    """Path traversal attempts with .. should be blocked."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/../../../etc/passwd",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code in [400, 422]


def test_rejects_shell_injection_semicolon(client):
    """Shell injection via semicolons should be blocked."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/repo; rm -rf /",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_shell_injection_pipe(client):
    """Shell injection via pipe should be blocked."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/repo | cat /etc/passwd",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_shell_injection_backtick(client):
    """Shell injection via backtick command substitution should be blocked."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/repo`whoami`",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_shell_injection_dollar(client):
    """Shell injection via $(command) should be blocked."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/repo$(cat /etc/passwd)",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_newline_in_path(client):
    """Newlines in repo_path should be blocked to prevent header injection."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/repo\n/etc/passwd",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_tilde_path(client):
    """Tilde expansion should be blocked."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "~/../../etc/passwd",
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code in [400, 422]


def test_rejects_too_long_path(client):
    """Excessively long paths should be rejected."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/" + "a" * 600,
        "base_branch": "main",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_invalid_branch_chars(client):
    """Branch names with shell-dangerous characters should be rejected."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/test",
        "base_branch": "main; rm -rf /",
        "pr_branch": "dev"
    })
    assert response.status_code == 422


def test_rejects_missing_pr_branch(client):
    """Missing pr_branch field should be rejected."""
    response = client.post("/api/blast-radius", json={
        "repo_path": "/tmp/test",
        "base_branch": "main"
    })
    assert response.status_code == 422


# ── Security: Response Headers ──

def test_security_headers_present(client):
    """Responses should include security headers."""
    response = client.get("/health")
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("x-xss-protection") == "1; mode=block"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"


# ── Security: Method restrictions ──

def test_put_method_not_allowed(client):
    """PUT should not be allowed on API endpoints."""
    response = client.put("/api/blast-radius", json={})
    assert response.status_code == 405


def test_delete_method_not_allowed(client):
    """DELETE should not be allowed on API endpoints."""
    response = client.delete("/api/blast-radius")
    assert response.status_code == 405


# ── Accuracy: Blast Radius ──

def test_blast_radius_returns_correct_shape(client, valid_request):
    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    body = response.json()
    assert "nodes" in body
    assert "edges" in body
    assert "risk_score" in body
    assert "risk_level" in body
    assert "overall_coverage" in body


def test_blast_radius_node_has_required_fields(client, valid_request):
    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    nodes = response.json()["nodes"]
    for node in nodes:
        assert "id" in node
        assert "file" in node
        assert "symbol" in node
        assert "coverage_status" in node
        assert "ring" in node
        assert "coverage" in node
        assert "functions" in node


def test_blast_radius_risk_level_is_valid(client, valid_request):
    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    risk_level = response.json()["risk_level"]
    assert risk_level in ["low", "medium", "high"]


def test_blast_radius_risk_score_is_normalised(client, valid_request):
    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    score = response.json()["risk_score"]
    assert isinstance(score, float)
    assert 0.0 <= score <= 1.0


def test_blast_radius_coverage_is_valid(client, valid_request):
    """Overall coverage should be a valid percentage."""
    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    coverage = response.json()["overall_coverage"]
    assert isinstance(coverage, (int, float))
    assert 0.0 <= coverage <= 100.0


def test_blast_radius_rings_are_ordered(client, valid_request):
    """Ring values should be 0, 1, or 2."""
    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    for node in response.json()["nodes"]:
        assert node["ring"] in [0, 1, 2]


# ── Accuracy: PostMortem ──

def test_postmortem_returns_correct_shape(client, valid_request):
    response = client.post("/api/postmortem", json=valid_request)
    assert response.status_code == 200

    body = response.json()
    assert "matches" in body
    assert "top_risk_files" in body
    assert isinstance(body["matches"], list)
    assert isinstance(body["top_risk_files"], list)


def test_postmortem_match_has_required_fields(client, valid_request):
    response = client.post("/api/postmortem", json=valid_request)
    assert response.status_code == 200

    matches = response.json()["matches"]
    for match in matches:
        assert "pattern_id" in match
        assert "files" in match
        assert "support" in match
        assert "confidence" in match
        assert "evidence_commits" in match


def test_postmortem_confidence_is_normalised(client, valid_request):
    response = client.post("/api/postmortem", json=valid_request)
    assert response.status_code == 200

    matches = response.json()["matches"]
    for match in matches:
        assert 0.0 <= match["confidence"] <= 1.0


def test_postmortem_top_risk_files_capped(client, valid_request):
    """top_risk_files should never exceed 5 entries."""
    response = client.post("/api/postmortem", json=valid_request)
    assert response.status_code == 200
    assert len(response.json()["top_risk_files"]) <= 5


# ── Accuracy: Recommendation ──

def test_recommendation_returns_correct_shape(client, valid_request):
    response = client.post("/api/recommendation", json=valid_request)
    assert response.status_code == 200

    body = response.json()
    assert "verdict" in body
    assert "summary" in body
    assert "blast_risk" in body
    assert "pattern_risk" in body


def test_recommendation_verdict_is_valid(client, valid_request):
    response = client.post("/api/recommendation", json=valid_request)
    assert response.status_code == 200

    verdict = response.json()["verdict"]
    assert verdict in ["GREEN", "YELLOW", "RED"]


# ── Efficiency: Speed Tests ──

def test_blast_radius_speed(client, valid_request):
    """Blast radius analysis on small repo should complete under 5s."""
    start = time.time()
    response = client.post("/api/blast-radius", json=valid_request)
    elapsed = time.time() - start
    assert response.status_code == 200
    assert elapsed < 5.0, f"Blast radius took {elapsed:.2f}s"


def test_postmortem_speed(client, valid_request):
    """PostMortem analysis on small repo should complete under 5s."""
    start = time.time()
    response = client.post("/api/postmortem", json=valid_request)
    elapsed = time.time() - start
    assert response.status_code == 200
    assert elapsed < 5.0, f"PostMortem took {elapsed:.2f}s"


# ── Streaming ──

def test_stream_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/analyze/stream", json=invalid_request)
    assert response.status_code == 400


def test_stream_returns_event_stream_content_type(client, valid_request):
    with client.stream("POST", "/api/analyze/stream", json=valid_request) as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]


def test_stream_produces_done_sentinel(client, valid_request):
    with client.stream("POST", "/api/analyze/stream", json=valid_request) as response:
        chunks = list(response.iter_lines())

    done_lines = [c for c in chunks if "[DONE]" in c]
    assert len(done_lines) >= 1


# ── Edge Cases ──

def test_nonexistent_endpoint_returns_404(client):
    """Unknown endpoints should return 404."""
    response = client.get("/api/nonexistent")
    assert response.status_code in [404, 405]


def test_malformed_json_returns_422(client):
    """Completely invalid JSON body should be rejected."""
    response = client.post(
        "/api/blast-radius",
        content=b"not json",
        headers={"content-type": "application/json"}
    )
    assert response.status_code == 422
