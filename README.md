# MergeGuard v0.2.0

**Pre-merge intelligence for engineering teams.** MergeGuard analyses pull requests before they land — surfacing blast radius, historical failure patterns, and AI-powered merge recommendations — so you know what will break before you merge.

> 🔓 **Open Source** — MIT licensed. All analysis runs locally. No data leaves your machine.

[![CI](https://github.com/nospexe/MergeGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/nospexe/MergeGuard/actions/workflows/ci.yml)
[![Coverage](https://github.com/nospexe/MergeGuard/actions/workflows/coverage.yml/badge.svg)](https://github.com/nospexe/MergeGuard/actions/workflows/coverage.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Features

| Engine | What it does |
|--------|-------------|
| **Blast Radius** | Symbol-level dependency analysis — traces every changed function through the import graph to find affected modules |
| **PostMortem** | Mines historical commit patterns using association rules to surface files that tend to break together |
| **LLM Reasoning** | Local Ollama-powered analysis that explains risks and recommends whether to merge, gate, or block |
| **Coverage Overlay** | Maps test coverage onto the blast radius graph so uncovered risk zones are immediately visible |

### Works with GitHub URLs

Paste any public GitHub repo URL directly into the dashboard — MergeGuard will clone it, analyse it, and show results. No local setup required for the repo you want to analyse.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git
- [Ollama](https://ollama.ai) (optional, for LLM reasoning)

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m api.main
# API running at http://localhost:8000
```

### Frontend

```bash
cd app-frontend
npm install
npm run dev
# Frontend running at http://localhost:3000
```

Open **http://localhost:3000** → paste a GitHub URL → select branches → run analysis.

---

## Architecture

```
MergeGuard/
├── backend/
│   ├── api/main.py              # FastAPI endpoints with security middleware
│   ├── engines/
│   │   ├── blast_radius.py      # Symbol-level import graph analysis
│   │   ├── post_mortem.py       # Association rule mining on commit history
│   │   └── coverage_overlay.py  # Test coverage annotation layer
│   ├── agents/
│   │   └── langgraph_pipeline.py # LLM reasoning pipeline (Ollama)
│   ├── db/
│   │   └── fingerprint_store.py  # SQLite fingerprint persistence
│   └── utils/
│       └── path_validator.py     # GitHub URL cloning + path security
├── app-frontend/                 # Next.js 14 (App Router) + Tailwind
│   ├── app/                      # Pages: landing, dashboard, blast-radius, postmortem, settings
│   ├── components/               # Shared (GlassCard, Badge, Button) + Layout + Dashboard
│   └── lib/                      # API client, types, utilities
├── demo/                         # Sample diffs and precomputed results
└── docs/                         # Architecture documentation
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/blast-radius` | Analyse symbol-level impact |
| `POST` | `/api/postmortem` | Mine historical failure patterns |
| `POST` | `/api/recommendation` | Get AI merge/block recommendation |
| `POST` | `/api/analyze/stream` | Stream full analysis via SSE |

### Request Body

```json
{
  "repo_path": "https://github.com/owner/repo",
  "base_branch": "main",
  "pr_branch": "feature/my-change"
}
```

`repo_path` accepts either a **GitHub URL** or a **local filesystem path**.

---

## Security

- **Input validation**: Pydantic validators block shell injection, path traversal, and oversized inputs
- **Path security**: Symlinks, system directories (`/etc`, `/var`, `/usr`), and `..` traversal are blocked
- **GitHub URL whitelisting**: Only `https://github.com/` URLs are accepted for cloning
- **Response headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`
- **CORS**: Restricted to configured origins via `ALLOWED_ORIGINS` env var
- **Error handling**: Internal errors never leak stack traces to clients
- **No telemetry**: All analysis runs locally. No data leaves your machine.

---

## Testing

```bash
cd backend
PYTHONPATH=$(pwd) python -m pytest tests/ -v

# With coverage
coverage run --source=engines,agents,api,utils,db -m pytest tests/ -v
coverage report --show-missing
```

**233 tests** across 9 test suites:

| Suite | Tests | What's covered |
|-------|-------|---------------|
| API | 39 | Health, all endpoints, validation, security headers, methods, edge cases |
| Blast Radius | 47 | AST parser, scanner, BFS tracer, risk scorer, Rope integration |
| Coverage Overlay | 12 | Symbol annotation, file reader, full pipeline |
| PostMortem | 24 | Commit mining, association rules, table builder |
| Security | 18 | Shell injection, path traversal, symlink, system dirs, URL validation |
| Fingerprint Store | 14 | CRUD, risk tier, PR matching, summaries |
| Path Validator | 16 | GitHub URLs, cloning, local paths, resolve |
| LangGraph Pipeline | 12 | Prompt builders, agent fallbacks, verdict parsing |
| Pipeline Integration | 3 | Streaming, full pipeline, error handling |

Test coverage: **93%** (engines: 99%, agents: 93%, utils: 92%)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `deepseek-coder` | Model for LLM reasoning |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | CORS allowed origins |
| `MERGEGUARD_ENV` | — | Set to `production` to disable `/docs` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for frontend |

---

## License

MIT — see [LICENSE](LICENSE) for details.
