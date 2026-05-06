import { spawn } from "node:child_process";
import { readState, writeState } from "./state.mjs";
import { readPlan } from "./plan.mjs";
import { recordEvent } from "./trajectory.mjs";
import { pluginRoot } from "./paths.mjs";

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
  const payload = {
    telemetry,
    state: state.sidecar || {},
    northStarDoc: (await readPlan(slug, env)) || "",
    repo: telemetry.repo || {},
    knownPackages: telemetry.knownPackages || []
  };
  const result = await runPythonSidecar(payload, env);
  const report = result.report;
  const nextSidecar = {
    ...(state.sidecar || {}),
    ...(result.state || {}),
    phase: report?.phase || result.state?.phase || state.sidecar?.phase || "NURSERY",
    quarantine: report?.severity === "quarantine" || !!result.state?.quarantine,
    lastDecision: report
  };
  await writeState(slug, { ...state, sidecar: nextSidecar }, env);
  await recordEvent(slug, "drift-flag", { source: "sidecar", report }, env);
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

  const code = await new Promise((resolve) => {
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
