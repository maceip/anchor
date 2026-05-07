import { execFile } from "node:child_process";
import { buildAnchorDashboardModel, writeAnchorDashboard } from "../lib/canvas-dashboard.mjs";
import { serveLiveDashboard } from "../lib/dashboard-live.mjs";
import { detectRepoUrl, resolveSlug } from "../lib/paths.mjs";

export async function run(args = []) {
  const port = readPort(args);
  const serve = args.includes("--serve");
  const open = args.includes("--open") || serve;
  const slug = readValue(args, "--slug") || resolveSlug({ repoUrl: detectRepoUrl() });
  const model = await buildAnchorDashboardModel(slug);
  const { filePath, workspaceId } = await writeAnchorDashboard(model);
  const lines = [
    "Anchor dashboard generated.",
    `workspace: ${workspaceId}`,
    `canvas: ${filePath}`
  ];

  if (serve) {
    const { url } = await serveLiveDashboard(model, { port });
    if (open) openUrl(url);
    lines.push(`live: ${url}`);
    lines.push("Press Ctrl-C to stop the live dashboard.");
  } else if (open) {
    openUrl(filePath);
  }

  return lines.join("\n");
}

function readValue(args, flag) {
  const equals = args.find((arg) => arg.startsWith(`${flag}=`));
  if (equals) return equals.slice(flag.length + 1);
  const index = args.indexOf(flag);
  if (index >= 0) return args[index + 1];
  return null;
}

function readPort(args) {
  const value = readValue(args, "--port");
  const port = Number(value || 4177);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid --port: ${value}`);
  return port;
}

function openUrl(target) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const commandArgs = process.platform === "win32" ? ["/c", "start", "", target] : [target];
  const child = execFile(command, commandArgs, { stdio: "ignore" });
  child.unref();
}
