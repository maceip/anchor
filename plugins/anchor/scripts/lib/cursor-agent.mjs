import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { pluginRoot, runsDir } from "./paths.mjs";
import { readState, writeState } from "./state.mjs";

export class MissingCursorKeyError extends Error {
  constructor() {
    super("CURSOR_API_KEY is not set; skipping Cursor cloud agent operation.");
    this.name = "MissingCursorKeyError";
  }
}

export async function ensure({ repoUrl, branch = "main", slug, env = process.env, sdk = null } = {}) {
  requireKey(env);
  const state = await readState(slug, env);
  if (state?.cloudAgentId) {
    return { ok: true, agentId: state.cloudAgentId, reattached: true };
  }

  const Agent = await loadAgent(sdk);
  const agent = await Agent.create({
    apiKey: env.CURSOR_API_KEY,
    model: { id: env.ANCHOR_MODEL_ID || "composer-2" },
    cloud: {
      repos: [{ url: repoUrl, startingRef: branch }],
      autoCreatePR: true
    }
  });

  const agentId = agent.id || agent.agentId;
  await writeState(slug, { ...state, slug, repoUrl, branch, cloudAgentId: agentId }, env);
  return { ok: true, agentId, created: true };
}

export async function send({ slug, prompt, persona = "anchor-custodian", env = process.env, sdk = null } = {}) {
  requireKey(env);
  const state = await readState(slug, env);
  if (!state?.cloudAgentId) throw new Error(`No cloudAgentId stored for ${slug}. Run anchor opt-in first.`);
  const Agent = await loadAgent(sdk);
  const agent = await Agent.get({ apiKey: env.CURSOR_API_KEY, id: state.cloudAgentId });
  const body = await promptWithPersona(persona, prompt);
  const run = await agent.send(body);
  return { ok: true, run };
}

export async function streamToFile({ run, filePath }) {
  await mkdir(path.dirname(filePath), { recursive: true });
  if (!run || !run[Symbol.asyncIterator]) {
    await writeFile(filePath, `${JSON.stringify({ ts: new Date().toISOString(), event: "no-stream", run })}\n`);
    return;
  }
  let content = "";
  for await (const event of run) {
    content += `data: ${JSON.stringify(event)}\n\n`;
  }
  await writeFile(filePath, content);
}

export function runLogPath(slug, runId, env = process.env) {
  return path.join(runsDir(slug, env), `${runId}.log`);
}

async function promptWithPersona(persona, prompt) {
  const personaPath = path.join(pluginRoot(), "agents", `${persona}.md`);
  const body = existsSync(personaPath) ? await readFile(personaPath, "utf8") : "";
  return `## Persona: ${persona}\n\n${body}\n\n## Task\n\n${prompt}`;
}

async function loadAgent(sdk) {
  if (sdk?.Agent) return sdk.Agent;
  const module = await import("@cursor/sdk");
  if (!module.Agent) throw new Error("@cursor/sdk did not expose Agent; update cursor-agent.mjs adapter.");
  return module.Agent;
}

function requireKey(env) {
  if (!env.CURSOR_API_KEY) throw new MissingCursorKeyError();
}
