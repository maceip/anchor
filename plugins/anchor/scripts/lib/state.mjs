import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { cacheDir, planPath, runsDir, stateDir, statePath } from "./paths.mjs";

export function defaultSidecarState() {
  return {
    phase: "NURSERY",
    commitCount: 0,
    stableCommitsStreak: 0,
    recentCiFailures: 0,
    quarantine: false,
    lastDecision: null
  };
}

export function defaultState({ slug, repoUrl = null, branch = "main" } = {}) {
  return {
    optedIn: false,
    repoUrl,
    slug,
    branch,
    cloudAgentId: null,
    lastSyncedSha: null,
    lastPlanRegenAt: null,
    webhookSecret: null,
    sidecar: defaultSidecarState()
  };
}

export async function ensureStateDirs(slug, env = process.env) {
  await mkdir(stateDir(slug, env), { recursive: true });
  await mkdir(runsDir(slug, env), { recursive: true });
  await mkdir(cacheDir(slug, env), { recursive: true });
}

export async function readState(slug, env = process.env) {
  const file = statePath(slug, env);
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    return normalizeState(parsed, slug);
  } catch {
    return null;
  }
}

export function normalizeState(state, slug = state?.slug) {
  return {
    ...defaultState({ slug }),
    ...state,
    slug: state?.slug || slug,
    sidecar: {
      ...defaultSidecarState(),
      ...(state?.sidecar || {})
    }
  };
}

export async function writeState(slug, state, env = process.env) {
  await ensureStateDirs(slug, env);
  const normalized = normalizeState(state, slug);
  await writeFile(statePath(slug, env), `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export async function updateState(slug, updater, env = process.env) {
  const current = (await readState(slug, env)) || defaultState({ slug });
  const next = await updater(current);
  return writeState(slug, next, env);
}

export async function ensurePlanFile(slug, markdown, env = process.env) {
  const file = planPath(slug, env);
  if (existsSync(file)) return false;
  await ensureStateDirs(slug, env);
  await writeFile(file, markdown);
  return true;
}
