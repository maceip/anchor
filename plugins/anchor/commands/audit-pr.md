---
name: anchor-audit-pr
description: Runs the PR auditor + sidecar Drift Quotient on a specific PR number, then posts or updates an enforcement comment if drift is detected.
---

# /anchor-audit-pr <pr-number>

- Fetches PR metadata and diff via GitHub integration
- Computes practical drift report (verbosity, evasion, infra-rat-hole, plan-drift)
- Invokes sidecar via bridge when telemetry is sufficient
- Merges signals; if severity >= medium, posts canonical enforcement comment
- If a prior Anchor comment exists on the same head SHA, updates it instead of duplicating
- Records the audit as a pr event in trajectory

Missing GITHUB_TOKEN produces a clear no-op with guidance. Sidecar failures degrade to practical-only.

Implementation: ultimately invokes
node plugins/anchor/scripts/anchor-cli.mjs audit-pr <pr-number>