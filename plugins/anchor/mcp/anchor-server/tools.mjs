import { detectRepoUrl, resolveSlug } from "../../scripts/lib/paths.mjs";
import { readPlan, writePlan } from "../../scripts/lib/plan.mjs";
import { tail, recordEvent } from "../../scripts/lib/trajectory.mjs";
import { readState } from "../../scripts/lib/state.mjs";
import { requestFix } from "../../scripts/lib/ci-watch.mjs";
import { auditPR } from "../../scripts/lib/pr-audit.mjs";
import { getSidecarReport } from "../../scripts/lib/sidecar-bridge.mjs";

export const toolDefinitions = [
  tool("anchor.getPlan", "Read Anchor plan.md for the current or provided slug."),
  tool("anchor.setPlan", "Replace Anchor plan.md for the current or provided slug."),
  tool("anchor.getTrajectory", "Read recent Anchor trajectory rows."),
  tool("anchor.recordEvent", "Append an Anchor trajectory event."),
  tool("anchor.getCIStatus", "Read stored CI status from Anchor state."),
  tool("anchor.requestCIFix", "Ask Anchor to repair a failing CI run."),
  tool("anchor.auditPR", "Run Anchor PR drift audit."),
  tool("anchor.getDriftReport", "Return practical and sidecar drift status.")
];

export async function callTool(name, args = {}) {
  const slug = args.slug || resolveSlug({ repoUrl: detectRepoUrl() });
  if (name === "anchor.getPlan") {
    return { markdown: await readPlan(slug), slug };
  }
  if (name === "anchor.setPlan") {
    await writePlan(slug, String(args.markdown || ""));
    await recordEvent(slug, "plan-change", { source: "mcp" });
    return { ok: true, slug };
  }
  if (name === "anchor.getTrajectory") {
    return { slug, events: await tail(slug, Number(args.limit || 20)) };
  }
  if (name === "anchor.recordEvent") {
    return recordEvent(slug, args.event?.type || "drift-flag", args.event?.data || args.event || {});
  }
  if (name === "anchor.getCIStatus") {
    const state = await readState(slug);
    return { slug, recentCiFailures: state?.sidecar?.recentCiFailures || 0, lastCiStatus: state?.lastCiStatus || null };
  }
  if (name === "anchor.requestCIFix") {
    return requestFix(slug, { repo: args.repo || detectRepoUrl(), runId: args.runId });
  }
  if (name === "anchor.auditPR") {
    const plan = await readPlan(slug);
    return auditPR({ slug, repo: args.repo || detectRepoUrl(), number: args.prNumber, plan: plan || "", postComment: !!args.postComment });
  }
  if (name === "anchor.getDriftReport") {
    const state = await readState(slug);
    const sidecar = await getSidecarReport(slug);
    return {
      slug,
      practical: { signals: [] },
      sidecar,
      phase: sidecar.phase,
      quarantine: !!sidecar.quarantine || !!state?.sidecar?.quarantine,
      recommendedAction: sidecar.quarantine ? "quarantine" : "monitor"
    };
  }
  throw new Error(`Unknown Anchor MCP tool: ${name}`);
}

function tool(name, description) {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: true
    }
  };
}
