# Anchor Architecture

Anchor is a single Cursor plugin for supervising opted-in repositories. It combines local state, hooks, CLI commands, MCP tools, GitHub integration, a Cursor cloud-agent adapter, and the Python Drift Quotient sidecar.

## Data Flow

| Flow | Path | Result |
| --- | --- | --- |
| Commands | Commands -> CLI -> SDK/Octokit/state files | Humans and agents invoke opt-in, status, sync, CI repair, PR audit, and plan commands |
| Hooks | Cursor hooks -> Node hook scripts -> session state / trajectory | Lightweight session telemetry, prompt drift warnings, and session summaries |
| MCP | Cloud agent -> MCP server -> same Anchor libraries | Agent can read/write plan, inspect trajectory, audit PRs, request CI repair, and fetch drift reports |
| GitHub/CI | GitHub Actions / PRs -> telemetry -> sidecar | CI failures, diffs, imports, and changed paths become Drift Quotient inputs |
| Sidecar | Python sidecar -> DriftReport -> PR audit/status/quarantine | Statistical drift signals are normalized and persisted in `state.json` and `trajectory.jsonl` |

## Commands To CLI

Command markdown files under `plugins/anchor/commands/` are SOPs. The executable implementation is `plugins/anchor/scripts/anchor-cli.mjs`, which dispatches to `scripts/cli/*.mjs`.

The CLI uses dependency-light local libraries under `scripts/lib/`:

- `state.mjs`, `paths.mjs`, `plan.mjs`, `trajectory.mjs`
- `git.mjs`, `github.mjs`, `cursor-agent.mjs`
- `drift.mjs`, `pr-audit.mjs`, `ci-watch.mjs`, `sidecar-bridge.mjs`

## Hooks To Trajectory

Hook shims in `plugins/anchor/scripts/hook-*.sh` execute Node implementations in `plugins/anchor/hooks/`. Hooks exit 0 when not opted in. After opt-in, they write lightweight session state to `~/.anchor/<slug>/.session.json` and append summaries to `trajectory.jsonl`.

## MCP To Cloud Agent Tools

The MCP server lives at `plugins/anchor/mcp/anchor-server/index.mjs`. It exposes:

- `anchor.getPlan`
- `anchor.setPlan`
- `anchor.getTrajectory`
- `anchor.recordEvent`
- `anchor.getCIStatus`
- `anchor.requestCIFix`
- `anchor.auditPR`
- `anchor.getDriftReport`

These tools delegate to the same libraries used by the CLI so local commands and cloud-agent actions share behavior.

## GitHub And CI To Sidecar

GitHub operations use `@octokit/rest` when `GITHUB_TOKEN` or `gh auth token` is available. Missing credentials produce clear no-ops for operations that can safely skip remote reads or mutations.

CI failures feed the Flail Index. Three sequential failures trigger sidecar quarantine even during Nursery.

## Sidecar To DriftReport

The sidecar accepts JSON telemetry and returns:

```json
{
  "severity": "none|low|medium|high|quarantine",
  "phase": "NURSERY|MONITORING|QUARANTINE",
  "decision": "NURSERY_RECORDED|NURSERY_GRADUATED|MONITORING_VERIFIED|RE_NURSERY_INITIATED|QUARANTINE_TRIGGERED|REJECTED_QUARANTINE_LOCK",
  "metrics": {
    "SDI": 0,
    "AHR": 0,
    "TMCR": 0,
    "CCDC": 0,
    "CFS": 0,
    "FI": 0
  },
  "alarms": [],
  "message": "..."
}
```

The Node bridge persists the latest sidecar state under `state.json.sidecar` and appends `drift-flag` events to trajectory.

## State And Secrets

All runtime state lives under `~/.anchor/<repo-slug>/`. API keys are never stored there; they are read from process environment variables at call time.
