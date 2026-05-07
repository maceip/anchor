#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const anchorHome = process.env.ANCHOR_HOME || path.join(os.homedir(), '.anchor');
const repoSlug = process.cwd().split(path.sep).pop()?.replace(/[^a-z0-9._-]/gi, '_') || 'unknown';
const statePath = path.join(anchorHome, repoSlug, 'state.json');
const sessionPath = path.join(anchorHome, repoSlug, '.session.json');

if (!existsSync(statePath)) process.exit(0);

let state;
try {
  state = JSON.parse(readFileSync(statePath, 'utf8'));
} catch { process.exit(0); }
if (!state.optedIn) process.exit(0);

const prompt = (process.argv.slice(2).join(' ') || '').toLowerCase();
if (!prompt) process.exit(0);

// Drift smell patterns from plan
const driftSmells = [
  /\blet[’']?s also\b/,
  /\bquick (fix|aside|note)\b/,
  /\bfor now\b/,
  /\b(out of scope|placeholder|stub|todo follow-up)\b/,
  /\brefactor(ing)? (everything|the whole|too much)\b/
];

const matched = driftSmells.find(r => r.test(prompt));
if (matched && !sessionWarned()) {
  console.error('[Anchor] drift smell detected in prompt: "' + matched.source.replace(/\\b/g,'') + '". Anchor will push back if this leads to scope creep or evasion.');
  markWarned();
  // Contribute to IDR (intentional constraint violation / plan drift)
  try {
    const { recordEvent } = await import('../scripts/lib/trajectory.mjs');
    const slug = process.cwd().split(path.sep).pop()?.replace(/[^a-z0-9._-]/gi, '_') || 'unknown';
    await recordEvent(slug, 'drift-flag', {
      source: 'prompt',
      signal: 'IDR',
      reason: matched.source,
      actor_id: process.env.GIT_AUTHOR_EMAIL || 'session-user'
    });
  } catch {}
}

function sessionWarned() {
  if (!existsSync(sessionPath)) return false;
  try {
    const s = JSON.parse(readFileSync(sessionPath, 'utf8'));
    return !!s.promptWarned;
  } catch { return false; }
}

function markWarned() {
  let session = {};
  if (existsSync(sessionPath)) {
    try { session = JSON.parse(readFileSync(sessionPath, 'utf8')); } catch {}
  }
  session.promptWarned = true;
  session.lastTs = Date.now();
  try {
    mkdirSync(path.dirname(sessionPath), { recursive: true });
    writeFileSync(sessionPath, JSON.stringify(session, null, 2));
  } catch {}
}

process.exit(0);
