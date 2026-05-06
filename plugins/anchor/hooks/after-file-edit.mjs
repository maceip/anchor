#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const anchorHome = process.env.ANCHOR_HOME || path.join(os.homedir(), '.anchor');
const repoSlug = process.cwd().split(path.sep).pop()?.replace(/[^a-z0-9]/gi, '_') || 'unknown';
const statePath = path.join(anchorHome, repoSlug, 'state.json');
const sessionPath = path.join(anchorHome, repoSlug, '.session.json');

if (!existsSync(statePath)) process.exit(0);

let state;
try {
  state = JSON.parse(readFileSync(statePath, 'utf8'));
} catch { process.exit(0); }
if (!state.optedIn) process.exit(0);

const filePath = process.argv[2] || '';
if (!filePath) process.exit(0);

// Load or init session
let session = { edits: [], infraCount: 0, lastTs: Date.now() };
if (existsSync(sessionPath)) {
  try { session = JSON.parse(readFileSync(sessionPath, 'utf8')); } catch {}
}

// Record edit
session.edits.push(filePath);
session.lastTs = Date.now();

// Infra detection (simple patterns)
const infraPatterns = /\.(ya?ml|yml|sh|Dockerfile|tf|github|circleci|workflow|json$)|(^|\/)(infra|ops|deploy|ci|cd|github\/workflows)\//i;
const isInfra = infraPatterns.test(filePath);

// Check current branch
let branch = 'main';
try {
  branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {}

const isInfraBranch = /^infra|ops|deploy/i.test(branch);

if (isInfra && !isInfraBranch) {
  session.infraCount = (session.infraCount || 0) + 1;
  if (session.infraCount >= 5 && !session.ratHoleWarned) {
    console.error(`[Anchor] infra rat-hole warning: ${session.infraCount} infra edits on non-infra branch "${branch}". Consider infra: prefix or plan note.`);
    session.ratHoleWarned = true;
  }
}

try {
  mkdirSync(path.dirname(sessionPath), { recursive: true });
  writeFileSync(sessionPath, JSON.stringify(session, null, 2));
} catch {}

// Record lightweight event? (future: call trajectory, but keep cheap for now)
process.exit(0);