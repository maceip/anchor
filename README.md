# Anchor

Anchor is an anti-drift Cursor plugin that supervises a per-repo cloud agent to keep projects on trajectory, CI green, and PRs aligned with the plan.

## Mission: prevent drift

Drift includes:
- Red CI/CD that nobody is fixing
- Loss of trajectory
- PR-level evasion (padding, placeholders, rat-holing, goalpost moving)
- Structural degradation
- Orthogonal Quality Trap (high-quality code for the wrong thing)

## What Anchor watches

- Git diffs, commit metadata, CI/CD logs
- Import resolution, test/source change ratios, AST complexity, clone density
- Commit/CI failure patterns via Drift Quotient sidecar

## Install

1. Install the Anchor plugin from the Cursor Marketplace.
2. In an opted-in repo, run `/anchor-opt-in`.

Anchor maintains local state under `~/.anchor/<repo-slug>/`.

## Validation

```bash
node scripts/validate-template.mjs
```

## Commands

- `/anchor-opt-in`
- `/anchor-status`
- `/anchor-sync`
- `/anchor-fix-ci`
- `/anchor-audit-pr <pr-number>`
- `/anchor-plan [--regenerate]`
- `/anchor-opt-out`

See `plugins/anchor/README.md` and `docs/architecture.md` (see plan for roadmap) for details.

## FAQ

See the full phased implementation plan in the repo's `plan` file for v1 scope.
