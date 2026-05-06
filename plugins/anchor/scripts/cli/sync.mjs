import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { sync } from "../lib/trajectory.mjs";

export async function run() {
  const slug = resolveSlug({ repoUrl: detectRepoUrl() });
  const result = await sync(slug);
  if (result.message) return result.message;
  return `Anchor sync complete for ${slug}: ${result.synced} commit event(s), head ${result.headSha || "unknown"}.`;
}
