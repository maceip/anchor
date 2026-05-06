import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { planPath } from "./paths.mjs";
import { ensureStateDirs } from "./state.mjs";

export const DEFAULT_PLAN = `## Mission

Maintain project trajectory, keep CI green, and prevent PR drift.

## Phases

- Bootstrap Anchor state and local tooling.
- Wire cloud, GitHub, MCP, and sidecar integrations.
- Harden with tests and dogfood CI.

## Active phase

Bootstrap Anchor state and local tooling.

## Recent decisions

- Anchor state lives under ~/.anchor/<repo-slug>/.
`;

export async function ensurePlan(slug, env = process.env) {
  const file = planPath(slug, env);
  if (existsSync(file)) return false;
  await ensureStateDirs(slug, env);
  await writeFile(file, DEFAULT_PLAN);
  return true;
}

export async function readPlan(slug, env = process.env) {
  const file = planPath(slug, env);
  if (!existsSync(file)) return null;
  return readFile(file, "utf8");
}

export async function writePlan(slug, markdown, env = process.env) {
  await ensureStateDirs(slug, env);
  await writeFile(planPath(slug, env), markdown.endsWith("\n") ? markdown : `${markdown}\n`);
}

export function activePhase(markdown) {
  if (!markdown) return null;
  const match = markdown.match(/^## Active phase\s*([\s\S]*?)(?=^## |\s*$)/m);
  if (!match) return null;
  const text = match[1].trim();
  return text || null;
}
