# Security Policy

## Supported Versions

MergeGuard is currently in active development (hackathon phase).
Security fixes are applied to the `main` branch only.

| Version | Supported |
|---------|-----------|
| main    | ✅ Yes    |

---

## Reporting a Vulnerability

If you discover a security vulnerability in MergeGuard, please do NOT
open a public GitHub issue.

Instead, report it privately by emailing the maintainers directly or
using GitHub's private vulnerability reporting feature:

**Settings → Security → Report a vulnerability**

Please include:
- A description of the vulnerability
- Steps to reproduce it
- The potential impact
- Any suggested fixes if known

We will acknowledge your report within 48 hours and aim to release
a fix within 7 days for critical issues.

---

## Scope

MergeGuard runs entirely offline and does not transmit any data
externally. The attack surface is limited to:

- Local file system access via the repo path input
- The local Ollama LLM runtime
- The FastAPI HTTP server (localhost only by default)

Path traversal attacks on the `repo_path` input are mitigated by
the `validate_repo_path` utility in `backend/utils/path_validator.py`.