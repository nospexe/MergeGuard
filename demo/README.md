# MergeGuard Demo

## Demo Scenarios

### High Risk
Touches Django's core cache backend — affects many dependent modules.
```bash
python mergeguard analyze --repo ./repos/django --diff ./diffs/high_risk.diff --precomputed ./precomputed/blast_django_high.json
```

### Medium Risk
Touches Django's auth models — moderate number of dependents.
```bash
python mergeguard analyze --repo ./repos/django --diff ./diffs/medium_risk.diff --precomputed ./precomputed/blast_django_medium.json
```

### Low Risk
Trivial docstring change in a utility file — no dependents affected.
```bash
python mergeguard analyze --repo ./repos/django --diff ./diffs/low_risk.diff --precomputed ./precomputed/blast_django_low.json
```

## Precomputed Data
All analysis results are cached in `precomputed/` so the demo runs instantly without re-processing.