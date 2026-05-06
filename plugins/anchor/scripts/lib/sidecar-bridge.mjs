import { readState } from "./state.mjs";

export async function getSidecarReport(slug, env = process.env) {
  const state = await readState(slug, env);
  const sidecar = state?.sidecar || {};
  return {
    available: true,
    phase: sidecar.phase || "NURSERY",
    quarantine: !!sidecar.quarantine,
    metrics: sidecar.lastDecision?.metrics || null,
    lastDecision: sidecar.lastDecision || null
  };
}

export async function evaluateTelemetry(slug, telemetry = {}, env = process.env) {
  const current = await getSidecarReport(slug, env);
  return {
    ...current,
    telemetryAccepted: true,
    telemetry
  };
}
