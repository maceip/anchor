import { execGit, detectBranch, detectHeadSha, detectRepoUrl } from "./paths.mjs";

export function branchName(cwd = process.cwd()) {
  return detectBranch(cwd);
}

export function headSha(cwd = process.cwd()) {
  return detectHeadSha(cwd);
}

export function repoUrl(cwd = process.cwd()) {
  return detectRepoUrl(cwd);
}

export function commitsSince(lastSha, cwd = process.cwd()) {
  const range = lastSha ? `${lastSha}..HEAD` : "HEAD";
  const format = "%H%x1f%an%x1f%aI%x1f%s";
  const output = execGit(["log", "--reverse", `--format=${format}`, range], { cwd });
  if (!output) return [];
  return output.split("\n").filter(Boolean).map((line) => {
    const [sha, author, date, subject] = line.split("\x1f");
    return { sha, author, date, subject };
  });
}

export function repoPartsFromUrl(value) {
  if (!value) return null;
  const normalized = value
    .replace(/^git@github.com:/, "https://github.com/")
    .replace(/^ssh:\/\/git@github.com\//, "https://github.com/")
    .replace(/\.git$/, "");
  const match = normalized.match(/github\.com\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}

export function currentRepo(cwd = process.cwd()) {
  const url = repoUrl(cwd);
  return { url, branch: branchName(cwd), headSha: headSha(cwd), parts: repoPartsFromUrl(url) };
}
