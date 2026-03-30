# MergeGuard

> **Pre-Merge Intelligence for Engineering Teams**
> Know what breaks. Know why it broke before. Before you merge.

[![MIT License](https://img.shields.io/badge/License-MIT-00d4ff.svg)](LICENSE)
[![FOSS Hack 2026](https://img.shields.io/badge/FOSS%20Hack-2026-00ff88.svg)](#)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-000000.svg)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-ff6600.svg)](https://convex.dev)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MergeGuard Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐                          ┌──────────────────┐     │
│  │  Landing Page │                          │  App Pages       │     │
│  │  (page.tsx)   │                          │  /dashboard      │     │
│  │              │                          │  /analyze        │     │
│  │  • Hero      │                          │  /history        │     │
│  │  • Problem   │                          │                  │     │
│  │  • Engines   │                          │  ┌────────────┐  │     │
│  │  • How Works │                          │  │ D3.js      │  │     │
│  │  • Tech      │                          │  │ Blast      │  │     │
│  │  • FOSS      │                          │  │ Radius     │  │     │
│  │  • CTA       │                          │  │ Graph      │  │     │
│  └──────────────┘                          │  └────────────┘  │     │
│                                            │  ┌────────────┐  │     │
│                                            │  │ Recharts   │  │     │
│                                            │  │ PostMortem │  │     │
│                                            │  │ Timeline   │  │     │
│                                            │  └────────────┘  │     │
│                                            │  ┌────────────┐  │     │
│                                            │  │ LLM Panel  │  │     │
│                                            │  │ Streaming  │  │     │
│                                            │  │ Brief      │  │     │
│                                            │  └────────────┘  │     │
│                                            └──────────────────┘     │
│                                                                      │
├──────────────────── Data Layer ──────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────┐     ┌────────────────────────────┐  │
│  │  Convex (Real-time DB)     │     │  3-Agent LLM Pipeline     │  │
│  │                            │     │                            │  │
│  │  Tables:                   │     │  Agent 1: Blast            │  │
│  │  • analyses                │     │    Interpreter             │  │
│  │  • fingerprints            │     │         ↓                  │  │
│  │  • llmStreams              │     │  Agent 2: Pattern          │  │
│  │                            │     │    Explainer               │  │
│  │  Features:                 │     │         ↓                  │  │
│  │  • Real-time subscriptions │     │  Agent 3: Orchestrator     │  │
│  │  • Type-safe queries       │     │    → GREEN/YELLOW/RED      │  │
│  │                            │     │                            │  │
│  │                            │     │  Model: Ollama             │  │
│  └────────────────────────────┘     │  Streaming: token-by-token │  │
│                                      └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### One-Command Install

```bash
cd app-frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app works fully in **demo mode** without any API keys.

### With Convex (optional)

```bash
npx convex dev          # Start Convex dev server
npx convex run seed:seedDatabase   # Seed demo data
```

### With Local Ollama Backend (optional)

Ensure the Python backend is running the `langgraph_pipeline`:
```bash
OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=deepseek-coder python backend/api/main.py
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS 3 |
| **Visualizations** | D3.js v7 (blast radius graph), Recharts (timeline) |
| **Database** | Convex (real-time, typed, serverless) |
| **Auth** | Out of scope for this submission (Convex Auth scaffold exists in `convex/auth.ts`) |
| **LLM** | Ollama (deepseek-coder) via LangGraph |
| **Deployment** | Vercel (frontend) + Convex Cloud |
| **License** | MIT |

## Features

### 🎯 BlastRadius Engine
Interactive D3.js force-directed graph showing dependency impact across concentric rings. Click any node to highlight its dependency path. Color-coded by test coverage:
- 🟢 **Covered** (>70%) — green nodes
- 🟡 **Partial** (30-70%) — amber nodes
- 🔴 **Uncovered** (<30%) — red nodes

### 📜 PostMortem Engine
Recharts area chart showing incident frequency over time. Each data point is colored by severity (CRITICAL/HIGH/MEDIUM/LOW). Click any spike to see the commit hashes involved.

### 🤖 3-Agent LLM Pipeline
Sequential reasoning pipeline streamed token-by-token:
1. **Agent 1 (Blast Interpreter)** — structural risk summary
2. **Agent 2 (Pattern Explainer)** — historical context
3. **Agent 3 (Orchestrator)** — final GREEN/YELLOW/RED recommendation

### 🎨 Landing Page
Dark terminal-intelligence aesthetic with:
- Animated risk badge cycling GREEN → YELLOW → RED
- Typewriter terminal demo showing a live analysis
- Scanline texture overlay
- Staggered scroll-reveal animations
- "2 AM incident" narrative section

## Project Structure

```
app-frontend/
├── app/
│   ├── page.tsx              # Landing page (extraordinary)
│   ├── layout.tsx            # Root layout + Convex provider
│   ├── globals.css           # Design tokens + animations
│   ├── dashboard/
│   │   ├── layout.tsx        # Sidebar + topnav shell
│   │   └── page.tsx          # 3-panel analysis dashboard
│   ├── analyze/
│   │   ├── layout.tsx
│   │   └── page.tsx          # New analysis form
│   └── history/
│       ├── layout.tsx
│       └── page.tsx          # Past analyses table
├── components/
│   ├── BlastRadiusGraph.tsx  # D3.js force graph
│   ├── PostMortemTimeline.tsx # Recharts timeline
│   ├── LLMPanel.tsx          # Streaming LLM output
│   ├── MergeRecommendationBadge.tsx  # GREEN/YELLOW/RED badge
│   ├── layout/
│   │   ├── Topnav.tsx
│   │   ├── Sidebar.tsx
│   │   └── DashboardShell.tsx
│   ├── landing/              # Landing page sections
│   ├── dashboard/            # Dashboard widgets
│   └── shared/               # Badge, Button, GlassCard
├── convex/
│   ├── schema.ts             # Database schema
│   ├── auth.ts               # Auth setup
│   ├── auth.config.ts        # Auth config
│   ├── analyses.ts           # CRUD queries/mutations
│   ├── fingerprints.ts       # Pattern queries
│   ├── llmStreams.ts          # Real-time streaming
│   └── seed.ts               # Demo data seeder
├── lib/
│   ├── llm-pipeline.ts       # 3-agent local pipeline logic
│   ├── demo-data.ts          # Precomputed scenarios
│   ├── convex-provider.tsx   # Convex React provider
│   ├── types.ts              # TypeScript types
│   └── cn.ts                 # clsx + tailwind-merge
└── tailwind.config.ts        # Design system tokens
```

## Demo Scenarios

### Scenario A: Django Cache Refactor (🔴 RED)
- **Repo:** django/django
- **Branch:** feature/cache-refactor
- **Impact:** 23 affected files across 4 dependency rings
- **Coverage:** 38% overall (well below 70% threshold)
- **Pattern Match:** P-004 at 74% confidence
- **Verdict:** BLOCK MERGE

### Scenario B: Docstring Update (🟢 GREEN)
- **Repo:** myapp/backend
- **Branch:** docs/update-helpers
- **Impact:** 1 file, 0 deps
- **Coverage:** 92%
- **Pattern Match:** None
- **Verdict:** Safe to merge

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | No | Convex deployment URL |
| `NEXT_PUBLIC_BACKEND_URL` | No | URL to local backend API |

The app works fully in **demo mode** without any environment variables configured.

## License

MIT — see [LICENSE](../LICENSE)

---

Built for **FOSS Hack 2026** 🚀
