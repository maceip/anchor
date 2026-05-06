---
name: anchor-status
description: Prints comprehensive status: opt-in state, cloud agent, trajectory tail, plan phase, CI status, sidecar phase, latest Drift Quotient metrics, and quarantine state.
---

# /anchor-status

Displays:
- optedIn flag and repo slug
- cloudAgentId (or "not attached")
- last 5 trajectory rows (pretty-printed)
- current plan phase (from plan.md or "none")
- last CI status (green/red + run link)
- sidecar phase (NURSERY / MONITORING / QUARANTINE)
- latest sidecar metrics (SDI, AHR, TMCR, CCDC, CFS, FI)
- quarantine flag and any active alarms

Missing tokens produce clear "no-op with message" output. Never fails the command.