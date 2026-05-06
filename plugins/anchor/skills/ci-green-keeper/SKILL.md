---
name: ci-green-keeper
description: Diagnoses failing GitHub Actions runs, classifies root cause, drafts the smallest fix, and opens/updates a repair PR. Records everything in trajectory.
---

# CI Green Keeper Skill

Primary use: when `/anchor-fix-ci` is invoked or red CI is detected.

Steps:
1. Run `gh run view --log-failed` (or equivalent) on the latest failing workflow.
2. Classify failure:
   - flake (transient)
   - config (workflow / env)
   - code (test or implementation bug)
3. Draft the minimal patch that restores green.
4. Use the cloud agent (with autoCreatePR) to open the fix PR.
5. Record run ID, conclusion, and repair PR URL in trajectory.

Never perform unrelated refactors while fixing CI. Record every attempt.