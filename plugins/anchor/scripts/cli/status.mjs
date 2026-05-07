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
    "recentActors:",
    ...getRecentActors(events),
    "trajectoryTail:",
    ...events.slice(-3).map((event) => `- ${event.ts} ${event.type} ${JSON.stringify(event.data)}`)
  ].join("\n");
}

function getRecentActors(events) {
  const actors = new Map();
  for (const ev of events) {
    const id = ev.data?.actor_id || ev.data?.author || ev.data?.committer || ev.data?.actorId;
    if (id && id !== "unknown") {
      if (!actors.has(id)) {
        actors.set(id, { lastSeen: ev.ts, events: 0, metrics: null });
      }
      actors.get(id).events += 1;
      actors.get(id).lastSeen = ev.ts;

      // Capture latest known per-actor drift metrics from drift-flag events
      if (ev.type === "drift-flag" && ev.data?.report?.metrics) {
        actors.get(id).metrics = ev.data.report.metrics;
        if (ev.data.report.ahr_breakdown) {
          actors.get(id).ahrBreakdown = ev.data.report.ahr_breakdown;
        }
      }
    }
  }
  if (actors.size === 0) return ["  (no actor data yet)"];

  return Array.from(actors.entries()).slice(0, 6).map(([id, info]) => {
    const metricsStr = info.metrics
      ? Object.entries(info.metrics)
          .filter(([k]) => ["NFR","FFR","DFR","HFR","IDR","SDI","AHR"].includes(k))
          .map(([k,v]) => `${k}:${v}`)
          .join(" ")
      : "";
    let ahrDetail = "";
    if (info.ahrBreakdown) {
      const b = info.ahrBreakdown;
      ahrDetail = ` AHR[h:${b.hallucinated?.length || 0} s:${b.stale?.length || 0} clean:${b.verified_clean || 0}]`;
    }
    return `  ${id} — ${info.events} events, last ${info.lastSeen}${metricsStr ? ` | ${metricsStr}` : ""}${ahrDetail}`;
  });
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
