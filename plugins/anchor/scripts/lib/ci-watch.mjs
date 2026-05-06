import { writeFile } from "node:fs/promises";
import { listFailingRuns, getRunLogs } from "./github.mjs";
import { runLogPath, send } from "./cursor-agent.mjs";
import { recordEvent } from "./trajectory.mjs";
import { readState, writeState } from "./state.mjs";
import { evaluateTelemetry } from "./sidecar-bridge.mjs";

export async function findLatestFailing(slug, { repo, env = process.env } = {}) {
  const result = await listFailingRuns(repo, { env });
  if (!result.ok) return result;
  return { ok: true, run: result.runs[0] || null };
}

export async function requestFix(slug, { repo, runId = null, env = process.env } = {}) {
  const state = await readState(slug, env);
  if (!state?.optedIn) return { ok: false, skipped: true, message: "Anchor is not opted in for this repo." };

  const failing = runId ? { ok: true, run: { id: runId } } : await findLatestFailing(slug, { repo, env });
  if (!failing.ok) return failing;
  if (!failing.run) return { ok: true, skipped: true, message: "No failing GitHub Actions run found." };

  const logs = await getRunLogs(repo, failing.run.id, { env });
  const logFile = runLogPath(slug, failing.run.id, env);
  await writeFile(logFile, typeof logs.logs === "string" ? logs.logs : JSON.stringify(logs, null, 2));

  const nextSidecar = {
    ...state.sidecar,
    recentCiFailures: Number(state.sidecar?.recentCiFailures || 0) + 1
  };
  await writeState(slug, { ...state, sidecar: nextSidecar }, env);
  await recordEvent(slug, "ci-run", { runId: failing.run.id, logFile, conclusion: "failure" }, env);
  await evaluateTelemetry(slug, {
    commitHash: String(failing.run.head_sha || failing.run.id),
    commitMessage: failing.run.display_title || `CI failure ${failing.run.id}`,
    ciBuildStatus: "FAILURE",
    ciLogPayload: typeof logs.logs === "string" ? logs.logs : JSON.stringify(logs),
    linesOfCodeChanged: 0,
    testBytesChanged: 0,
    srcBytesChanged: 0,
    newImports: []
  }, env);

  try {
    const agentRun = await send({
      slug,
      persona: "ci-fixer",
      prompt: `Fix GitHub Actions run ${failing.run.id}. Logs are stored at ${logFile}.`,
      env
    });
    return { ok: true, run: failing.run, logFile, agentRun };
  } catch (error) {
    return { ok: true, run: failing.run, logFile, skipped: true, message: error.message };
  }
}
