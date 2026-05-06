# Anchor

## What is Anchor?

Anchor is an anti-drift Cursor plugin that supervises an opted-in repository through local state, hooks, CLI commands, MCP tools, GitHub integration, and a Drift Quotient sidecar. Its job is to keep autonomous coding work aligned with the project plan instead of letting agents wander into polished but wrong work.

Anchor stores repo state outside the project under `~/.anchor/<repo-slug>/` and keeps the repository itself focused on source, configuration, and plugin assets.

## Mission: prevent drift

Drift includes:

- Red CI/CD that nobody is fixing
- Loss of trajectory or forgotten active phase
- PR-level evasion such as padding, placeholders, rat-holing, and goalpost moving
- Structural degradation from clone-heavy or overly complex patches
- Orthogonal Quality Trap: high-quality code that builds the wrong thing

## What Anchor watches

Anchor evaluates only artifacts:

- Git diffs, commit metadata, changed paths, and commit messages
- CI/CD status and failure logs
- Import lists and unresolved module signals
- Test/source byte ratios and changed-line volume
- Complexity deltas and clone-density signals
- Sequential CI failure patterns

## Anchor architecture

The data flow is:

- Commands -> `plugins/anchor/scripts/anchor-cli.mjs` -> local state, GitHub, Cursor SDK adapter, and sidecar bridge
- Hooks -> lightweight session state and trajectory events
- MCP -> cloud-agent tools backed by the same CLI libraries
- GitHub/CI -> telemetry -> Drift Quotient sidecar -> PR audit/status/quarantine

See [docs/architecture.md](docs/architecture.md) and [docs/drift-heuristics.md](docs/drift-heuristics.md).

## Install

Install Anchor as the single plugin in this marketplace repository. Then install the plugin dependencies:

```bash
npm ci --prefix plugins/anchor
```

## Opt a repo in

From the repository you want Anchor to supervise:

```bash
node /path/to/cursor-anchor/plugins/anchor/scripts/anchor-cli.mjs opt-in --no-cloud
```

Without `--no-cloud`, Anchor attempts to attach or create a durable Cursor cloud agent when `CURSOR_API_KEY` is present. Opt-in creates `~/.anchor/<repo-slug>/state.json`, `plan.md`, `trajectory.jsonl`, `runs/`, and `cache/`.

## Commands

- `/anchor-opt-in`
- `/anchor-status`
- `/anchor-sync`
- `/anchor-fix-ci`
- `/anchor-audit-pr <pr-number>`
- `/anchor-plan [--regenerate]`
- `/anchor-opt-out`

The command files ultimately invoke:

```bash
node plugins/anchor/scripts/anchor-cli.mjs <subcommand>
```

## How Anchor keeps CI green

Red CI is treated as an outage. `anchor-fix-ci` finds the latest failing GitHub Actions run, records the run in trajectory, feeds the failure into the sidecar Flail Index, and asks the durable cloud agent for the smallest repair when cloud credentials are available.

## How Anchor maintains trajectory memory

Anchor appends JSONL events to `~/.anchor/<repo-slug>/trajectory.jsonl` for commits, PR audits, CI runs, plan changes, drift flags, and session summaries. `/anchor-sync` records new commits since the last synced SHA and feeds artifact telemetry into the Drift Quotient sidecar.

## How Anchor audits PRs

Anchor combines practical PR heuristics with sidecar metrics. It checks PR prose, diff stats, changed paths, active plan phase, imports, test/source mutation ratios, CI failures, and sidecar quarantine state. Blocking comments use direct enforcement language when drift is medium or worse.

## Drift Quotient sidecar

The Python sidecar lives under `plugins/anchor/sidecar/anchor_drift_quotient/`. It supports Nursery, Monitoring, Quarantine, and Re-Nursery. AHR and FI are zero-tolerance operational signals; CUSUM tracks sustained SDI, TMCR, CCDC, and CFS drift after baselining.

## Environment variables

- `CURSOR_API_KEY`: required for cloud agent creation and messaging
- `GITHUB_TOKEN`: required for GitHub Actions, PR reads, and PR comments
- `ANCHOR_HOME`: defaults to `~/.anchor`
- `ANCHOR_MODEL_ID`: defaults to `composer-2`
- Future sidecar env: reserved for local LLM and analyzer configuration

## Validation

```bash
node scripts/validate-template.mjs
node --test plugins/anchor/scripts/lib/*.test.mjs
PYTHONPATH=plugins/anchor/sidecar python3 -m unittest discover -s plugins/anchor/sidecar
```

## FAQ

Does Anchor store secrets?

No. API keys are read from environment variables at call time and are not written to `state.json`.

Can Anchor run without cloud or GitHub credentials?

Yes. Local opt-in, status, sync, hooks, sidecar evaluation, and offline tests run without external credentials. GitHub and Cursor operations degrade to explicit no-ops when tokens are missing.
