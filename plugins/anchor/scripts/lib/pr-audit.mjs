import { activePhase } from "./plan.mjs";
import { getPR, getPRDiff, commentOnPR } from "./github.mjs";
import { compose, diffStatsFromPatch, evasionSmell, infraRatHoleSmell, planDriftSmell, verbositySmell } from "./drift.mjs";
import { evaluateTelemetry, getSidecarReport } from "./sidecar-bridge.mjs";
import { recordEvent } from "./trajectory.mjs";

export async function auditPR({ slug, repo, number, plan = "", branchName = "", postComment = true, env = process.env, githubClient = null } = {}) {
  const prResult = await getPR(repo, number, { env, client: githubClient });
  if (!prResult.ok) return prResult;
  const diffResult = await getPRDiff(repo, number, { env, client: githubClient });
  if (!diffResult.ok) return diffResult;

  const pr = prResult.pr;
  const patch = diffResult.diff || "";
  const stats = diffStatsFromPatch(patch);
  const description = [pr.title, pr.body || ""].join("\n\n");
  let sidecar = await getSidecarReport(slug, env);
  try {
    const evaluated = await evaluateTelemetry(slug, {
      commitHash: pr.head?.sha || `pr-${number}`,
      commitMessage: pr.title || "",
      diffPayload: patch,
      ciBuildStatus: "SUCCESS",
      testBytesChanged: stats.files.filter((file) => /(^|\/)(test|tests|spec|__tests__)(\/|$)|\.(test|spec)\./i.test(file)).length,
      srcBytesChanged: Math.max(0, stats.additions + stats.deletions),
      linesOfCodeChanged: stats.additions + stats.deletions,
      newImports: extractImports(patch)
    }, env);
    if (evaluated.ok) {
      sidecar = {
        ...sidecar,
        ...evaluated.report,
        quarantine: evaluated.report?.severity === "quarantine",
        report: evaluated.report
      };
    }
  } catch {
    // Sidecar failure does not block practical PR audit.
  }
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
    const comment = await commentOnPR(repo, number, report.message, { env, client: githubClient });
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

function extractImports(patch) {
  const imports = [];
  for (const line of patch.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    const esm = line.match(/\bfrom\s+['"]([^'"]+)['"]/);
    const cjs = line.match(/\brequire\(['"]([^'"]+)['"]\)/);
    if (esm?.[1]) imports.push(esm[1]);
    if (cjs?.[1]) imports.push(cjs[1]);
  }
  return imports;
}
