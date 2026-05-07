# Anchor Plugin

Per-repo cloud agent control plane that keeps CI green, maintains trajectory memory, audits PR drift, and computes Drift Quotient sidecar metrics.

## Component Map

- `rules/`: anti-drift-policy, ci-green-mandate, plan-custodian, pr-conduct
- `skills/`: drift-detector, ci-green-keeper, pr-auditor, plan-curator, trajectory-recorder
- `agents/`: anchor-custodian, ci-fixer, pr-enforcer, plan-archaeologist
- `commands/`: anchor command SOPs that invoke `scripts/anchor-cli.mjs`
- `hooks/`: Cursor hook config plus Node hook implementations
- `scripts/`: CLI entrypoint, subcommands, local state helpers, GitHub/Cursor adapters, practical drift heuristics, sidecar bridge
- `mcp/`: minimal stdio MCP server exposing Anchor tools to the cloud agent
- `sidecar/`: Python Drift Quotient pipeline with Nursery, Monitoring, Quarantine, and Re-Nursery
- `templates/`: `environment.json.example` copied during opt-in when absent

## Opt-in Flow

`/anchor-opt-in` ultimately invokes:

```bash
node plugins/anchor/scripts/anchor-cli.mjs opt-in [--repo-url URL] [--no-cloud]
```

It writes `~/.anchor/<slug>/state.json`, creates `plan.md` and `trajectory.jsonl`, copies `.cursor/environment.json` when absent, and attaches a durable Cursor cloud agent when `CURSOR_API_KEY` is available and `--no-cloud` is not passed.

## Environment Variables

| Env var | Purpose |
| --- | --- |
| `CURSOR_API_KEY` | Required for cloud agent creation and messaging |
| `GITHUB_TOKEN` | Required for GitHub Actions, PR reads, and PR comments |
| `ANCHOR_HOME` | Defaults to `~/.anchor` |
| `ANCHOR_MODEL_ID` | Defaults to `composer-2` |
| Optional sidecar env | Reserved for future local LLM / analyzer configuration |

## Local State

Anchor state is outside the repo:

```text
~/.anchor/<repo-slug>/
  state.json
  trajectory.jsonl
  plan.md
  runs/
  cache/
```

`state.json` never stores API keys.

## Validation

```bash
npm test --prefix plugins/anchor
node scripts/validate-template.mjs
PYTHONPATH=plugins/anchor/sidecar python3 -m unittest discover -s plugins/anchor/sidecar
```

See [../../docs/architecture.md](../../docs/architecture.md) and [../../docs/drift-heuristics.md](../../docs/drift-heuristics.md).

## Per-Actor Drift

Anchor tracks drift at the **actor** level (individual humans or agents), not the repository. Each actor goes through its own Nursery phase. The repo maintains an aggregate Drift Quotient.

**Example `/anchor-status` output:**

```
recentActors:
  alice@example.com — 47 events, last 2026-05-06 | NFR:0.12 FFR:0.05 IDR:0.08
  cursor-agent-7 — 12 events, last 2026-05-06 | NFR:0.65 FFR:0.40 IDR:0.72
```

High values in NFR/FFR/IDR from one actor will surface in PR audits and can trigger targeted enforcement without quarantining the entire repo.

Signals:
- **NFR** — Non-Failure Concealment Rate
- **FFR** — File Fabrication Rate
- **IDR** — Intentional Constraint Violation Rate (plan drift)
- **AHR** — API Hallucination Rate (now distinguishes fabricated vs stale references using urlhealth-style verification)
