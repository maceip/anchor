---
name: drift-detector
description: Detects branch, PR, plan, and artifact drift using Anchor heuristics and the Drift Quotient sidecar. Produces a structured DriftReport.
---

# Drift Detector Skill

Use this skill whenever you need to evaluate whether current work (PR, branch, commit) has drifted from the plan or exhibits evasion patterns.

Inputs:
- PR metadata + diff
- Current plan.md
- Optional sidecar telemetry

Output format (DriftReport):
```
{
  "severity": "low|medium|high|quarantine",
  "signals": [
    { "name": "<signal>", "score": 0-1, "evidence": ["..."] }
  ],
  "message": "<enforcement or advisory text>"
}
```

The detector combines practical heuristics (verbosity, infra-rat-hole, evasion, plan-drift) with statistical sidecar metrics when available. Quarantine from sidecar overrides practical severity.