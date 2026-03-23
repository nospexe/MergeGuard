
def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == "0.1.0"


def test_blast_radius_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/blast-radius", json=invalid_request)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]

def test_postmortem_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/postmortem", json=invalid_request)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]

def test_recommendation_rejects_invalid_path(client, invalid_request):
    response = client.post("/api/recommendation", json=invalid_request)
    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]



def test_blast_radius_returns_correct_shape(client, valid_request):

    response = client.post("/api/blast-radius", json=valid_request)
    assert response.status_code == 200

    body = response.json()
    assert "nodes" in body
    assert "edges" in body
    assert "risk_score" in body
    assert "risk_level" in body


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

