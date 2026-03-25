# MergeGuard

**Pre-Merge Intelligence for Engineering Teams**

*Know what breaks. Know why it has broken before. Before you merge.*

[![CI](https://github.com/nospexe/MergeGuard/workflows/CI/badge.svg)](https://github.com/nospexe/MergeGuard/actions)
[![Coverage](https://github.com/nospexe/MergeGuard/workflows/Coverage/badge.svg)](https://github.com/nospexe/MergeGuard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FOSS Hack 2026](https://img.shields.io/badge/FOSS%20Hack-2026-6366f1)](https://fossunited.org)

---

## The Problem

Every engineering team has experienced this:

> **2am Production Incident**
> 
> A developer changes a utility function. They don't know 14 other modules import it.
> 
> The PR looks clean. Tests pass. It merges.
> 
> At 2am, production breaks in three unrelated-looking places.
> 
> The post-mortem reveals: this exact change pattern has caused failures 6 times in the past year.
> 
> **Nobody knew. There was no tool to tell them.**

Existing tools address only fragments of this problem:
- **Linters** catch syntax errors, not architectural blast radius
- **Dependency managers** track packages, not symbol-level call graphs
- **Post-mortems** sit in Confluence, unsearchable and forgotten
- **Code review** relies on senior engineer availability and gut feeling

**MergeGuard closes both gaps** — spatial impact analysis *and* temporal failure pattern detection — in a single, fully offline, open-source tool.

---

## What MergeGuard Does

MergeGuard is a **two-engine pre-merge intelligence system** that answers the questions other tools don't:

### Engine 1: BlastRadius — *"What does this change affect?"*

**Symbol-level transitive dependency analysis**

1. **AST Parsing** — Extract modified functions, classes, and symbols from your diff
2. **Call Graph Tracing** — Find every file that depends on the changed code (direct, transitive, and re-exported)
3. **Coverage Overlay** — Highlight which dependents have **zero test coverage** (the truly dangerous paths)
4. **Interactive Visualization** — Concentric ring graph showing blast radius depth, color-coded by risk
5. **Risk Scoring** — Deterministic 0–1 score based on breadth, depth, coverage gaps, and core module proximity

**Tech:** Python `ast` + `rope` + `coverage.py` — pure static analysis, no code execution required

### Engine 2: PostMortem — *"Has this pattern caused bugs before?"*

**Historical failure pattern mining via association rules**

1. **Commit Classification** — Automatically label commits as `bug-fix`, `feature`, or `refactor` using conventional commit tags and keywords
2. **Apriori Mining** — Apply association rule learning to commit sequences: "Files A + B changed together → bug-fix commit follows 78% of the time"
3. **Fingerprint Library** — Build named failure patterns with support/confidence/lift metrics
4. **Real-Time Matching** — Scan incoming PRs against the fingerprint database in <2 seconds
5. **Timeline Visualization** — Show historical incident frequency and whether trends are improving

**Tech:** `GitPython` + `mlxtend` Apriori + `pandas` — mines your entire repository history

### Combined Output: AI-Powered Merge Recommendation

**Local LLM reasoning over structured analysis**

- **Agent 1 (Blast Radius Interpreter):** Reads dependency graph JSON, identifies critical paths and coverage gaps
- **Agent 2 (Pattern Explainer):** Contextualizes fingerprint matches with historical evidence
- **Agent 3 (Orchestrator):** Synthesizes final verdict: `GREEN` (safe), `YELLOW` (review needed), or `RED` (high risk)

**Tech:** Ollama + DeepSeek Coder (or Llama 3) running **100% locally** — no API keys, no cloud dependency

---

## Demo Output

### Sample MergeGuard Report — PR #247

```
═══════════════════════════════════════════════════════
  BLAST RADIUS ANALYSIS
═══════════════════════════════════════════════════════

• 23 files directly or transitively affected
• 4 affected files have ZERO test coverage (⚠️ highlighted red)
• Critical path detected: auth → middleware → all 12 API route handlers
• Risk Level: HIGH — integration tests required before merge

═══════════════════════════════════════════════════════
  FAILURE FINGERPRINT MATCH
═══════════════════════════════════════════════════════

• This PR matches Failure Pattern #3 with 68% confidence
• Pattern #3 has preceded production bugs 6 times in this repository
• Last occurrence: 2024-09-14, caused 47-minute API outage
• Recommended action: Review db/session.py connection pool limits before merging

═══════════════════════════════════════════════════════
  LLM RISK BRIEF
═══════════════════════════════════════════════════════

Changing parse_token() affects the auth middleware which wraps every API route.

Combined with the historical pattern match, this is a high-risk merge.
Recommend adding integration tests for /api/v1/users and /api/v1/orders 
endpoints before proceeding.

Estimated test coverage gap: 3 uncovered call paths.

🟡 VERDICT: YELLOW — Merge with caution
```

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│  INPUT LAYER                                            │
│  Git Repo (local clone) + Branch Diff (git diff)       │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼──────────┐  ┌───────▼────────────┐
│ BlastRadius      │  │ PostMortem         │
│ Engine           │  │ Engine             │
│                  │  │                    │
│ • AST Parser     │  │ • GitPython miner  │
│ • rope tracer    │  │ • Apriori rules    │
│ • coverage.py    │  │ • SQLite storage   │
└───────┬──────────┘  └───────┬────────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │  LLM REASONING LAYER (Ollama)       │
        │  LangGraph Multi-Agent Pipeline     │
        │                                     │
        │  Agent 1: Blast radius interpreter  │
        │  Agent 2: Pattern explainer         │
        │  Agent 3: Orchestrator              │
        └──────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────────────────────┐
        │  OUTPUT LAYER                       │
        │  React Dashboard (FastAPI backend)  │
        │                                     │
        │  • D3.js force graph                │
        │  • Recharts timeline                │
        │  • Streaming LLM panel              │
        │  • Merge badge (GREEN/YELLOW/RED)   │
        └─────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | License |
|-------|-----------|---------|
| AST Analysis | Python `ast` (stdlib) + `rope` | PSF + LGPL |
| Git Mining | `GitPython` | BSD |
| Pattern Mining | `mlxtend` (Apriori) | BSD |
| Coverage Overlay | `coverage.py` | Apache 2.0 |
| Agent Orchestration | `LangGraph` | MIT |
| Local LLM | Ollama + DeepSeek Coder | MIT |
| Backend API | FastAPI + Uvicorn | MIT |
| Frontend | React + Vite + D3.js + Recharts | MIT |
| Database | SQLite | Public Domain |
| Containerization | Docker + Docker Compose | Apache 2.0 |

**100% Open Source • 100% Offline • MIT Licensed**

---

## Installation

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** (for frontend)
- **Git**
- **Ollama** (optional, for LLM features)

### Quick Start (3 commands)

```bash
# 1. Clone the repository
git clone https://github.com/nospexe/MergeGuard.git
cd MergeGuard

# 2. Install backend dependencies
cd backend
pip install -r requirements.txt

# 3. Run the backend
uvicorn api.main:app --reload --port 8000
```

### Frontend Setup (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Docker Setup (one command)

```bash
docker-compose up
```

Access the dashboard at **http://localhost:5173**

---

## Usage

### CLI Analysis

```bash
# Analyze a repository
cd backend
python -c "
from engines.blast_radius import analyze_blast_radius
result = analyze_blast_radius(
    repo_root='/path/to/your/repo',
    changed_symbols=['auth.utils.validate_token']
)
print(result)
"
```

### REST API

```bash
# Health check
curl http://localhost:8000/health

# Analyze blast radius
curl -X POST http://localhost:8000/api/blast-radius \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "/path/to/repo",
    "base_branch": "main",
    "pr_branch": "auth.utils.validate_token"
  }'

# Get failure fingerprints
curl -X POST http://localhost:8000/api/postmortem \
  -H "Content-Type: application/json" \
  -d '{"repo_path": "/path/to/repo"}'

# Stream LLM recommendation
curl -X POST http://localhost:8000/api/analyze/stream \
  -H "Content-Type: application/json" \
  -d '{"repo_path": "/path/to/repo", "pr_branch": "feature-branch"}'
```

### Interactive Dashboard

1. Navigate to **http://localhost:5173**
2. Enter your repository path
3. Specify the changed symbols or branch
4. View:
   - **Blast Radius Graph** — Interactive D3.js force-directed graph
   - **Post-Mortem Timeline** — Historical failure patterns
   - **LLM Risk Brief** — AI-powered merge recommendation

---

## Testing

### Run All Tests

```bash
cd backend
python3 run_tests.py
```

### Test Coverage

```bash
cd backend
pip install coverage
coverage run run_tests.py
coverage report --omit="run_tests.py"
```

**Current Coverage:** 39 tests passing • >80% coverage on core modules

---

## Project Structure

```
MergeGuard/
├── backend/
│   ├── engines/
│   │   ├── blast_radius.py       # BlastRadius engine (AST + rope + coverage)
│   │   ├── post_mortem.py        # PostMortem engine (GitPython + Apriori)
│   │   └── coverage_overlay.py   # Coverage integration
│   ├── agents/
│   │   └── langgraph_pipeline.py # LLM multi-agent orchestration
│   ├── api/
│   │   └── main.py               # FastAPI REST endpoints + SSE streaming
│   ├── tests/
│   │   ├── test_blast_radius.py
│   │   ├── test_coverage_overlay.py
│   │   ├── test_post_mortem.py
│   │   └── test_api.py
│   ├── utils/
│   │   └── path_validator.py
│   ├── requirements.txt
│   └── run_tests.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── BlastRadiusGraph.jsx  # D3.js force graph
│   │   ├── data/
│   │   │   └── mockData.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── demo/
│   ├── precomputed/              # Contract JSONs for integration
│   └── diffs/                    # Demo scenarios
├── .github/
│   └── workflows/
│       ├── ci.yml                # GitHub Actions CI
│       └── coverage.yml          # Coverage reporting
├── docker-compose.yml
├── LICENSE                       # MIT
└── README.md
```

---

## Development Roadmap

### ✅ Week 1 — Analysis Core (Complete)
- AST parser + call graph tracer
- Coverage overlay integration
- Git mining + commit classification
- Unit tests (39 passing)

### ✅ Week 2 — Visualization (Complete)
- React dashboard scaffold
- D3.js blast radius graph
- FastAPI backend with SSE streaming
- REST API endpoints

### ✅  Week 3 — PostMortem + LLM 
- Apriori association rule mining
- Fingerprint library persistence (SQLite)
- LangGraph multi-agent pipeline
- Ollama integration

### ✅ Week 4 — Polish + Demo Prep
- Docker Compose one-command deployment
- Merge badge (GREEN/YELLOW/RED)
- Demo scenarios with pre-tested repos
- Performance optimization (<90s for 50k LOC repos)
- README + architecture documentation

---

## Why MergeGuard Wins

| Criterion | MergeGuard's Case |
|-----------|------------------|
| **Impact** | Every software team faces this problem daily. Reducing production incidents by 10% saves millions in engineering time and customer trust. |
| **Innovation** | No open-source tool combines **symbol-level blast radius tracing** with **association rule mining on commit sequences**. Both halves are confirmed open gaps. |
| **Technical Depth** | AST call graph tracing + Apriori mining + multi-agent LLM orchestration + streaming SSE + D3.js force layout is a genuinely sophisticated system for a 4-week build. |
| **Feasibility** | Every component uses mature, well-documented libraries. Risk is distributed — if one subsystem is incomplete, the others still demo. |
| **Demo Quality** | All inputs pre-controlled. Analysis runs from pre-cached data. LLM output streamable. Contrast between RED/GREEN PR is visually immediate. |
| **FOSS Alignment** | 100% open-source stack. MIT license. No paid APIs. No proprietary dependencies. Judges can verify every line of code via git log. |

---

## Differentiation from Existing Tools

### vs. CodeRabbit (AI Code Review SaaS)

| Feature | CodeRabbit | MergeGuard |
|---------|-----------|------------|
| **Scope** | Code quality (style, bugs, best practices) | **Structural risk + failure patterns** |
| **Deployment** | Cloud SaaS ($12–48/user/month) | **100% offline, free** |
| **Analysis** | Per-file static analysis | **Transitive dependency graph + historical mining** |
| **Memory** | No historical pattern learning | **Learns from your repo's entire git history** |

**MergeGuard is complementary, not competing** — it answers questions CodeRabbit doesn't address:
- "What will this change break transitively?"
- "Has this exact pattern caused production incidents before?"

---

## Team

**Team kernl** — FOSS Hack 2026

- **Navin** — BlastRadius + CoverageOverlay engines
- **Armaan** — PostMortem engine (Apriori mining)
- **Aayush** — LLM/API layer
- **Balaa** — Frontend (React components)

**Repository:** [github.com/nospexe/MergeGuard](https://github.com/nospexe/MergeGuard)

---

## License

MIT License — see [LICENSE](LICENSE)

**100% Free and Open Source Software**

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Principles
- **Test-first:** Every engine has >80% test coverage
- **Deterministic:** All analysis is reproducible
- **Offline-first:** No cloud dependencies
- **Senior-engineer quality:** See [AI_RULES.md](AI_RULES.md) for code standards

---

## Acknowledgments

Built during **FOSS Hack 2026** (March 1–31, 2026)

Special thanks to:
- FOSS United for organizing the hackathon
- The open-source maintainers of `rope`, `mlxtend`, `GitPython`, `coverage.py`, `FastAPI`, `D3.js`, and `React`
- The Ollama team for making local LLM inference accessible

---

## Support

- **Issues:** [GitHub Issues](https://github.com/nospexe/MergeGuard/issues)
- **Discussions:** [GitHub Discussions](https://github.com/nospexe/MergeGuard/discussions)
- **Email:** team@kernl.dev

---
