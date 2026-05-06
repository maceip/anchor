import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensure, MissingCursorKeyError, send } from "./cursor-agent.mjs";
import { defaultState, writeState } from "./state.mjs";

test("ensure creates cloud agent with expected shape", async () => {
  const env = { ANCHOR_HOME: await tmp(), CURSOR_API_KEY: "key" };
  let createPayload;
  const sdk = {
    Agent: {
      create: async (payload) => {
        createPayload = payload;
        return { id: "agent-1" };
      }
    }
  };
  const result = await ensure({ slug: "repo", repoUrl: "https://github.com/example/repo", branch: "main", env, sdk });
  assert.equal(result.agentId, "agent-1");
  assert.equal(createPayload.cloud.autoCreatePR, true);
  assert.deepEqual(createPayload.cloud.repos, [{ url: "https://github.com/example/repo", startingRef: "main" }]);
});

test("send prefixes persona prompt", async () => {
  const env = { ANCHOR_HOME: await tmp(), CURSOR_API_KEY: "key" };
  await writeState("repo", { ...defaultState({ slug: "repo" }), optedIn: true, cloudAgentId: "agent-1" }, env);
  let sent;
  const sdk = {
    Agent: {
      get: async () => ({
        send: async (prompt) => {
          sent = prompt;
          return { id: "run-1" };
        }
      })
    }
  };
  await send({ slug: "repo", prompt: "ping", persona: "anchor-custodian", env, sdk });
  assert.match(sent, /## Persona: anchor-custodian/);
  assert.match(sent, /## Task\n\nping/);
});

test("missing cursor key gives helpful error", async () => {
  await assert.rejects(() => ensure({ slug: "repo", env: { ANCHOR_HOME: "/tmp/anchor-test" }, sdk: {} }), MissingCursorKeyError);
});

async function tmp() {
  return mkdtemp(path.join(os.tmpdir(), "anchor-cursor-"));
}
