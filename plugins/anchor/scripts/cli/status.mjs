import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { anchorHome, detectRepoUrl, resolveSlug, statePath } from "../lib/paths.mjs";
import { readPlan, activePhase } from "../lib/plan.mjs";
import { readState } from "../lib/state.mjs";
import { tail } from "../lib/trajectory.mjs";

export async function run() {
  const slug = await resolveStatusSlug();
  const state = await readState(slug);
  if (!state?.optedIn) return `Anchor is not opted in for ${slug}.`;
  const plan = await readPlan(slug);
  const events = await tail(slug, 5);
  return [
    `Anchor status for ${slug}`,
    `optedIn: ${state.optedIn}`,
    `cloudAgentId: ${state.cloudAgentId || "not attached"}`,
    `branch: ${state.branch || "unknown"}`,
    `planPhase: ${activePhase(plan) || "none"}`,
    `sidecarPhase: ${state.sidecar?.phase || "NURSERY"}`,
    `quarantine: ${!!state.sidecar?.quarantine}`,
    `sidecarMetrics: ${JSON.stringify(state.sidecar?.lastDecision?.metrics || {})}`,
    `sidecarDecision: ${state.sidecar?.lastDecision?.decision || "none"}`,
    `lastSyncedSha: ${state.lastSyncedSha || "none"}`,
    "trajectoryTail:",
    ...events.map((event) => `- ${event.ts} ${event.type} ${JSON.stringify(event.data)}`)
  ].join("\n");
}

async function resolveStatusSlug(env = process.env) {
  const detected = resolveSlug({ repoUrl: detectRepoUrl() });
  if (existsSync(statePath(detected, env))) return detected;
  try {
    const entries = await readdir(anchorHome(env), { withFileTypes: true });
    const slugs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((slug) => existsSync(path.join(anchorHome(env), slug, "state.json")));
    if (slugs.length === 1) return slugs[0];
  } catch {}
  return detected;
}
