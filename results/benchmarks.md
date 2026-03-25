# MergeGuard — Performance Benchmarks

## Target

Full analysis of a 50,000-line Python repository must complete in under 90 seconds.

## How to Run

```bash
cd backend
python3 ../results/benchmark.py
```

## Recorded Results

| Repo | LOC | Files | Median Time (s) | Risk Tier | Rope |
|------|-----|-------|-----------------|-----------|------|
| MergeGuard (self) | — | — | — | — | off |

_Run `python3 results/benchmark.py` to populate this table._

## Methodology

Each benchmark run:
1. Calls `analyze_blast_radius(repo_root, changed_symbols, use_rope=False)` and measures wall-clock time
2. Repeats 3 times and records the median
3. Rope excluded from benchmarks — its cold/warm cache timing is not comparable across runs
