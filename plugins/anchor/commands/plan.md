---
name: anchor-plan
description: Shows the current plan.md or, with --regenerate, dispatches the plan-archaeologist to derive a fresh plan from history and writes it back.
---

# /anchor-plan [--regenerate]

Without flag:
- Print the contents of `~/.anchor/<repo-slug>/plan.md`
- Highlight the Active phase section

With --regenerate:
- Invoke the plan-archaeologist agent
- Write the resulting markdown to plan.md
- Record a plan-change event
- Update state.lastPlanRegenAt

Humans edit plan.md freely; regeneration is only for bootstrap or re-baselining.