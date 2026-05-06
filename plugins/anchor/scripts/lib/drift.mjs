const INFRA_PATH_RE = /(^|\/)(\.github|infra|ops|deploy|ci|cd|terraform|k8s|helm|scripts)(\/|$)|\.(ya?ml|tf|sh|json)$/i;
const EVASION_PATTERNS = [
  /\b(stub|todo|follow-?up|further|placeholder|out of scope)\b/i,
  /\bfor now\b/i,
  /\bquick (fix|aside|note)\b/i
];

export function verbositySmell({ description = "", diffStats = {} } = {}) {
  const words = description.trim().split(/\s+/).filter(Boolean).length;
  const changed = Math.max(1, Number(diffStats.additions || 0) + Number(diffStats.deletions || 0));
  const ratio = words / changed;
  if (words < 120 || ratio < 2.5) return { score: 0, evidence: [] };
  return {
    score: clamp(ratio / 10),
    evidence: [`PR description has ${words} words for ${changed} changed lines.`]
  };
}

export function infraRatHoleSmell({ files = [], branchName = "", plan = "" } = {}) {
  if (files.length === 0) return { score: 0, evidence: [] };
  const infraFiles = files.filter((file) => INFRA_PATH_RE.test(file));
  const infraRatio = infraFiles.length / files.length;
  const infraBranch = /^(infra|ops|deploy|ci|cd)[/-]/i.test(branchName) || /^(infra|ops|deploy):/i.test(branchName);
  const justified = /\b(infra|ci|deploy|workflow|pipeline|environment)\b/i.test(plan);
  if (infraRatio <= 0.6 || infraBranch || justified) return { score: 0, evidence: [] };
  return {
    score: clamp(infraRatio),
    evidence: [`${infraFiles.length}/${files.length} changed files are infra-like on non-infra branch "${branchName || "unknown"}".`]
  };
}

export function evasionSmell({ description = "" } = {}) {
  const evidence = EVASION_PATTERNS
    .filter((pattern) => pattern.test(description))
    .map((pattern) => `Matched ${pattern.source}.`);
  return { score: evidence.length ? clamp(0.35 + evidence.length * 0.25) : 0, evidence };
}

export function planDriftSmell({ files = [], plan = "" } = {}) {
  if (!plan || files.length === 0) return { score: 0, evidence: [] };
  const active = activePhaseText(plan).toLowerCase();
  if (!active) return { score: 0, evidence: [] };
  const topDirs = [...new Set(files.map((file) => file.split("/")[0]).filter(Boolean))];
  const unknown = topDirs.filter((dir) => !active.includes(dir.toLowerCase()) && !plan.toLowerCase().includes(dir.toLowerCase()));
  if (unknown.length <= Math.max(1, topDirs.length / 2)) return { score: 0, evidence: [] };
  return {
    score: clamp(unknown.length / Math.max(1, topDirs.length)),
    evidence: [`Touched areas not reflected in active plan: ${unknown.join(", ")}.`]
  };
}

export function compose({ signals = [], sidecar = null } = {}) {
  const normalized = signals.filter((signal) => signal && signal.score > 0);
  if (sidecar?.quarantine) {
    return {
      severity: "quarantine",
      signals: normalized,
      message: "Anchor drift audit found quarantine-level drift from sidecar telemetry."
    };
  }
  const max = normalized.reduce((score, signal) => Math.max(score, Number(signal.score || 0)), 0);
  const severity = max >= 0.8 ? "high" : max >= 0.5 ? "medium" : max > 0 ? "low" : "none";
  return {
    severity,
    signals: normalized,
    message: severity === "none"
      ? "No blocking drift found."
      : "Anchor drift audit found blocking drift."
  };
}

export function diffStatsFromPatch(patch = "") {
  let additions = 0;
  let deletions = 0;
  const files = new Set();
  for (const line of patch.split("\n")) {
    if (line.startsWith("+++ b/")) files.add(line.slice(6));
    if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    if (line.startsWith("-") && !line.startsWith("---")) deletions += 1;
  }
  return { additions, deletions, files: [...files] };
}

function activePhaseText(markdown) {
  const match = markdown.match(/^## Active phase\s*([\s\S]*?)(?=^## |\s*$)/m);
  return match?.[1]?.trim() || "";
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
