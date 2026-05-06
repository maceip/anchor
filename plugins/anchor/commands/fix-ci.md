---
name: anchor-fix-ci
description: Triggers the per-repo cloud agent (via ci-fixer skill) to diagnose and repair the most recent failing workflow. CI red is Anchor's top priority.
---

# /anchor-fix-ci

- Calls ci-watch to find the newest failing run
- Streams logs to `~/.anchor/<slug>/runs/<runId>.log`
- Dispatches the ci-fixer agent with the log payload
- The agent opens a minimal repair PR (autoCreatePR: true)
- Records run ID and PR URL as a ci-run event in trajectory
- Exits non-zero only on real errors; missing token produces clear message

Red CI blocks all other Anchor work until resolved.