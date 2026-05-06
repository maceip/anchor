import { appendFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { trajectoryPath } from "./paths.mjs";
import { ensureStateDirs, readState, writeState } from "./state.mjs";
import { commitsSince, headSha } from "./git.mjs";

export async function recordEvent(slug, type, data = {}, env = process.env) {
  await ensureStateDirs(slug, env);
  const event = { ts: new Date().toISOString(), type, data };
  await appendFile(trajectoryPath(slug, env), `${JSON.stringify(event)}\n`);
  return event;
}

export async function tail(slug, limit = 5, env = process.env) {
  const file = trajectoryPath(slug, env);
  if (!existsSync(file)) return [];
  const raw = await readFile(file, "utf8");
  return raw
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { ts: null, type: "corrupt", data: { line } };
      }
    });
}

export async function sync(slug, { cwd = process.cwd(), env = process.env } = {}) {
  const state = await readState(slug, env);
  if (!state?.optedIn) {
    return { synced: 0, message: "Anchor is not opted in for this repo." };
  }

  const commits = commitsSince(state.lastSyncedSha, cwd);
  for (const commit of commits) {
    await recordEvent(slug, "commit", commit, env);
  }

  const sha = headSha(cwd);
  if (sha && (commits.length > 0 || !state.lastSyncedSha)) {
    await writeState(slug, { ...state, lastSyncedSha: sha }, env);
  }

  return { synced: commits.length, headSha: sha };
}
