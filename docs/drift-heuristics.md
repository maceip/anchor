# Drift Heuristics

Anchor combines practical PR-level checks with the Drift Quotient sidecar. Practical heuristics are immediate and explainable. Sidecar metrics add statistical monitoring over time.

| Signal | Source | Detects | Enforcement behavior |
| --- | --- | --- | --- |
| Verbosity smell | PR description + diff stats | Padding / evasive PR | Warn or block |
| Infra rat-hole smell | File paths + branch + plan | Infra drift | Require plan note or infra prefix |
| Evasion smell | PR prose | Placeholders / deferral | Block if severe |
| Plan drift smell | Files + active phase | Wrong scope | Require plan alignment |
| SDI | LLM intent vector + North Star | Semantic divergence / orthogonal quality trap | CUSUM or direct severity |
| AHR | Imports + CI logs | Hallucinated APIs | Zero-tolerance quarantine |
| TMCR | Test bytes vs source bytes | Test-loop hacking | CUSUM drift |
| CCDC | AST complexity delta / LOC | Spaghetti logic | CUSUM drift |
| CFS | AST clone density | Duplicated utilities / lost context | CUSUM drift |
| FI | Sequential CI failures + velocity | Flailing | Immediate quarantine after threshold |

## Practical Signals

Practical signals are computed in `plugins/anchor/scripts/lib/drift.mjs`. They are pure functions and are used by PR audit even when GitHub, Cursor, or Python sidecar dependencies are unavailable.

## Drift Quotient Metrics

Sidecar metrics are computed in `plugins/anchor/sidecar/anchor_drift_quotient/`. AHR and FI can quarantine immediately. SDI, TMCR, CCDC, and CFS are baselined during Nursery and monitored by CUSUM after graduation.

## Enforcement

Medium or higher drift can produce blocking PR audit language. Quarantine state is persisted in `state.json`, surfaced in `/anchor-status`, returned by `anchor.getDriftReport`, and recorded as `drift-flag` trajectory events.
