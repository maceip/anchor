---
name: trajectory-recorder
description: Appends structured events (commit, pr, ci-run, plan-change, drift-flag, session-summary) to ~/.anchor/<repo-slug>/trajectory.jsonl. Sidecar metric events are stored as drift-flag rows.
---

# Trajectory Recorder Skill

Supported event types:
- commit
- pr
- ci-run
- plan-change
- drift-flag
- session-summary

Every row is a JSON object:
```
{ "ts": "ISO8601", "type": "<type>", "data": { ... } }
```

Sidecar decisions (NURSERY_RECORDED, QUARANTINE_TRIGGERED, etc.) are recorded as type "drift-flag" with full metric payload in data.

The recorder is called by hooks, CLI sync, CI watch, PR audit, and MCP tools. It must be append-only and tolerant of partial-line corruption.