---
name: plan-curator
description: Reconstructs or maintains plan.md from commit history, open issues, recent PRs, and existing docs. Defines phase changes and keeps Mission, Phases, Active phase, and Recent decisions current.
---

# Plan Curator Skill

Invoked by `/anchor-plan --regenerate` or when no plan exists.

Process:
1. Read git log (last 50 commits), open issues, recent PRs, README, and docs.
2. Infer Mission from README / top-level goals.
3. Identify discrete phases from commit clusters and issue labels.
4. Determine Active phase from latest merged work.
5. Populate Recent decisions from the last 5-10 meaningful changes.
6. Write the resulting plan.md to `~/.anchor/<repo-slug>/plan.md`.
7. Record a plan-change event in trajectory.

Humans may edit plan.md freely; the curator only regenerates when explicitly requested or when drift is severe.