---
name: pr-auditor
description: Audits PR descriptions, diffs, file paths, and plan alignment. Detects verbose/evasive PRs and emits canonical enforcement messages. Incorporates sidecar Drift Quotient findings.
---

# PR Auditor Skill

Canonical enforcement message template:

```
Anchor drift audit found blocking drift.

Plan phase:
<phase>

Signals:
- <signal>: <evidence>

Required correction:
<specific correction>

Do not expand scope, pad the PR, or defer the stated task behind placeholders.
```

When auditing:
1. Fetch PR metadata + diff.
2. Run practical drift heuristics.
3. If sidecar telemetry exists, merge statistical signals.
4. If severity >= medium, post or update a comment on the PR using the canonical format.
5. Ask cloud agent to rephrase for authority when appropriate.

Sidecar failure must degrade gracefully to practical-heuristic-only audit.