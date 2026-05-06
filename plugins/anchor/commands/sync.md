---
name: anchor-sync
description: Syncs trajectory with git log since lastSyncedSha, re-evaluates practical drift, and feeds new artifact telemetry into the sidecar when available.
---

# /anchor-sync

- Reads state.lastSyncedSha
- Runs `git log <last>..HEAD` and records new commit events via trajectory-recorder
- Re-runs practical drift heuristics on recent changes
- If sidecar telemetry artifacts exist, calls sidecar-bridge to update metrics
- Updates state.lastSyncedSha
- Returns a one-line summary of new events and any drift signals raised

Safe to run frequently; cheap when nothing new.