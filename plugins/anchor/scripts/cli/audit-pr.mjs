import { parseArgs } from "./args.mjs";
import { detectBranch, detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { readPlan } from "../lib/plan.mjs";
import { auditPR } from "../lib/pr-audit.mjs";

export async function run(args) {
  const options = parseArgs(args);
  const number = options._[0];
  if (!number) throw new Error("Usage: anchor audit-pr <number>");
  const repoUrl = detectRepoUrl();
  const slug = resolveSlug({ repoUrl });
  const plan = (await readPlan(slug)) || "";
  const result = await auditPR({
    slug,
    repo: repoUrl,
    number,
    plan,
    branchName: detectBranch(),
    postComment: !options.noComment
  });
  if (!result.ok) return result.message;
  return JSON.stringify(result.report, null, 2);
}
