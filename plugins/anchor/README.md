# Anchor

Per-repo cloud agent that keeps CI green, maintains trajectory memory, and pushes back on drifting PRs.

## Components

- `rules/`: anti-drift-policy, ci-green-mandate, plan-custodian, pr-conduct
- `skills/`: drift-detector, ci-green-keeper, pr-auditor, plan-curator, trajectory-recorder
- `agents/`: anchor-custodian, ci-fixer, pr-enforcer, plan-archaeologist
- `commands/`: anchor-* command frontmatter files
- `hooks/`: hooks.json and Node shims for session telemetry and drift warnings
- `scripts/`: (Phase 2 planned: anchor-cli.mjs, CLI subcommands, lib helpers, hook shims)
- `mcp/`: (Phase 2 planned: anchor-server for cloud agent tools)
- `sidecar/`: (Phase 3 planned: anchor_drift_quotient Python Drift Quotient pipeline)
- `templates/`: (Phase 2 planned: environment.json.example for install)

## Install / Opt-in

Run `/anchor-opt-in` in repo. Creates `~/.anchor/<slug>/` state, attaches durable Cursor cloud agent (if CURSOR_API_KEY present), copies environment template if needed.

## Environment variables

- `CURSOR_API_KEY`: for cloud agent
- `GITHUB_TOKEN`: for GitHub PR/CI ops
- `ANCHOR_HOME`: defaults to ~/.anchor
- `ANCHOR_MODEL_ID`: defaults to composer-2

## Validation

```bash
node ../../scripts/validate-template.mjs
```

See top-level README and plan for full details. Version: 2026.05.05-84a231c
