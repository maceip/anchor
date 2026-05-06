#!/usr/bin/env node
import readline from "node:readline";
import { callTool, toolDefinitions } from "./tools.mjs";

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
    const result = await handle(request);
    respond({ jsonrpc: "2.0", id: request.id, result });
  } catch (error) {
    respond({
      jsonrpc: "2.0",
      id: request?.id ?? null,
      error: { code: -32000, message: error.message }
    });
  }
});

async function handle(request) {
  if (request.method === "initialize") {
    return {
      protocolVersion: request.params?.protocolVersion || "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "anchor", version: "0.1.0" }
    };
  }
  if (request.method === "notifications/initialized") return {};
  if (request.method === "tools/list") {
    return { tools: toolDefinitions };
  }
  if (request.method === "tools/call") {
    const name = request.params?.name;
    const args = request.params?.arguments || {};
    const data = await callTool(name, args);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      isError: false
    };
  }
  throw new Error(`Unsupported MCP method: ${request.method}`);
}

function respond(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
