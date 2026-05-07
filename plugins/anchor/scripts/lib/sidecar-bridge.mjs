import { spawn } from "node:child_process";
import { readState, writeState } from "./state.mjs";
import { readPlan } from "./plan.mjs";
import { recordEvent } from "./trajectory.mjs";
import { pluginRoot } from "./paths.mjs";
import { computeAHR } from "./heuristics/ahr.mjs";

export async function getSidecarReport(slug, env = process.env) {
  const state = await readState(slug, env);
  const sidecar = state?.sidecar || {};
  return {
    available: true,
    phase: sidecar.phase || "NURSERY",
    quarantine: !!sidecar.quarantine,
    metrics: sidecar.lastDecision?.metrics || null,
    lastDecision: sidecar.lastDecision || null,
    report: sidecar.lastDecision || null
  };
}

export async function evaluateTelemetry(slug, telemetry = {}, env = process.env) {
  const state = await readState(slug, env);
  if (!state?.optedIn) {
    return { ok: false, skipped: true, message: "Anchor is not opted in for this repo." };
  }

  // Attach actor identity (real-world: git user or session user)
  const actorId = telemetry.actorId || telemetry.actor_id || telemetry.committer || process.env.GIT_AUTHOR_EMAIL || "unknown";

  // Production AHR wiring (arXiv:2604.03173): compute detailed breakdown on JS side
  // where we have real filesystem access to package.json + node_modules.
  const ahrBreakdown = await computeAHR(telemetry, { repoRoot: telemetry.repoRoot || process.cwd() });

  const enrichedTelemetry = {
    ...telemetry,
    actor_id: actorId,
    ahr: ahrBreakdown.value,
    ahr_breakdown: ahrBreakdown,
    // Real deception signals will be populated by callers (hooks, pr-audit, sync, etc.)
    // For now we pass through whatever the caller provides
  };

  const payload = {
    telemetry: enrichedTelemetry,
    state: state.sidecar || {},
    northStarDoc: (await readPlan(slug, env)) || "",
    repo: telemetry.repo || {},
    knownPackages: telemetry.knownPackages || []
  };
  const result = await runPythonSidecar(payload, env);
  const report = {
    ...(result.report || {}),
    actor_id: actorId,
    ahr_breakdown: enrichedTelemetry.ahr_breakdown || null
  };
  const nextSidecar = {
    ...(state.sidecar || {}),
    ...(result.state || {}),
    phase: report?.phase || result.state?.phase || state.sidecar?.phase || "NURSERY",
    quarantine: report?.severity === "quarantine" || !!result.state?.quarantine,
    lastDecision: report
  };
  await writeState(slug, { ...state, sidecar: nextSidecar }, env);
  await recordEvent(slug, "drift-flag", { source: "sidecar", report }, env);

  // Self-correction loop hook (paper result: 6-79x error reduction)
  if (report?.severity === "quarantine" && enrichedTelemetry.ahr_breakdown?.hallucinated?.length > 0) {
    await recordEvent(slug, "remediation-required", {
      type: "AHR",
      hallucinated: enrichedTelemetry.ahr_breakdown.hallucinated,
      stale: enrichedTelemetry.ahr_breakdown.stale || [],
      instruction: "Run urlhealth (or equivalent verification) on the listed imports, then submit a clean diff/PR.",
    }, env);
  }

  return { ok: true, report, state: nextSidecar };
}

async function runPythonSidecar(payload, env) {
  const python = env.PYTHON || env.PYTHON_BIN || "python3";
  const sidecarPath = `${pluginRoot()}/sidecar`;
  const child = spawn(python, ["-m", "anchor_drift_quotient"], {
    env: { ...env, PYTHONPATH: [sidecarPath, env.PYTHONPATH].filter(Boolean).join(":") },
    stdio: ["pipe", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.end(JSON.stringify(payload));

  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  if (code !== 0) {
    throw new Error(`Sidecar exited ${code}: ${stderr.trim() || "no stderr"}`);
  }
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Sidecar returned invalid JSON: ${error.message}`);
  }
}
