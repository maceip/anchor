#!/usr/bin/env node
import process from "node:process";

const commands = {
  "opt-in": () => import("./cli/opt-in.mjs"),
  "opt-out": () => import("./cli/opt-out.mjs"),
  onboard: () => import("./cli/onboard.mjs"),
  status: () => import("./cli/status.mjs"),
  sync: () => import("./cli/sync.mjs"),
  "fix-ci": () => import("./cli/fix-ci.mjs"),
  "audit-pr": () => import("./cli/audit-pr.mjs"),
  plan: () => import("./cli/plan.mjs"),
  dashboard: () => import("./cli/dashboard.mjs"),
  daemon: () => import("./cli/daemon.mjs")
};

const [, , command, ...args] = process.argv;

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Unknown Anchor command: ${command}`);
  printHelp();
  process.exit(1);
}

try {
  const module = await commands[command]();
  const result = await module.run(args);
  if (typeof result === "string") console.log(result);
  if (command === "dashboard" && args.includes("--serve")) {
    await new Promise(() => {});
  }
  process.exit(0);
} catch (error) {
  console.error(`[Anchor] ${error.message}`);
  process.exit(1);
}

function printHelp() {
  console.log(`Anchor CLI

Usage:
  node plugins/anchor/scripts/anchor-cli.mjs <command> [args]

Commands:
  onboard [--force] [--no-dashboard]
  opt-in [--repo-url URL] [--no-cloud]
  opt-out
  status
  sync
  fix-ci [--run-id ID]
  audit-pr <number> [--no-comment]
  plan [--regenerate]
  dashboard [--open] [--serve] [--port=4177] [--slug SLUG]
  daemon
`);
}
