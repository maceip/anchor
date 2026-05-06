import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { auditPR } from "./pr-audit.mjs";
import { evaluateTelemetry } from "./sidecar-bridge.mjs";
import { defaultState, readState, writeState } from "./state.mjs";

test("evaluateTelemetry calls sidecar and stores DriftReport", async () => {
  const env = { ANCHOR_HOME: await tmp() };
  await writeState("repo", { ...defaultState({ slug: "repo" }), optedIn: true }, env);
  const result = await evaluateTelemetry("repo", {
    commitHash: "a",
    commitMessage: "implement anchor",
    ciBuildStatus: "SUCCESS",
    srcBytesChanged: 10,
    linesOfCodeChanged: 2
  }, env);
  assert.equal(result.ok, true);
  assert.equal(result.report.phase, "NURSERY");
  const state = await readState("repo", env);
  assert.equal(state.sidecar.lastDecision.decision, "NURSERY_RECORDED");
});

test("sidecar failure does not crash PR audit", async () => {
  const env = { ANCHOR_HOME: await tmp(), PYTHON: "/usr/bin/false" };
  await writeState("repo", { ...defaultState({ slug: "repo" }), optedIn: true }, env);
  const githubClient = {
    pulls: {
      get: async () => ({ data: { title: "placeholder for now", body: "follow-up", head: { ref: "feature/x", sha: "abc" } } })
    },
    request: async () => ({ data: "diff --git a/a.js b/a.js\n+++ b/a.js\n+import x from 'missing'\n" }),
    issues: {
      createComment: async () => ({ data: { id: 1 } })
    }
  };
  const result = await auditPR({
    slug: "repo",
    repo: "owner/repo",
    number: 1,
    plan: "## Active phase\n\nfeature",
    githubClient,
    env
  });
  assert.equal(result.ok, true);
  assert.equal(["medium", "high"].includes(result.report.severity), true);
});

async function tmp() {
  return mkdtemp(path.join(os.tmpdir(), "anchor-sidecar-"));
}
