import { parseArgs } from "./args.mjs";
import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { requestFix } from "../lib/ci-watch.mjs";

export async function run(args) {
  const options = parseArgs(args);
  const repoUrl = detectRepoUrl();
  const slug = resolveSlug({ repoUrl });
  const result = await requestFix(slug, { repo: repoUrl, runId: options.runId });
  if (!result.ok && result.message) return result.message;
  if (result.skipped) return result.message;
  return `Anchor CI repair requested for run ${result.run?.id}. Log: ${result.logFile}`;
}
