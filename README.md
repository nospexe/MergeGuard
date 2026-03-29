# MergeGuard

**Pre-merge intelligence for engineering teams.** MergeGuard analyses pull requests before they land — surfacing blast radius, historical failure patterns, and AI-powered merge recommendations — so you know what will break before you merge.

> 🔓 **Open Source** — MIT licensed. Built for [FOSS Hack 2026](https://fossunited.org).
> 🚀 **Live Demo:** [mergeguard-frontend.vercel.app](https://mergeguard-frontend.vercel.app/)

[![CI](https://github.com/navinvishwa07/MergeGuard/actions/workflows/ci.yml/badge.svg)](https://github.com/navinvishwa07/MergeGuard/actions/workflows/ci.yml)
[![Coverage](https://github.com/navinvishwa07/MergeGuard/actions/workflows/coverage.yml/badge.svg)](https://github.com/navinvishwa07/MergeGuard/actions/workflows/coverage.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## How It Works

MergeGuard runs two independent analysis engines on your codebase, then feeds their outputs into a 3-agent LLM pipeline that produces a final **GREEN / YELLOW / RED** merge recommendation.

```
┌─────────────┐     ┌──────────────┐
│ BlastRadius │     │  PostMortem  │
│ (Spatial)   │     │ (Temporal)   │
└──────┬──────┘     └──────┬───────┘
       │                   │
       ▼                   ▼
 ┌───────────────────────────────┐
 │   3-Agent LLM Pipeline       │
 │  ┌─────────┐  ┌───────────┐  │
 │  │ Agent 1 │→ │  Agent 2  │  │
 │  │ Blast   │  │  Pattern  │  │
 │  │ Interp. │  │  Explain. │  │
 │  └────┬────┘  └─────┬─────┘  │
 │       └──────┬──────┘        │
 │         ┌────▼────┐          │
 │         │ Agent 3 │          │
 │         │ Orchest.│          │
 │         └─────────┘          │
 └───────────────────────────────┘
              │
    ┌─────────▼─────────┐
    │ GREEN/YELLOW/RED  │
    │ + Action Items    │
    └───────────────────┘
```

---

## Features

| Engine | What it does |
|--------|-------------|
| **BlastRadius** | Symbol-level dependency analysis — parses Python AST, traces every changed function through the import graph using BFS, and maps affected modules across concentric rings (direct → transitive → extended) |
| **PostMortem** | Mines git commit history using FP-Growth association rules (mlxtend) to find file combinations that historically co-occur in incident-causing commits |
| **Coverage Overlay** | Maps `.coverage` test data onto the blast radius graph so uncovered risk zones are immediately visible with color-coded heatmaps |
| **LLM Pipeline** | 3-agent LangGraph pipeline (Blast Interpreter → Pattern Explainer → Orchestrator) using Ollama to produce a structured merge recommendation with SSE streaming |

### Works with GitHub URLs

Paste any public GitHub repo URL directly into the dashboard — MergeGuard will clone it, analyse it, and show results. No local setup required for the repo you want to analyse.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, D3.js, Recharts, Framer Motion |
| **Database** | [Convex](https://convex.dev) (analyses, fingerprints, LLM streams, auth) |
| **Auth** | Convex Auth with email/password |
| **Backend API** | FastAPI (Python) with Pydantic validation and security middleware |
| **Analysis Engines** | Python AST, `rope`, `mlxtend` FP-Growth |
| **LLM** | Ollama (local) via LangGraph 3-agent pipeline |
| **Deployment** | Vercel (frontend) + Convex Cloud (database) |
| **CI/CD** | GitHub Actions (lint, test, build, coverage, Docker) |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git
- [Ollama](https://ollama.ai) (optional — core analysis works without it; needed for LLM reasoning)

### 1. Clone & Install

```bash
git clone https://github.com/navinvishwa07/MergeGuard.git
cd MergeGuard
```

### 2. Start the Database & Frontend (Convex + Next.js)

```bash
cd app-frontend
npm install
npx convex dev          # starts Convex dev server + syncs .env.local
```

Leave this terminal running. In a **new terminal**:

```bash
cd app-frontend
npm run dev             # Next.js at http://localhost:3000
```

### 3. Start the Backend API (Python)

Copy the `NEXT_PUBLIC_CONVEX_URL` value from `app-frontend/.env.local` into `backend/.env` as `CONVEX_URL`:

```bash
cd backend
pip install -r requirements.txt
python -m api.main      # FastAPI at http://localhost:8000
```

### 4. (Optional) Start Ollama for LLM Reasoning

```bash
ollama pull deepseek-coder
ollama serve
```

Open **http://localhost:3000** → paste a GitHub URL → select branches → run analysis.

---

## Architecture

```
MergeGuard/
├── backend/
│   ├── api/main.py              # FastAPI endpoints + security middleware
│   ├── engines/
│   │   ├── blast_radius.py      # AST parser, BFS tracer, risk scorer
│   │   ├── post_mortem.py       # FP-Growth association rule mining
│   │   └── coverage_overlay.py  # .coverage annotation layer
│   ├── agents/
│   │   └── langgraph_pipeline.py # 3-agent LangGraph pipeline (Ollama)
│   ├── db/
│   │   ├── convex_client.py     # Convex Python client wrapper
│   │   └── fingerprint_store.py # Fingerprint CRUD via Convex
│   ├── utils/
│   │   └── path_validator.py    # GitHub URL cloning + path security
│   └── tests/                   # 11 test modules, 233+ tests
├── app-frontend/                # Next.js 14 (App Router) + Tailwind
│   ├── app/
│   │   ├── page.tsx             # Animated landing page
│   │   ├── dashboard/           # Main dashboard, blast-radius, postmortem, settings
│   │   ├── analyze/             # Live analysis page
│   │   ├── history/             # Past analysis history
│   │   ├── signin/ & signup/    # Auth pages
│   ├── components/              # BlastRadiusGraph, PostMortemTimeline, LLMPanel, etc.
│   ├── convex/                  # Schema, auth, queries, mutations, seed data
│   │   ├── schema.ts            # analyses, fingerprints, llmStreams tables
│   │   ├── auth.ts              # Convex Auth (email/password)
│   │   └── seed.ts              # Demo data seeder
│   └── lib/                     # Types, utilities, mock data
├── .github/workflows/           # CI (lint + test + build), Coverage, CD (Docker)
├── docker-compose.yml           # Ollama + Backend + Frontend (self-hosted)
└── docs/                        # Architecture documentation
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (returns version) |
| `POST` | `/api/blast-radius` | Symbol-level impact analysis |
| `POST` | `/api/postmortem` | Historical failure pattern mining |
| `POST` | `/api/recommendation` | 3-agent LLM merge recommendation |
| `POST` | `/api/analyze/stream` | Full analysis with SSE token streaming |

### Request Body

```json
{
  "repo_path": "https://github.com/owner/repo",
  "base_branch": "main",
  "pr_branch": "feature/my-change"
}
```

`repo_path` accepts either a **GitHub URL** (auto-cloned) or a **local filesystem path**.

---

## Security

- **Input validation** — Pydantic validators block shell injection (`; | \``) , path traversal (`..`), and oversized inputs (500 char limit)
- **Path security** — Symlinks, system directories (`/etc`, `/var`, `/usr`), and traversal are blocked
- **GitHub URL whitelisting** — Only `https://github.com/` URLs are accepted for cloning
- **Response headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`
- **Error handling** — Internal errors never leak stack traces to clients
- **Auth** — Convex Auth with email/password for the dashboard

---

## Testing

```bash
cd backend
PYTHONPATH=$(pwd) python -m pytest tests/ -v

# With coverage
coverage run --source=engines,agents,api,utils,db -m pytest tests/ -v
coverage report --show-missing
```

**233 tests** across 11 test modules:

| Suite | Tests | What's covered |
|-------|-------|---------------|
| API | 39 | Health, all endpoints, validation, security headers, methods, edge cases |
| API Helpers | — | Translation functions for blast radius and postmortem data |
| Blast Radius | 47 | AST parser, scanner, BFS tracer, risk scorer, Rope integration |
| Blast Radius Extended | — | Additional edge cases and integration tests |
| Coverage Overlay | 12 | Symbol annotation, file reader, full pipeline |
| PostMortem | 24 | Commit mining, association rules, table builder |
| Security | 18 | Shell injection, path traversal, symlink, system dirs, URL validation |
| Fingerprint Store | 14 | CRUD, risk tier, PR matching, summaries |
| Path Validator | 16 | GitHub URLs, cloning, local paths, resolve |
| LangGraph Pipeline | 12 | Prompt builders, agent fallbacks, verdict parsing |
| Pipeline Integration | 3 | Streaming, full pipeline, error handling |

Test coverage: **93%** (engines: 99%, agents: 93%, utils: 92%)

---

## Self-Hosting with Docker

```bash
docker-compose up --build
```

This starts three containers:
- **Ollama** — LLM server on port `11434`
- **Backend** — FastAPI on port `8000`
- **Frontend** — Next.js on port `3000`

> **Note:** The Docker setup uses `NEXT_PUBLIC_API_URL` to connect the frontend directly to the backend container. The Convex cloud database is still required for persistence — set `CONVEX_URL` in your environment.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `deepseek-coder` | Model for LLM reasoning |
| `CONVEX_URL` | — | Convex deployment URL (from `npx convex dev`) |

### Frontend (`app-frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | — | Convex deployment URL (auto-set by `npx convex dev`) |
| `CONVEX_DEPLOYMENT` | — | Convex deployment name (auto-set by `npx convex dev`) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.
