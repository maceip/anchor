#!/usr/bin/env node
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const anchorHome = process.env.ANCHOR_HOME || path.join(os.homedir(), '.anchor');
const repoSlug = process.cwd().split(path.sep).pop()?.replace(/[^a-z0-9._-]/gi, '_') || 'unknown';
const statePath = path.join(anchorHome, repoSlug, 'state.json');

if (!existsSync(statePath)) process.exit(0);
try {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (!state.optedIn) process.exit(0);
  const trajPath = path.join(anchorHome, repoSlug, 'trajectory.jsonl');
  const event = JSON.stringify({ ts: new Date().toISOString(), type: 'session-summary', data: { repo: repoSlug } }) + '\n';
  appendFileSync(trajPath, event);
} catch {}
process.exit(0);
