# MergeGuard — Product Requirements Document

**Version:** 0.1.0
**Status:** Hackathon MVP
**License:** MIT

---

## Problem Statement

Engineering teams merge code without knowing its full impact. Static
type checkers and linters catch syntax and type errors, but they do
not answer the question that matters most before a merge:

> "What else in this codebase depends on what I just changed, and has
> this kind of change caused failures before?"

MergeGuard answers both questions, offline, in under 90 seconds.

---

## Goals

1. Compute the full transitive blast radius of a PR diff at symbol level
2. Mine Git history for statistically significant co-failure patterns
3. Reason over both signals with a local LLM to produce a human-readable
   GREEN / YELLOW / RED merge recommendation
4. Run entirely offline with no proprietary dependencies
5. Complete analysis of a 50k LOC repo in under 90 seconds

---

## Non-Goals

- MergeGuard is not a replacement for code review
- MergeGuard does not execute any code from the analysed repository
- MergeGuard does not support dynamic languages (JavaScript, Ruby) in v0.1
- MergeGuard does not integrate with CI/CD pipelines in v0.1

---

## System Architecture

### Engine 1 — BlastRadius
- Input: repo path, list of changed symbols
- Process: AST parse → import graph → BFS traversal → risk scoring
- Output: direct dependents, transitive dependents, risk score, risk tier

### Engine 2 — PostMortem
- Input: repo path
- Process: git log → commit classification → transaction table → Apriori
- Output: association rules with support and confidence scores

### LLM Reasoning Layer
- Input: BlastRadius JSON + PostMortem rules
- Process: 3-agent LangGraph pipeline via Ollama
- Output: structured recommendation with verdict and explanation

### Frontend
- React + Vite dashboard
- D3.js force-directed blast radius graph
- Recharts failure hotspot timeline
- GREEN / YELLOW / RED merge badge

---

## Risk Score Formula
```
score = (breadth_score  × 0.30)
      + (depth_score    × 0.25)
      + (coverage_gap   × 0.35)
      + (core_penalty   × 0.10)
```

Tiers:
- 0.00 – 0.24 → LOW
- 0.25 – 0.49 → MEDIUM
- 0.50 – 0.74 → HIGH
- 0.75 – 1.00 → CRITICAL

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Uvicorn |
| Static Analysis | Python ast, rope |
| Git Mining | GitPython |
| Association Rules | mlxtend (Apriori) |
| LLM Runtime | Ollama (DeepSeek Coder 6.7B) |
| Agent Orchestration | LangGraph |
| Frontend | React 18, Vite, D3.js, Recharts |
| Containerisation | Docker, Docker Compose |
| CI | GitHub Actions |

---

## Constraints

- Fully offline — no internet required after initial model download
- No paid APIs or proprietary services
- All dependencies MIT / BSD / Apache 2.0 licensed
- Must analyse 50k LOC repo in under 90 seconds