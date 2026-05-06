import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";
import { defaultState, readState, writeState } from "../lib/state.mjs";
import { recordEvent } from "../lib/trajectory.mjs";

export async function run() {
  const repoUrl = detectRepoUrl();
  const slug = resolveSlug({ repoUrl });
  const state = (await readState(slug)) || defaultState({ slug, repoUrl });
  await writeState(slug, { ...state, optedIn: false });
  await recordEvent(slug, "session-summary", { action: "opt-out" });
  return `Anchor opted out for ${slug}. State and trajectory were kept.`;
}
