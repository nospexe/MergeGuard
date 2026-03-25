# Contributing to MergeGuard

Thank you for contributing. This document covers everything you need
to get started as a contributor.

---

## Branch Naming

All feature branches must follow this convention:
```
dev/<your-name>-<feature-description>
```

Examples:
- `dev/aayush-llm-infra`
- `dev/navin-blast-radius`
- `dev/balaa-frontend`

Branches that do not follow this convention will not be merged.

---

## Pull Request Requirements

Before opening a PR:

1. All CI checks must pass (ruff linting + pytest)
2. Your branch must be up to date with `main`
3. The PR description must explain what changed and why
4. No new code without tests where applicable

---

## Development Setup
```bash
git clone https://github.com/nospexe/MergeGuard.git
cd MergeGuard

# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run tests
pytest tests/ -v

# Run linter
ruff check .
```

---

## Commit Message Format

Follow conventional commits:
```
feat: add new feature
fix: fix a bug
docs: update documentation
ci: change CI configuration
chore: maintenance tasks
```

---

## Code Style

- Python: formatted and linted with `ruff`
- All functions must have docstrings
- No unused imports
- Type annotations required on all function signatures

---

## AI Usage Policy

See [AI_RULES.md](AI_RULES.md) for our policy on AI-assisted development.