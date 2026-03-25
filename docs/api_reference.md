# MergeGuard API Reference

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

---

## GET /health

Liveness probe. Returns 200 if the backend is running.

**Response**
```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

---

## POST /api/blast-radius

Run the BlastRadius engine on a repository and branch.

**Request Body**
```json
{
  "repo_path": "/path/to/local/repo",
  "base_branch": "main",
  "pr_branch": "feature/auth-refactor"
}
```

**Response**
```json
{
  "nodes": [
    {
      "id": "n0",
      "file": "auth/utils.py",
      "symbol": "utils",
      "coverage_status": "covered",
      "ring": 0
    }
  ],
  "edges": [
    { "source": "n0", "target": "n1" }
  ],
  "risk_score": 0.42,
  "risk_level": "medium"
}
```

**Ring values:**
- `0` — the changed file itself
- `1` — direct dependents
- `2` — transitive dependents

**Coverage status values:**
- `covered` — fully covered by tests
- `partial` — partially covered
- `uncovered` — no test coverage

---

## POST /api/postmortem

Run the PostMortem engine to find historical failure patterns.

**Request Body**
```json
{
  "repo_path": "/path/to/local/repo",
  "base_branch": "main",
  "pr_branch": "feature/auth-refactor"
}
```

**Response**
```json
{
  "matches": [
    {
      "pattern_id": "FP-001",
      "files": ["auth/utils.py", "auth/middleware.py"],
      "support": 12,
      "confidence": 0.78,
      "evidence_commits": []
    }
  ],
  "top_risk_files": ["auth/utils.py", "api/routes.py"]
}
```

---

## POST /api/analyze/stream

Run both engines and stream the LangGraph recommendation via SSE.

**Request Body**
```json
{
  "repo_path": "/path/to/local/repo",
  "base_branch": "main",
  "pr_branch": "feature/auth-refactor"
}
```

**Response** — `text/event-stream`
```
data: [Agent 1] Analysing blast radius...

data: [Agent 1 complete]

data: [Agent 2] Analysing historical patterns...

data: [Agent 2 complete]

data: [Agent 3] Generating recommendation...

data: VERDICT: YELLOW

data: SUMMARY: The change affects 14 downstream modules...

data: [DONE]
```

**Frontend usage:**
```javascript
const source = new EventSource('/api/analyze/stream');
source.onmessage = (event) => {
  if (event.data === '[DONE]') { source.close(); return; }
  setOutput(prev => prev + event.data);
};
```

---

## POST /api/recommendation

Get a synchronous (non-streaming) merge recommendation.

**Request Body**
```json
{
  "repo_path": "/path/to/local/repo",
  "base_branch": "main",
  "pr_branch": "feature/auth-refactor"
}
```

**Response**
```json
{
  "verdict": "YELLOW",
  "summary": "The PR affects 14 downstream modules with partial coverage. Historical patterns show auth and middleware files have co-failed 8 times in the last 3 months.",
  "blast_risk": "14 modules affected, 3 uncovered nodes in the blast radius.",
  "pattern_risk": "auth/utils.py and auth/middleware.py have co-failed with 78% confidence historically."
}
```

**Verdict values:**
- `GREEN` — safe to merge
- `YELLOW` — review recommended
- `RED` — do not merge