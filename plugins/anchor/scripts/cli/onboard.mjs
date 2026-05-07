import { readState } from "../lib/state.mjs";
import { resolveSlug } from "../lib/paths.mjs";
import { recordEvent } from "../lib/trajectory.mjs";
import { buildAnchorDashboardModel, writeAnchorDashboard } from "../lib/canvas-dashboard.mjs";

export async function run(args = []) {
  return runOnboard({
    force: args.includes("--force"),
    noDashboard: args.includes("--no-dashboard")
  });
}

export async function runOnboard({ force = false, noDashboard = false, env = process.env } = {}) {
  const slug = resolveSlug({ repoUrl: process.env.GIT_REMOTE_URL || "" });

  console.log("\n🚀 Anchor Onboarding\n");

  // 1. Opt-in
  console.log("  [1/4] Opting in to Anchor...");
  try {
    const { optIn } = await import("./opt-in.mjs");
    await optIn({ env });
  } catch (e) {
    console.log("    (already opted in or skipped cloud agent)");
  }

  // 2. Install dashboard
  if (!noDashboard) {
    console.log("  [2/4] Generating production dashboard canvas...");
    try {
      const model = await buildAnchorDashboardModel(slug, { env });
      const { filePath } = await writeAnchorDashboard(model, { env });
      console.log(`    ✓ Generated at ${filePath}`);
      await recordEvent(slug, "dashboard-installed", { path: filePath }, env);
    } catch (err) {
      console.log("    (could not generate dashboard — you can run `anchor dashboard` later)");
    }
  }

  // 3. Health check (AHR + sidecar)
  console.log("  [3/4] Running quick health check...");
  try {
    const { evaluateTelemetry } = await import("../lib/sidecar-bridge.mjs");
    const result = await evaluateTelemetry(slug, {
      commitHash: "onboard-check",
      commitMessage: "Anchor onboarding health check",
      newImports: [],
      actor_id: "onboard"
    }, env);

    if (result.ok) {
      console.log("    ✓ Sidecar responsive");
      console.log(`    ✓ Current phase: ${result.state?.phase || "NURSERY"}`);
    }
  } catch {
    console.log("    (sidecar check skipped — will initialize on first real event)");
  }

  // 4. Welcome
  console.log("  [4/4] Finalizing...\n");

  const state = await readState(slug, env);
  const phase = state?.sidecar?.phase || "NURSERY";

  console.log("✅ Anchor is now active on this repository.\n");
  console.log("Next steps:");
  console.log("  • Open the canvas panel → select \"anchor-dashboard\"");
  console.log("  • Create a North Star plan:  /anchor-plan");
  console.log("  • Make a code change — watch real-time drift metrics");
  console.log("  • Try fabricating an import — AHR will quarantine it\n");

  console.log(`Current status: ${phase}  |  Quarantine: ${state?.sidecar?.quarantine ? "ACTIVE" : "clear"}\n`);

  await recordEvent(slug, "onboard-complete", { phase }, env);

  return { ok: true, slug, phase };
}
