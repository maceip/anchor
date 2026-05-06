import { activePhase } from "./plan.mjs";
import { getPR, getPRDiff, commentOnPR } from "./github.mjs";
import { compose, diffStatsFromPatch, evasionSmell, infraRatHoleSmell, planDriftSmell, verbositySmell } from "./drift.mjs";
import { getSidecarReport } from "./sidecar-bridge.mjs";
import { recordEvent } from "./trajectory.mjs";

export async function auditPR({ slug, repo, number, plan = "", branchName = "", postComment = true, env = process.env } = {}) {
  const prResult = await getPR(repo, number, { env });
  if (!prResult.ok) return prResult;
  const diffResult = await getPRDiff(repo, number, { env });
  if (!diffResult.ok) return diffResult;

  const pr = prResult.pr;
  const patch = diffResult.diff || "";
  const stats = diffStatsFromPatch(patch);
  const description = [pr.title, pr.body || ""].join("\n\n");
  const sidecar = await getSidecarReport(slug, env);
  const signals = [
    named("verbosity", verbositySmell({ description, diffStats: stats })),
    named("evasion", evasionSmell({ description })),
    named("infra-rat-hole", infraRatHoleSmell({ files: stats.files, branchName: branchName || pr.head?.ref, plan })),
    named("plan-drift", planDriftSmell({ files: stats.files, plan }))
  ];
  const report = compose({ signals, sidecar });
  report.planPhase = activePhase(plan) || "unknown";
  report.sidecar = sidecar;
  report.message = enforcementMessage(report);

  await recordEvent(slug, "pr", { number: Number(number), severity: report.severity, signals: report.signals }, env);

  if (postComment && ["medium", "high", "quarantine"].includes(report.severity)) {
    const comment = await commentOnPR(repo, number, report.message, { env });
    return { ok: true, report, comment };
  }
  return { ok: true, report };
}

export function enforcementMessage(report) {
  if (report.severity === "none") return "No blocking drift found.";
  const signals = report.signals
    .map((signal) => `- ${signal.name}: ${signal.evidence.join("; ") || `score ${signal.score}`}`)
    .join("\n");
  return `Anchor drift audit found blocking drift.\n\nPlan phase:\n${report.planPhase || "unknown"}\n\nSignals:\n${signals}\n\nRequired correction:\nBring the PR back into alignment with the active plan phase and resolve the listed signals.\n\nDo not expand scope, pad the PR, or defer the stated task behind placeholders.`;
}

function named(name, result) {
  return { name, score: result.score, evidence: result.evidence };
}
