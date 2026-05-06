#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const anchorHome = process.env.ANCHOR_HOME || path.join(os.homedir(), '.anchor');
const repoSlug = process.cwd().split(path.sep).pop()?.replace(/[^a-z0-9]/gi, '_') || 'unknown';
const statePath = path.join(anchorHome, repoSlug, 'state.json');

if (!existsSync(statePath)) process.exit(0);
try {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  if (!state.optedIn) process.exit(0);
  // TODO: inspect prompt for drift smells like "let’s also refactor"
} catch {}
process.exit(0);