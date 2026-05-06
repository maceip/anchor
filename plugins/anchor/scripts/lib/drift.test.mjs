import test from "node:test";
import assert from "node:assert/strict";
import { compose, evasionSmell, infraRatHoleSmell, verbositySmell } from "./drift.mjs";

test("evasion smell flags placeholder language", () => {
  const result = evasionSmell({ description: "This is a placeholder for now; follow-up later." });
  assert.equal(result.score >= 0.5, true);
  assert.equal(result.evidence.length >= 2, true);
});

test("infra rat-hole ignores infra branches", () => {
  const files = [".github/workflows/ci.yml", "deploy/app.yml", "infra/main.tf"];
  assert.equal(infraRatHoleSmell({ files, branchName: "feature/login", plan: "" }).score > 0.6, true);
  assert.equal(infraRatHoleSmell({ files, branchName: "infra/ci", plan: "" }).score, 0);
});

test("verbosity smell needs disproportionate prose", () => {
  const description = Array.from({ length: 180 }, (_, i) => `word${i}`).join(" ");
  const result = verbositySmell({ description, diffStats: { additions: 20, deletions: 0 } });
  assert.equal(result.score > 0.5, true);
});

test("compose severity thresholds", () => {
  assert.equal(compose({ signals: [] }).severity, "none");
  assert.equal(compose({ signals: [{ name: "x", score: 0.6, evidence: [] }] }).severity, "medium");
  assert.equal(compose({ sidecar: { quarantine: true } }).severity, "quarantine");
});
