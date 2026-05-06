---
name: anchor-opt-in
description: Marks the current repository as opted in to Anchor. Creates ~/.anchor/<slug>/ state, ensures a durable cloud agent, and copies the environment template if absent.
---

# /anchor-opt-in

Behavior:
- Detect current repo (or accept --repo-url).
- Write `~/.anchor/<slug>/state.json` with optedIn: true.
- Ensure the directory exists.
- Unless --no-cloud, call the Cursor SDK wrapper to ensure/attach a durable cloud agent.
- If `.cursor/environment.json` is absent, copy the template from the plugin.
- Idempotent: running twice is safe.

This is the entry point that activates all Anchor hooks, CLI commands, and the cloud agent for the repository.

Implementation: ultimately invokes
node plugins/anchor/scripts/anchor-cli.mjs opt-in [--repo-url URL] [--no-cloud]