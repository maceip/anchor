# Anchor Architecture

This document describes the data flow for the Anchor anti-drift plugin. Implementation is phased; the current code includes the local Node CLI, state stores, hooks, drift heuristics, and a minimal MCP server. Cursor cloud agent, GitHub mutation, and sidecar paths are token-gated or planned as described in `plan`.

## Core flows

Commands → CLI (anchor-cli.mjs) → lib/ (state, trajectory, git, github, cursor-agent, drift, pr-audit, ci-watch, sidecar-bridge) → MCP / SDK / Octokit

Hooks → session telemetry → .session.json + trajectory.jsonl (lightweight, <200ms)

MCP server → cloud agent tools (getPlan, recordEvent, auditPR, getDriftReport, ...)

GitHub / CI → telemetry → sidecar (when available) → DriftReport → PR audit / status / quarantine

Sidecar (Python) → CUSUM on SDI/AHR/TMCR/CCDC/CFS/FI → Nursery → Monitoring → Quarantine / Re-nursery

plan.md is the North Star for both practical heuristics and statistical sidecar.

All state lives under `~/.anchor/<repo-slug>/` (never in repo, no secrets).

See `plan` for detailed component list, metrics, and phase breakdown.
