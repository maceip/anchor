---
name: anchor-dashboard
description: Generates the native Cursor Canvas dashboard for Anchor repository enrollment and committer health.
---

# /anchor-dashboard

Creates or refreshes `anchor-dashboard.canvas.tsx` in Cursor's managed canvas directory for the current workspace. The dashboard embeds local Anchor state, repository enrollment, committer scores, and recent trajectory events.

The setup surface uses a WebTUI-derived Midnight Commander layout for staging repositories. Once repositories are active, the monitoring surface emphasizes htop-style bars, status badges, and dense trajectory tables.

Implementation: ultimately invokes
node plugins/anchor/scripts/anchor-cli.mjs dashboard [--open] [--serve] [--port=4177]
