import { execFileSync } from "node:child_process";
import { repoPartsFromUrl } from "./git.mjs";

export class MissingGitHubTokenError extends Error {
  constructor() {
    super("GITHUB_TOKEN is not set and gh auth token is unavailable.");
    this.name = "MissingGitHubTokenError";
  }
}

export async function getToken(env = process.env) {
  if (env.GITHUB_TOKEN) return env.GITHUB_TOKEN;
  if (env.ANCHOR_DISABLE_GH_TOKEN === "1") return null;
  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}

export async function octokit(env = process.env) {
  const token = await getToken(env);
  if (!token) throw new MissingGitHubTokenError();
  const { Octokit } = await import("@octokit/rest");
  return new Octokit({ auth: token });
}

export function normalizeRepo(repo) {
  if (!repo) return null;
  if (typeof repo === "string") return repoPartsFromUrl(repo) || parseFullName(repo);
  if (repo.owner && repo.repo) return { owner: repo.owner, repo: repo.repo, fullName: `${repo.owner}/${repo.repo}` };
  if (repo.fullName) return parseFullName(repo.fullName);
  return null;
}

export async function listFailingRuns(repo, { env = process.env, client = null } = {}) {
  const target = normalizeRepo(repo);
  if (!target) return { ok: false, message: "Could not determine GitHub repo." };
  try {
    const api = client || await octokit(env);
    const response = await api.actions.listWorkflowRunsForRepo({
      owner: target.owner,
      repo: target.repo,
      status: "completed",
      conclusion: "failure",
      per_page: 20
    });
    return { ok: true, runs: response.data.workflow_runs || [] };
  } catch (error) {
    return noOpOrError(error);
  }
}

export async function getRunLogs(repo, runId, { env = process.env, client = null } = {}) {
  const target = normalizeRepo(repo);
  if (!target) return { ok: false, message: "Could not determine GitHub repo." };
  try {
    const api = client || await octokit(env);
    const response = await api.actions.downloadWorkflowRunLogs({
      owner: target.owner,
      repo: target.repo,
      run_id: runId
    });
    return { ok: true, logs: response.data };
  } catch (error) {
    return noOpOrError(error);
  }
}

export async function listOpenPRs(repo, { env = process.env, client = null } = {}) {
  const target = normalizeRepo(repo);
  if (!target) return { ok: false, message: "Could not determine GitHub repo." };
  try {
    const api = client || await octokit(env);
    const response = await api.pulls.list({ owner: target.owner, repo: target.repo, state: "open" });
    return { ok: true, prs: response.data };
  } catch (error) {
    return noOpOrError(error);
  }
}

export async function getPR(repo, number, { env = process.env, client = null } = {}) {
  const target = normalizeRepo(repo);
  if (!target) return { ok: false, message: "Could not determine GitHub repo." };
  try {
    const api = client || await octokit(env);
    const response = await api.pulls.get({ owner: target.owner, repo: target.repo, pull_number: Number(number) });
    return { ok: true, pr: response.data };
  } catch (error) {
    return noOpOrError(error);
  }
}

export async function getPRDiff(repo, number, { env = process.env, client = null } = {}) {
  const target = normalizeRepo(repo);
  if (!target) return { ok: false, message: "Could not determine GitHub repo." };
  try {
    const api = client || await octokit(env);
    const response = await api.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner: target.owner,
      repo: target.repo,
      pull_number: Number(number),
      headers: { accept: "application/vnd.github.v3.diff" }
    });
    return { ok: true, diff: String(response.data || "") };
  } catch (error) {
    return noOpOrError(error);
  }
}

export async function commentOnPR(repo, number, body, { env = process.env, client = null } = {}) {
  const target = normalizeRepo(repo);
  if (!target) return { ok: false, message: "Could not determine GitHub repo." };
  try {
    const api = client || await octokit(env);
    const response = await api.issues.createComment({
      owner: target.owner,
      repo: target.repo,
      issue_number: Number(number),
      body
    });
    return { ok: true, comment: response.data };
  } catch (error) {
    return noOpOrError(error);
  }
}

function parseFullName(value) {
  const match = String(value).match(/^([^/]+)\/([^/]+)$/);
  return match ? { owner: match[1], repo: match[2], fullName: value } : null;
}

function noOpOrError(error) {
  if (error instanceof MissingGitHubTokenError) {
    return { ok: false, skipped: true, message: error.message };
  }
  return { ok: false, message: error.message };
}
