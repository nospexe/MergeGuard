"""
benchmark.py — BlastRadius Performance Benchmark
Run from repo root: python3 results/benchmark.py
"""
import sys, time, tempfile, subprocess
from pathlib import Path
from statistics import median

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
from engines.blast_radius import analyze_blast_radius

def count_loc(root):
    total = 0
    for p in Path(root).rglob("*.py"):
        if any(x in p.parts for x in ("venv",".venv",".git","__pycache__")):
            continue
        try: total += len(p.read_text(errors="ignore").splitlines())
        except: pass
    return total

repo_root = Path(__file__).parent.parent
symbols = ["engines.blast_radius.analyze_blast_radius"]
loc = count_loc(repo_root)
times = []
for _ in range(3):
    start = time.monotonic()
    analyze_blast_radius(repo_root, symbols, use_rope=False)
    times.append(time.monotonic() - start)
med = median(times)
print(f"MergeGuard self-benchmark: {loc:,} LOC, median {med:.2f}s")
print("✅ PASS" if med < 90 else "❌ FAIL")
