---
name: anchor-opt-out
description: Marks state.json with optedIn:false. Leaves history and the durable cloud agent reattachable for future opt-in.
---

# /anchor-opt-out

- Sets `optedIn: false` in `~/.anchor/<repo-slug>/state.json`
- Does not delete trajectory, plan, or runs
- Cloud agent remains attachable by ID on next opt-in
- All hooks and commands become silent no-ops until re-opt-in

Use this to temporarily pause Anchor without losing state.