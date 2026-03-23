# MergeGuard — Architecture

## Overview

MergeGuard is a fully offline, open-source pre-merge intelligence system. It answers two questions before a PR lands on `main`:

1. **BlastRadius** — *What does this change structurally affect?*
2. **PostMortem** — *Has this file-change pattern caused bugs before?*

No cloud services. No API keys. One command to run.

---

## System Diagram

```
┌──────────────────────────────────────────────────────┐
│  INPUT                                               │
│  Local Git repo clone  +  PR branch / symbol name   │
└───────────────────┬──────────────────────────────────┘
                    │
          ┌─────────▼──────────┐
          │   FastAPI Backend  │  :8000
          │   api/main.py      │
          └──┬──────────────┬──┘
             │              │
    ┌────────▼────┐   ┌─────▼──────────┐
    │ BlastRadius │   │  PostMortem    │
    │  Engine     │   │  Engine        │
    │             │   │                │
    │ AST parser  │   │ GitPython mine │
    │ rope tracer │   │ Apriori rules  │
    │ BFS graph   │   │ Fingerprints   │
    │ risk scorer │   │                │
    └────────┬────┘   └─────┬──────────┘
             │              │
          ┌──▼──────────────▼──┐
          │  Ollama (local LLM)│
          │  deepseek-coder    │
          │  No API keys       │
          └──────────┬─────────┘
                     │  SSE stream
          ┌──────────▼─────────┐
          │  React Frontend    │  :5173
          │  D3.js force graph │
          │  Recharts timeline │
          │  LLM streaming     │
          │  Merge badge       │
          └────────────────────┘
```

---

## Component Ownership

| File | Owner | Purpose |
|------|-------|---------|
| `backend/engines/blast_radius.py` | Navin | AST parsing, BFS call graph, rope refinement, risk scoring |
| `backend/engines/coverage_overlay.py` | Navin | Maps `.coverage` line data onto symbol definitions |
| `backend/engines/post_mortem.py` | Armaan | Git commit mining, Apriori association rule mining |
| `backend/api/main.py` | Aayush | FastAPI routes, SSE streaming, Ollama integration |
| `backend/agents/langgraph_pipeline.py` | Aayush | LangGraph 3-agent orchestration |
| `frontend/src/components/BlastRadiusGraph.jsx` | Balaa | D3.js force-directed graph |
| `frontend/src/components/PostMortemTimeline.jsx` | Balaa | Recharts failure hotspot timeline |
| `frontend/src/components/LLMPanel.jsx` | Balaa | SSE-consuming streaming text panel |
| `frontend/src/components/MergeBadge.jsx` | Balaa | GREEN / YELLOW / RED verdict badge |

---

## BlastRadius Engine — Pipeline

```
Stage 1: ASTParser
  → ast.parse() every .py file
  → Extracts: function/class/method definitions, imports, call expressions
  → Flags dynamic imports (importlib.import_module) as unresolvable

Stage 2: RepositoryScanner
  → Walks repo_root, skips: venv/, .git/, __pycache__, node_modules
  → Converts paths to dotted module names (auth/utils.py → "auth.utils")

Stage 3: CallGraphTracer (BFS)
  → Pre-builds reverse import index: O(files) once, O(1) per BFS step
  → Depth 1 = direct_dependents, Depth 2+ = transitive_dependents
  → Circular import protection via visited set

Stage 3b: RopeCallSiteTracer (optional, use_rope=True)
  → Uses rope.contrib.findit.find_occurrences() for precise call-site lookup
  → Falls back gracefully if rope unavailable
  → Default: use_rope=False (keeps tests deterministic)

Stage 4: RiskScorer
  → score = 0.30*breadth + 0.25*depth + 0.35*coverage_gap + 0.10*core_penalty
  → Tiers: LOW (<0.25), MEDIUM (<0.50), HIGH (<0.75), CRITICAL (≥0.75)
```

### Risk Score Formula

| Component | Weight | Formula |
|-----------|--------|---------|
| breadth_score | 0.30 | `min(total_affected / 50, 1.0)` |
| depth_score | 0.25 | `min(max_edge_depth / 8, 1.0)` |
| coverage_gap | 0.35 | `uncovered_count / total_affected` |
| core_penalty | 0.10 | `1.0 if any module in {auth, db, api, middleware, security, core}` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| POST | `/api/blast-radius` | Run BlastRadius, return D3-ready nodes/edges |
| POST | `/api/postmortem` | Run PostMortem, return fingerprint matches |
| POST | `/api/analyze/stream` | SSE stream — runs both engines then streams LLM tokens |
| POST | `/api/recommendation` | Synchronous verdict (GREEN/YELLOW/RED) |

### Request body

```json
{
  "repo_path": "/absolute/path/to/local/git/repo",
  "base_branch": "main",
  "pr_branch": "module.symbol.name"
}
```

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Ollama (needed for LLM endpoints)
ollama pull deepseek-coder
ollama serve

# Tests
cd backend
pytest tests/test_blast_radius.py tests/test_coverage_overlay.py -v
```

## Running with Docker

```bash
# Pull model once
docker run --rm ollama/ollama pull deepseek-coder

# Start everything
docker compose up --build

# Frontend: http://localhost:5173
# Backend docs: http://localhost:8000/docs
```