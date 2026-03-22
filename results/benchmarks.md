# MergeGuard — Performance Benchmarks

## How to Run

```bash
cd backend
python3 ../results/benchmark.py
```

Results are written back to this file under **Recorded Results**.

---

## Target

Full analysis of a 50,000-line Python repository must complete in under 90 seconds.

---

## Recorded Results

| Repo | LOC | Files | Analysis Time (s) | Risk Tier | Rope |
|------|-----|-------|-------------------|-----------|------|
| _(run benchmark.py to populate)_ | | | | | |

---

## Methodology

Each benchmark run:
1. Clones the target repo into a temp directory (one-time setup, not timed)
2. Calls `analyze_blast_radius(repo_root, changed_symbols, use_rope=False)` and measures wall-clock time
3. Repeats 3 times and records median

Rope is excluded from benchmarks because its indexing time depends on the rope project cache, which makes cold/warm runs incomparable. Rope performance is logged separately.