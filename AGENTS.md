# AGENTS.md

## Cursor Cloud specific instructions

This is a **Cursor Plugin Template** repository — a static scaffold for building and publishing Cursor Marketplace plugins. There are no runtime services, databases, or web servers.

### Validation (lint/test equivalent)

```bash
node scripts/validate-template.mjs
```

This is the only test command. It validates JSON manifests, file paths, frontmatter structure, and plugin naming conventions. Exit code 0 means all checks pass.

### Repository structure

- `.cursor-plugin/marketplace.json` — multi-plugin registry
- `plugins/starter-simple/` — minimal plugin (rules + skills only)
- `plugins/starter-advanced/` — full-featured plugin (rules, skills, agents, commands, hooks, MCP, scripts)
- `scripts/validate-template.mjs` — the validation/lint script
- `docs/add-a-plugin.md` — instructions for adding new plugins

### Notes

- There is no `package.json` or lockfile; the only dependency is Node.js (installed via the update script).
- The hook scripts in `plugins/starter-advanced/scripts/` are placeholders — they print messages but perform no real work.
- Warnings from the validation script (e.g., missing `hooks.json` or `mcp.json`) are informational and do not indicate failure.
