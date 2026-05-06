import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export function anchorHome(env = process.env) {
  return env.ANCHOR_HOME || path.join(os.homedir(), ".anchor");
}

export function slugFromRepoUrl(repoUrl) {
  if (!repoUrl) return null;
  const cleaned = repoUrl
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/^ssh:\/\/git@([^/]+)\//, "https://$1/")
    .replace(/\.git$/, "");
  const match = cleaned.match(/([^/:]+)\/([^/]+)$/);
  if (!match) return null;
  return `${match[1]}__${match[2]}`.replace(/[^a-z0-9._-]/gi, "_");
}

export function slugFromCwd(cwd = process.cwd()) {
  return path.basename(cwd).replace(/[^a-z0-9._-]/gi, "_") || "unknown";
}

export function stateDir(slug, env = process.env) {
  return path.join(anchorHome(env), slug);
}

export function statePath(slug, env = process.env) {
  return path.join(stateDir(slug, env), "state.json");
}

export function trajectoryPath(slug, env = process.env) {
  return path.join(stateDir(slug, env), "trajectory.jsonl");
}

export function planPath(slug, env = process.env) {
  return path.join(stateDir(slug, env), "plan.md");
}

export function runsDir(slug, env = process.env) {
  return path.join(stateDir(slug, env), "runs");
}

export function cacheDir(slug, env = process.env) {
  return path.join(stateDir(slug, env), "cache");
}

export function pluginRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export function templatePath(name) {
  return path.join(pluginRoot(), "templates", name);
}

export function execGit(args, { cwd = process.cwd(), allowFailure = true } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch (error) {
    if (allowFailure) return "";
    throw error;
  }
}

export function detectRepoUrl(cwd = process.cwd()) {
  return execGit(["config", "--get", "remote.origin.url"], { cwd }) || null;
}

export function detectBranch(cwd = process.cwd()) {
  return execGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd }) || "main";
}

export function detectHeadSha(cwd = process.cwd()) {
  return execGit(["rev-parse", "HEAD"], { cwd }) || null;
}

export function resolveSlug({ slug, repoUrl, cwd = process.cwd() } = {}) {
  return slug || slugFromRepoUrl(repoUrl || detectRepoUrl(cwd)) || slugFromCwd(cwd);
}
