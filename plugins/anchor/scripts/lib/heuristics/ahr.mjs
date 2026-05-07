/**
 * AHR — API Hallucination Rate (production implementation from arXiv:2604.03173)
 *
 * Distinguishes:
 *   HALLUCINATED — never existed (fabricated / lying)
 *   STALE        — existed in past (Wayback) but dead now (link rot / lazy)
 *   LIVE         — currently resolvable
 *   INTERNAL     — relative import, not counted
 *
 * Any HALLUCINATED import forces AHR=1.0 (hard quarantine).
 * STALE contributes partial score.
 */

import { readFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";

const HIGH_HALLUCINATION_DOMAINS = ["theology", "business", "finance", "law", "philosophy", "history", "religion"];

export async function computeAHR(telemetry = {}, options = {}) {
  const imports = (telemetry.newImports || telemetry.new_imports || []).filter(Boolean);
  if (!imports.length) {
    return { value: 0.0, hallucinated: [], stale: [], verified_clean: 0, total: 0 };
  }

  const repoRoot = options.repoRoot || telemetry.repoRoot || telemetry.cwd || process.cwd();
  const registryCheck = options.registryCheck || (await defaultRegistryCheck(repoRoot));
  const urlCheck = options.urlHealthCheck || defaultUrlHealthCheck;

  const breakdown = { hallucinated: [], stale: [], live: [], internal: [] };

  for (const imp of imports) {
    if (isInternalImport(imp)) {
      breakdown.internal.push(imp);
      continue;
    }

    let health;
    if (imp.startsWith("http:") || imp.startsWith("https:")) {
      health = await urlCheck(imp);
    } else {
      health = await registryCheck(imp);
      if (health.status === "LIVE") {
        // double-check with light URL probe? for packages we trust registry for now
      }
    }

    if (health.status === "HALLUCINATED") breakdown.hallucinated.push(imp);
    else if (health.status === "STALE") breakdown.stale.push(imp);
    else if (health.status === "LIVE") breakdown.live.push(imp);
    else breakdown.internal.push(imp); // treat unknown as internal-ish
  }

  const totalExternal = breakdown.hallucinated.length + breakdown.stale.length + breakdown.live.length;

  let value = 0.0;
  if (breakdown.hallucinated.length > 0) {
    value = 1.0;
  } else if (breakdown.stale.length > 0) {
    value = Math.min(0.75, breakdown.stale.length / Math.max(totalExternal, 1));
  }

  return {
    value: Number(value.toFixed(6)),
    hallucinated: breakdown.hallucinated,
    stale: breakdown.stale,
    verified_clean: breakdown.live.length,
    total: imports.length,
    internal: breakdown.internal.length,
  };
}

function isInternalImport(imp) {
  return imp.startsWith(".") || imp.startsWith("/") || imp.startsWith("~") || imp.includes("\\");
}

async function defaultRegistryCheck(repoRoot) {
  let pkg;
  try {
    const pkgPath = join(resolve(repoRoot), "package.json");
    pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  } catch {
    // No package.json visible → any external import is unprovable → treat as hallucinated (strict)
    return async (name) => ({ status: "HALLUCINATED", reason: "No package.json in repo root - cannot verify" });
  }

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies,
  };

  return async function check(name) {
    if (deps[name]) {
      return { status: "LIVE", reason: "Listed in package.json" };
    }
    // Check node_modules presence (works even if not installed, but better if installed)
    try {
      const modPath = join(resolve(repoRoot), "node_modules", name);
      await access(modPath);
      return { status: "LIVE", reason: "Present in node_modules" };
    } catch {
      // For scoped packages (@scope/pkg lives at node_modules/@scope/pkg)
      if (name.startsWith("@")) {
        try {
          const scopeMod = join(resolve(repoRoot), "node_modules", name);
          await access(scopeMod);
          return { status: "LIVE", reason: "Scoped package in node_modules" };
        } catch {}
      }
      return { status: "HALLUCINATED", reason: "Not in package.json or node_modules" };
    }
  };
}

async function defaultUrlHealthCheck(url) {
  // 1. Try live HEAD
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    clearTimeout(t);
    if (res.ok || (res.status >= 200 && res.status < 400)) {
      return { status: "LIVE", reason: "Live HTTP response" };
    }
  } catch {
    // fallthrough to Wayback
  }

  // 2. Wayback Machine CDX / available API (free, public, no key)
  try {
    const wb = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}&timestamp=20250101`; // recent bias
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const wbRes = await fetch(wb, { signal: controller.signal });
    clearTimeout(t);
    if (wbRes.ok) {
      const data = await wbRes.json();
      if (data?.archived_snapshots?.closest?.available === "true" || data?.archived_snapshots?.closest) {
        return { status: "STALE", reason: "Archived in Wayback but not currently live" };
      }
    }
  } catch {
    // network issue
  }

  return { status: "HALLUCINATED", reason: "Never archived and unreachable now" };
}

export default { computeAHR, HIGH_HALLUCINATION_DOMAINS };
