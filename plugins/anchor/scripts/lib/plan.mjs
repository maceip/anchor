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

export const REQUIRED_PLAN_SECTIONS = ["Mission", "Phases", "Active phase", "Recent decisions"];

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

export function hasRequiredSections(markdown) {
  return REQUIRED_PLAN_SECTIONS.every((section) => new RegExp(`^## ${escapeRegExp(section)}\\s*$`, "m").test(markdown || ""));
}

export function serializePlan({ mission, phases, activePhase: phase, recentDecisions }) {
  return `## Mission

${mission || ""}

## Phases

${listify(phases)}

## Active phase

${phase || ""}

## Recent decisions

${listify(recentDecisions)}
`;
}

function listify(value) {
  if (Array.isArray(value)) return value.map((entry) => `- ${entry}`).join("\n");
  return value || "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
