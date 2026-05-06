import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaultState, readState, writeState } from "./state.mjs";

test("missing state returns null", async () => {
  const env = { ANCHOR_HOME: await tmp() };
  assert.equal(await readState("missing", env), null);
});

test("writeState writes atomically and leaves no temp files", async () => {
  const env = { ANCHOR_HOME: await tmp() };
  await writeState("repo", { ...defaultState({ slug: "repo" }), optedIn: true }, env);
  const files = await readdir(path.join(env.ANCHOR_HOME, "repo"));
  assert.equal(files.includes("state.json"), true);
  assert.equal(files.some((file) => file.endsWith(".tmp")), false);
});

test("writeState strips secret-shaped keys", async () => {
  const env = { ANCHOR_HOME: await tmp() };
  await writeState("repo", {
    ...defaultState({ slug: "repo" }),
    optedIn: true,
    apiKey: "secret",
    nested: { githubToken: "secret" }
  }, env);
  const raw = await readFile(path.join(env.ANCHOR_HOME, "repo", "state.json"), "utf8");
  assert.equal(raw.includes("secret"), false);
});

async function tmp() {
  return mkdtemp(path.join(os.tmpdir(), "anchor-state-"));
}
