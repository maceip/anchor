import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "./args.mjs";
import { detectBranch, detectRepoUrl, resolveSlug, templatePath } from "../lib/paths.mjs";
import { defaultState, readState, writeState } from "../lib/state.mjs";
import { ensurePlan } from "../lib/plan.mjs";
import { recordEvent } from "../lib/trajectory.mjs";
import { ensure, MissingCursorKeyError } from "../lib/cursor-agent.mjs";

export async function run(args) {
  const options = parseArgs(args);
  const repoUrl = options.repoUrl || detectRepoUrl() || null;
  const branch = detectBranch();
  const slug = resolveSlug({ repoUrl });
  const current = (await readState(slug)) || defaultState({ slug, repoUrl, branch });
  let state = await writeState(slug, { ...current, optedIn: true, repoUrl, branch });
  await ensurePlan(slug);
  await copyEnvironmentTemplate();
  await recordEvent(slug, "plan-change", { action: "opt-in", branch, repoUrl });

  let cloud = "skipped (--no-cloud)";
  if (!options.noCloud) {
    try {
      const result = await ensure({ slug, repoUrl, branch });
      state = await readState(slug);
      cloud = result.reattached ? `reattached ${result.agentId}` : `created ${result.agentId}`;
    } catch (error) {
      if (error instanceof MissingCursorKeyError) {
        cloud = error.message;
      } else {
        throw error;
      }
    }
  }

  return `Anchor opted in for ${slug}\nstate: ${state.slug}\ncloud: ${cloud}`;
}

async function copyEnvironmentTemplate() {
  const cursorDir = path.join(process.cwd(), ".cursor");
  const target = path.join(cursorDir, "environment.json");
  if (existsSync(target)) return false;
  await mkdir(cursorDir, { recursive: true });
  await copyFile(templatePath("environment.json.example"), target);
  return true;
}
