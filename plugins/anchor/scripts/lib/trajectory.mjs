import { appendFile, readFile, truncate } from "node:fs/promises";
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
  await recoverTrailingPartialLine(file);
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

export async function recoverTrailingPartialLine(file) {
  const raw = await readFile(file, "utf8");
  if (!raw || raw.endsWith("\n")) return false;
  const lastNewline = raw.lastIndexOf("\n");
  const lastLine = lastNewline === -1 ? raw : raw.slice(lastNewline + 1);
  try {
    JSON.parse(lastLine);
    return false;
  } catch {
    await truncate(file, Math.max(0, lastNewline + 1));
    return true;
  }
}

export async function sync(slug, { cwd = process.cwd(), env = process.env } = {}) {
  const state = await readState(slug, env);
  if (!state?.optedIn) {
    return { synced: 0, message: "Anchor is not opted in for this repo." };
  }

  const commits = commitsSince(state.lastSyncedSha, cwd);
  for (const commit of commits) {
    await recordEvent(slug, "commit", commit, env);
    try {
      const { evaluateTelemetry } = await import("./sidecar-bridge.mjs");
      await evaluateTelemetry(slug, {
        commitHash: commit.sha,
        commitMessage: commit.subject,
        ciBuildStatus: "SUCCESS",
        linesOfCodeChanged: 0,
        testBytesChanged: 0,
        srcBytesChanged: 0,
        newImports: []
      }, env);
    } catch {
      // Sidecar telemetry must not block local sync.
    }
  }

  const sha = headSha(cwd);
  if (sha && (commits.length > 0 || !state.lastSyncedSha)) {
    const latestState = (await readState(slug, env)) || state;
    await writeState(slug, { ...latestState, lastSyncedSha: sha }, env);
  }

  return { synced: commits.length, headSha: sha };
}
