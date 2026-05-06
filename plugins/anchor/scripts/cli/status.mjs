import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { readPlan, activePhase } from "../lib/plan.mjs";
import { readState } from "../lib/state.mjs";
import { tail } from "../lib/trajectory.mjs";

export async function run() {
  const slug = resolveSlug({ repoUrl: detectRepoUrl() });
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
    `lastSyncedSha: ${state.lastSyncedSha || "none"}`,
    "trajectoryTail:",
    ...events.map((event) => `- ${event.ts} ${event.type} ${JSON.stringify(event.data)}`)
  ].join("\n");
}
