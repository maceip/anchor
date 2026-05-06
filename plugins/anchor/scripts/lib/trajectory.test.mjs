import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { trajectoryPath } from "./paths.mjs";
import { recordEvent, recoverTrailingPartialLine, tail } from "./trajectory.mjs";

test("recordEvent and tail roundtrip JSONL rows", async () => {
  const env = { ANCHOR_HOME: await tmp() };
  await recordEvent("repo", "commit", { sha: "a" }, env);
  await recordEvent("repo", "pr", { number: 1 }, env);
  const rows = await tail("repo", 2, env);
  assert.deepEqual(rows.map((row) => row.type), ["commit", "pr"]);
  assert.equal(rows[0].data.sha, "a");
});

test("tail truncates trailing partial JSONL line", async () => {
  const env = { ANCHOR_HOME: await tmp() };
  await recordEvent("repo", "commit", { sha: "a" }, env);
  const file = trajectoryPath("repo", env);
  await appendFile(file, "{\"ts\":\"bad\"");
  assert.equal(await recoverTrailingPartialLine(file), true);
  const rows = await tail("repo", 5, env);
  assert.equal(rows.length, 1);
  assert.equal((await readFile(file, "utf8")).endsWith("\n"), true);
});

async function tmp() {
  return mkdtemp(path.join(os.tmpdir(), "anchor-traj-"));
}
