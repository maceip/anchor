import { parseArgs } from "./args.mjs";
import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { DEFAULT_PLAN, ensurePlan, readPlan, writePlan } from "../lib/plan.mjs";
import { recordEvent } from "../lib/trajectory.mjs";
import { updateState } from "../lib/state.mjs";

export async function run(args) {
  const options = parseArgs(args);
  const slug = resolveSlug({ repoUrl: detectRepoUrl() });
  if (options.regenerate) {
    await writePlan(slug, DEFAULT_PLAN);
    await updateState(slug, (state) => ({ ...state, lastPlanRegenAt: new Date().toISOString() }));
    await recordEvent(slug, "plan-change", { action: "regenerate-local-fallback" });
    return `Regenerated plan for ${slug}.`;
  }
  await ensurePlan(slug);
  return (await readPlan(slug)) || "";
}
