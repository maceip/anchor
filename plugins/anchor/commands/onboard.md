---
name: anchor-onboard
description: One-command onboarding for Anchor. Opts you in, installs the production dashboard canvas, runs a health check, and activates anti-drift protection.
---

# /anchor-onboard

**The single entry point for new users.**

Behavior:
- Runs `anchor opt-in` (creates state, ensures cloud agent, environment template).
- Generates the official Anchor Dashboard canvas in Cursor's managed workspace canvas directory.
- Runs a quick sidecar + AHR smoke test.
- Prints a beautiful welcome banner with:
  - Current status (NURSERY / opted-in)
  - How to open the dashboard
  - Next steps (create plan, make a change, watch quarantine)
- Idempotent and safe to re-run.

This is the **recommended first command** after installing the Anchor plugin.

Implementation: ultimately invokes
node plugins/anchor/scripts/anchor-cli.mjs onboard [--force] [--no-dashboard]
