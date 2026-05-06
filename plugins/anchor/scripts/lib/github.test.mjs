import test from "node:test";
import assert from "node:assert/strict";
import { commentOnPR, getPR, getPRDiff, listFailingRuns, listOpenPRs } from "./github.mjs";

test("github helpers use injected client", async () => {
  const calls = [];
  const client = {
    actions: {
      listWorkflowRunsForRepo: async (payload) => {
        calls.push(["runs", payload]);
        return { data: { workflow_runs: [{ id: 1 }] } };
      }
    },
    pulls: {
      list: async () => ({ data: [{ number: 2 }] }),
      get: async () => ({ data: { number: 3 } })
    },
    issues: {
      createComment: async (payload) => {
        calls.push(["comment", payload]);
        return { data: { id: 4 } };
      }
    },
    request: async () => ({ data: "diff --git a/a b/a" })
  };

  assert.equal((await listFailingRuns("owner/repo", { client })).runs[0].id, 1);
  assert.equal((await listOpenPRs("owner/repo", { client })).prs[0].number, 2);
  assert.equal((await getPR("owner/repo", 3, { client })).pr.number, 3);
  assert.match((await getPRDiff("owner/repo", 3, { client })).diff, /diff --git/);
  assert.equal((await commentOnPR("owner/repo", 3, "body", { client })).comment.id, 4);
  assert.equal(calls[0][1].owner, "owner");
});

test("no-token mode no-ops clearly", async () => {
  const result = await listFailingRuns("owner/repo", { env: { ANCHOR_DISABLE_GH_TOKEN: "1" } });
  assert.equal(result.skipped, true);
  assert.match(result.message, /GITHUB_TOKEN/);
});
