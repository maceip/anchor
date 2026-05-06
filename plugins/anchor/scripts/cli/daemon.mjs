import { setTimeout as sleep } from "node:timers/promises";
import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { sync } from "../lib/trajectory.mjs";

export async function run(args) {
  const once = args.includes("--once") || process.env.ANCHOR_DAEMON_ONCE === "1";
  const slug = resolveSlug({ repoUrl: detectRepoUrl() });
  do {
    const result = await sync(slug);
    console.log(`[Anchor] daemon sync: ${result.synced || 0} event(s)`);
    if (once) break;
    await sleep(60_000);
  } while (true);
  return "";
}
