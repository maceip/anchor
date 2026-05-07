import os from "node:os";
import path from "node:path";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { activePhase, readPlan } from "./plan.mjs";
import { anchorHome, statePath } from "./paths.mjs";
import { readState } from "./state.mjs";
import { tail } from "./trajectory.mjs";

const CANVAS_FILE_NAME = "anchor-dashboard.canvas.tsx";

const WEBTUI_CANVAS_CSS = `
/* WebTUI Canvas adapter: terminal UI tokens and attribute grammar adapted for Cursor Canvas.
   Source reference: https://github.com/webtui/webtui, MIT License, Copyright (c) 2025 WebTUI. */
.anchor-webtui {
  --background0: #2e3440;
  --background1: #3b4252;
  --background2: #434c5e;
  --background3: #4c566a;
  --foreground0: #eceff4;
  --foreground1: #e5e9f0;
  --foreground2: #d8dee9;
  --nord7: #8fbcbb;
  --nord8: #88c0d0;
  --nord9: #81a1c1;
  --nord10: #5e81ac;
  --nord11: #bf616a;
  --nord12: #d08770;
  --nord13: #ebcb8b;
  --nord14: #a3be8c;
  --nord15: #b48ead;
  --box-border-color: var(--foreground0);
  --table-border-color: var(--background3);
  --separator-color: var(--background3);
  --font-family: JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-size: 13px;
  --line-height: 1.45;
  background: var(--background0);
  color: var(--foreground0);
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: var(--line-height);
  min-height: 100%;
  padding: 2px;
}
.anchor-webtui * { box-sizing: border-box; letter-spacing: 0; }
.anchor-webtui h1,
.anchor-webtui h2,
.anchor-webtui h3,
.anchor-webtui p { margin: 0; }
.anchor-webtui h1,
.anchor-webtui h2,
.anchor-webtui h3 {
  font-family: var(--font-family);
  font-size: var(--font-size);
  line-height: var(--line-height);
  font-weight: 700;
}
.anchor-webtui [box-='square'],
.anchor-webtui [box-='double'] {
  position: relative;
  isolation: isolate;
  padding: 14px 14px;
  background: var(--background1);
}
.anchor-webtui [box-='square']::before,
.anchor-webtui [box-='double']::before {
  content: '';
  position: absolute;
  inset: 5px 7px;
  border: 2px solid var(--box-border-color);
  z-index: -1;
}
.anchor-webtui [box-='double']::after {
  content: '';
  position: absolute;
  inset: 2px 4px;
  border: 1px solid var(--box-border-color);
  z-index: -1;
}
.anchor-webtui [is-~='badge'] {
  --badge-color: var(--foreground0);
  --badge-text: var(--background0);
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  height: 20px;
  line-height: 20px;
  color: var(--badge-text);
  background: var(--badge-color);
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.anchor-webtui [is-~='badge'][variant-='success'] { --badge-color: var(--nord14); --badge-text: var(--background0); }
.anchor-webtui [is-~='badge'][variant-='warning'] { --badge-color: var(--nord13); --badge-text: var(--background0); }
.anchor-webtui [is-~='badge'][variant-='danger'] { --badge-color: var(--nord11); --badge-text: var(--foreground0); }
.anchor-webtui [is-~='badge'][variant-='info'] { --badge-color: var(--nord8); --badge-text: var(--background0); }
.anchor-webtui [is-~='badge'][variant-='muted'] { --badge-color: var(--background3); --badge-text: var(--foreground1); }
.anchor-webtui [is-~='button'],
.anchor-webtui button {
  color: var(--background0);
  background: var(--foreground0);
  border: 0;
  font: inherit;
  font-weight: 700;
  min-height: 30px;
  padding: 0 13px;
  text-transform: uppercase;
}
.anchor-webtui [is-~='button']:disabled,
.anchor-webtui button:disabled {
  opacity: 0.45;
  text-decoration: line-through;
}
.anchor-webtui [is-~='button'][variant-='secondary'],
.anchor-webtui button[variant-='secondary'] {
  color: var(--foreground0);
  background: transparent;
  outline: 2px solid var(--background3);
  outline-offset: -2px;
}
.anchor-webtui [is-~='button'][variant-='danger'],
.anchor-webtui button[variant-='danger'] {
  background: var(--nord11);
  color: var(--foreground0);
}
.anchor-webtui input,
.anchor-webtui textarea {
  width: 100%;
  min-width: 0;
  background: var(--background2);
  color: var(--foreground0);
  border: 0;
  font: inherit;
  padding: 8px 10px;
}
.anchor-webtui textarea { min-height: 70px; resize: vertical; }
.anchor-webtui input::placeholder,
.anchor-webtui textarea::placeholder { color: var(--foreground2); opacity: 0.78; }
.anchor-webtui table {
  width: 100%;
  border-collapse: collapse;
  font: inherit;
  color: var(--foreground1);
  background: var(--background1);
}
.anchor-webtui th {
  color: var(--foreground0);
  text-transform: uppercase;
  font-size: 11px;
  text-align: left;
  border-bottom: 2px solid var(--table-border-color);
}
.anchor-webtui th,
.anchor-webtui td {
  padding: 7px 8px;
  vertical-align: top;
  border-right: 1px solid var(--table-border-color);
}
.anchor-webtui th:last-child,
.anchor-webtui td:last-child { border-right: 0; }
.anchor-webtui tr:not(:last-child) td { border-bottom: 1px solid var(--background2); }
.anchor-webtui [is-~='progress'] {
  --progress-value: 0%;
  display: block;
  width: 100%;
  height: 16px;
  background: var(--background2);
  position: relative;
  overflow: hidden;
}
.anchor-webtui [is-~='progress']::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--progress-value);
  background: var(--progress-color, var(--foreground0));
}
.anchor-webtui [is-~='separator'] {
  display: block;
  height: 18px;
  background-image: linear-gradient(0deg, transparent 0, transparent 8px, var(--separator-color) 8px, var(--separator-color) 10px, transparent 10px);
}
.wt-topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
}
.wt-title {
  display: inline-flex;
  align-items: center;
  gap: 1ch;
  color: var(--foreground0);
  font-size: 18px;
}
.wt-kicker {
  color: var(--nord8);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.wt-muted { color: var(--foreground2); }
.wt-grid { display: grid; gap: 12px; }
.wt-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.wt-grid-main { grid-template-columns: minmax(300px, 0.76fr) minmax(0, 1.24fr); align-items: start; }
.wt-grid-2 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
.wt-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.wt-stack { display: grid; gap: 10px; }
.wt-section-title {
  color: var(--nord8);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.wt-mode {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  background: var(--background1);
  border-left: 6px solid var(--nord8);
  padding: 8px 10px;
}
.wt-mode[data-active='true'] { border-left-color: var(--nord14); }
.wt-mc-pane {
  min-height: 100%;
  background: #24304a;
}
.wt-mc-pane [box-='double']::before,
.wt-mc-pane[box-='double']::before {
  border-color: var(--nord8);
}
.wt-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wt-tab {
  color: var(--foreground1);
  background: var(--background1);
  border: 1px solid var(--background3);
  padding: 5px 10px;
  text-transform: uppercase;
}
.wt-tab[data-active='true'] {
  color: var(--background0);
  background: var(--nord8);
  border-color: var(--nord8);
}
.wt-meters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.wt-meter {
  display: grid;
  grid-template-columns: 6ch minmax(0, 1fr) 5ch;
  gap: 8px;
  align-items: center;
}
.wt-meter code {
  color: var(--nord8);
  background: transparent;
  font: inherit;
  font-weight: 700;
}
.wt-stat-value {
  display: block;
  font-size: 28px;
  line-height: 1;
  color: var(--foreground0);
  margin-top: 8px;
}
.wt-label {
  color: var(--foreground2);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.wt-command {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--background0);
  color: var(--nord14);
  padding: 8px 10px;
  border: 1px solid var(--background3);
}
.wt-score-card {
  display: grid;
  gap: 7px;
  background: var(--background1);
  border-left: 5px solid var(--score-color, var(--foreground0));
  padding: 10px;
}
.wt-repo-card {
  position: relative;
  isolation: isolate;
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 12px 14px 14px;
  background: var(--background1);
  border-top: 2px solid var(--repo-color, var(--nord8));
  color: var(--foreground0);
}
.wt-repo-card::before {
  content: '';
  position: absolute;
  inset: 5px 7px;
  border: 1px solid var(--background3);
  pointer-events: none;
  z-index: -1;
}
.wt-repo-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.wt-repo-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wt-dq-row {
  display: grid;
  grid-template-columns: minmax(160px, 0.45fr) minmax(0, 0.55fr);
  gap: 12px;
  align-items: center;
}
.wt-dq-gauge,
.wt-liquid {
  display: block;
  width: 100%;
  max-width: 180px;
  height: auto;
}
.wt-dq-viz {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 86px;
  gap: 8px;
  align-items: center;
}
.wt-metric-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 5px 8px;
  min-width: 0;
}
.wt-actor-metric {
  color: var(--foreground1);
  background: var(--background0);
  border-left: 3px solid var(--repo-color, var(--nord8));
  padding: 5px 7px;
}
.wt-sparkline {
  color: var(--metric-color, var(--foreground0));
  background: transparent;
  font: inherit;
  font-weight: 700;
}
.wt-metric-bar {
  display: grid;
  grid-template-columns: 4ch minmax(42px, 1fr) 4ch;
  gap: 5px;
  align-items: center;
  color: var(--foreground1);
}
.wt-metric-bar strong,
.wt-metric-bar span {
  font-size: 11px;
  line-height: 1;
}
.wt-metric-bar strong { color: var(--foreground0); }
.wt-metric-bar span { color: var(--foreground2); text-align: right; }
.wt-chart-panel {
  background: var(--background1);
  border: 1px solid var(--background3);
  padding: 8px;
}
.wt-signal-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  color: var(--foreground1);
  background: var(--background0);
  border: 1px solid var(--background3);
  padding: 2px 7px;
}
.wt-signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  background: var(--signal-color, var(--nord14));
}
.wt-nursery-map {
  position: relative;
  min-height: 360px;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(255,255,255,.55) 0 4%, transparent 4.2%),
    radial-gradient(circle at 77% 25%, rgba(255,255,255,.45) 0 5%, transparent 5.4%),
    linear-gradient(180deg, #314a7c 0 14%, #15718c 14% 35%, #7fb46b 35% 55%, #cbb992 55% 100%);
}
.wt-nursery-map::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 30%;
  height: 52px;
  background: rgba(170,230,238,.58);
  border-top: 4px solid rgba(255,255,255,.25);
  border-bottom: 4px solid rgba(0,0,0,.18);
}
.wt-nursery-map::after {
  content: '';
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: 8%;
  height: 26%;
  background: #9acf7a;
  box-shadow: 0 0 0 5px rgba(45,88,48,.35), inset 0 0 30px rgba(255,255,255,.25);
}
.wt-map-room {
  position: absolute;
  z-index: 2;
  border: 2px solid rgba(9,13,18,.62);
  background: rgba(255,255,255,.18);
  box-shadow: 0 8px 0 rgba(0,0,0,.12);
}
.wt-room-meadow { left: 8%; top: 52%; width: 20%; height: 22%; background: #7fc36d; }
.wt-room-bed { left: 32%; top: 43%; width: 18%; height: 28%; background: #f08bb7; }
.wt-room-library { left: 49%; top: 37%; width: 16%; height: 18%; background: #d69f66; }
.wt-room-harbor { left: 66%; top: 45%; width: 25%; height: 22%; background: #87b7c8; }
.wt-actor-token {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  color: var(--background0);
  background: var(--token-color, var(--nord14));
  border: 3px solid rgba(255,255,255,.62);
  box-shadow: 0 8px 0 rgba(0,0,0,.22);
  font-weight: 800;
}
.wt-actor-label {
  position: absolute;
  z-index: 3;
  min-width: 110px;
  color: var(--foreground0);
  background: rgba(9,13,18,.72);
  border: 1px solid rgba(255,255,255,.18);
  padding: 3px 6px;
  font-size: 11px;
}
.wt-nursery-legend {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 4;
  display: grid;
  gap: 5px;
  min-width: 190px;
  background: rgba(9,13,18,.78);
  border: 1px solid rgba(255,255,255,.18);
  padding: 8px;
}
.wt-heatmap {
  display: grid;
  grid-template-columns: repeat(12, minmax(10px, 1fr));
  gap: 3px;
}
.wt-cell {
  min-height: 18px;
  background: var(--cell-color, var(--background2));
}
.wt-scroll { overflow-x: auto; }
.wt-process-row {
  display: grid;
  grid-template-columns: 8ch minmax(120px, 1fr) 11ch 7ch minmax(180px, 1.4fr) minmax(120px, 1fr);
  gap: 8px;
  align-items: center;
  padding: 5px 7px;
  background: var(--background1);
  border-left: 3px solid var(--process-color, var(--nord8));
}
.wt-process-row:nth-child(even) { background: var(--background2); }
.wt-process-head {
  color: var(--nord8);
  background: var(--background0);
  font-weight: 700;
  text-transform: uppercase;
}
.wt-process-strip {
  width: 100%;
  height: 42px;
  object-fit: contain;
  image-rendering: pixelated;
  background: var(--background0);
  border: 1px solid var(--background3);
}
.wt-split-pane {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}
.wt-reference-url {
  max-width: 34ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wt-legend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}
.wt-legend-item {
  background: var(--background1);
  border-left: 3px solid var(--legend-color, var(--nord8));
  padding: 8px;
}
@media (max-width: 850px) {
  .wt-topbar,
  .wt-grid-4,
  .wt-grid-main,
  .wt-grid-2,
  .wt-dq-row,
  .wt-process-row,
  .wt-split-pane,
  .wt-meters,
  .wt-tabs { grid-template-columns: 1fr; }
}
`;

const REPO_CARD_WORKER_SOURCE = `
const metricKeys = ["NFR", "FFR", "DFR", "HFR", "IDR", "RHR", "SDI", "AHR"];

function metricValue(metrics, key) {
  if (!metrics || typeof metrics !== "object") return 0;
  const exact = metrics[key];
  const lower = metrics[key.toLowerCase()];
  const value = exact ?? lower ?? 0;
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function repoDriftQuotient(repo) {
  const metrics = repo.sidecarMetrics || {};
  const values = metricKeys.map((key) => metricValue(metrics, key));
  const maxMetric = Math.max(0, ...values);
  const phasePenalty = repo.quarantine ? 1 : repo.sidecarPhase === "QUARANTINE" ? 1 : repo.sidecarPhase === "MONITORING" ? 0.05 : 0.15;
  const decisionPenalty = /block|quarantine|deny/i.test(repo.sidecarDecision || "") ? 0.8 : 0;
  return Math.round(Math.max(maxMetric, phasePenalty, decisionPenalty) * 100);
}

function driftGaugeLines(value) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const slots = 9;
  const needle = Math.min(slots - 1, Math.round((clamped / 100) * (slots - 1)));
  const arc = Array.from({ length: slots }, (_, index) => index === needle ? "^" : index < needle ? "_" : " ").join("");
  const base = clamped >= 70 ? "!!" : clamped >= 35 ? "!=" : "|_";
  return ["        \\\\_(" + arc + ")", "        " + base + " DQ " + String(clamped).padStart(3, " ") + "%"];
}

function sparklineForMetric(metrics, key) {
  const value = metricValue(metrics, key);
  const width = 8;
  const filled = Math.max(0, Math.min(width, Math.round(value * width)));
  const marker = value >= 0.7 ? "^" : value >= 0.35 ? "~" : value > 0 ? "." : "_";
  const fillChar = key === "HFR" ? "/" : key === "AHR" ? "x" : key === "DFR" ? "~" : key === "RHR" ? "!" : "=";
  const emptyChar = key === "AHR" ? "." : "_";
  const chars = Array.from({ length: width }, (_, index) => {
    if (index === Math.min(width - 1, filled)) return marker;
    return index < filled ? fillChar : emptyChar;
  });
  if (key === "HFR") return "[HFR:" + chars.join("") + "]";
  return "[" + key + ":" + chars.join("") + "]";
}

function metricTone(metrics, key) {
  const value = metricValue(metrics, key);
  if (value >= 0.7) return "danger";
  if (value >= 0.35) return "warning";
  if (value > 0) return "info";
  return "muted";
}

function displayRepoName(repo) {
  if (repo.repoUrl) {
    const cleaned = String(repo.repoUrl).replace(/\\.git$/, "");
    const match = cleaned.match(/([^/:]+)\\/([^/]+)$/);
    if (match) return match[1] + "/" + match[2];
  }
  return repo.slug || "local/repository";
}

self.onmessage = (event) => {
  const repos = event.data?.repos || [];
  const committers = event.data?.committers || [];
  const cards = repos.map((repo) => {
    const actors = committers
      .filter((actor) => (actor.repositories || []).includes(repo.slug))
      .slice(0, 3)
      .map((actor) => ({ id: actor.id, score: actor.score, status: actor.status, phase: actor.phase, metrics: actor.metrics }));
    const primaryActor = actors[0] || null;
    const metrics = primaryActor?.metrics || repo.sidecarMetrics || {};
    const dq = primaryActor ? Math.round(Math.max(0, ...metricKeys.map((key) => metricValue(metrics, key))) * 100) : repoDriftQuotient(repo);
    return {
      slug: repo.slug,
      name: displayRepoName(repo),
      dq,
      phase: primaryActor?.phase || (repo.quarantine ? "quarantine" : repo.sidecarPhase || "NURSERY"),
      branch: repo.branch || "main",
      eventCount: repo.eventCount || 0,
      lastSyncedSha: repo.lastSyncedSha || null,
      gaugeLines: driftGaugeLines(dq),
      actors: actors.length ? actors : [{ id: "unassigned", score: 0, status: "watch" }],
      metrics: metricKeys.map((key) => ({ key, value: metricValue(metrics, key), spark: sparklineForMetric(metrics, key), tone: metricTone(metrics, key) }))
    };
  });
  self.postMessage({ type: "repo-cards", cards, generatedAt: new Date().toISOString() });
};
`;

export async function buildAnchorDashboardModel(slug, { cwd = process.cwd(), env = process.env } = {}) {
  const slugs = await discoverAnchorSlugs(slug, env);
  const repositories = [];
  const eventStreams = [];

  for (const repoSlug of slugs) {
    const snapshot = await buildRepositorySnapshot(repoSlug, { cwd, env });
    if (!snapshot) continue;
    repositories.push(snapshot.repository);
    eventStreams.push({ repository: snapshot.repository, events: snapshot.events });
  }

  const current = repositories.find((repo) => repo.slug === slug) || repositories[0] || null;
  const events = eventStreams.find((stream) => stream.repository.slug === slug)?.events || [];

  return {
    generatedAt: new Date().toISOString(),
    cwd,
    slug,
    optedIn: !!current?.optedIn,
    branch: current?.branch || "unknown",
    planPhase: current?.planPhase || "none",
    sidecarPhase: current?.sidecarPhase || "NURSERY",
    quarantine: !!current?.quarantine,
    repositories,
    committers: computeCommitterScores(eventStreams),
    events: events.map(serializeEvent)
  };
}

async function discoverAnchorSlugs(currentSlug, env) {
  const home = anchorHome(env);
  const slugs = new Set([currentSlug]);
  try {
    const entries = await readdir(home, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && existsSync(statePath(entry.name, env))) slugs.add(entry.name);
    }
  } catch {}
  return Array.from(slugs).filter(Boolean).sort();
}

async function buildRepositorySnapshot(slug, { cwd, env }) {
  const state = await readState(slug, env);
  if (!state) return null;
  const plan = await readPlan(slug, env);
  const events = await tail(slug, 240, env);
  const sidecar = state.sidecar || {};
  const metrics = sidecar.lastDecision?.metrics || {};
  return {
    repository: {
      slug,
      repoUrl: state.repoUrl || null,
      branch: state.branch || "unknown",
      cwd,
      optedIn: !!state.optedIn,
      cloudAgentId: state.cloudAgentId || null,
      lastSyncedSha: state.lastSyncedSha || null,
      planPhase: activePhase(plan) || "none",
      sidecarPhase: sidecar.phase || "NURSERY",
      quarantine: !!sidecar.quarantine,
      sidecarDecision: sidecar.lastDecision?.decision || "none",
      sidecarMetrics: metrics,
      eventCount: events.length,
      lastEventAt: events.at(-1)?.ts || null
    },
    events
  };
}

export async function writeAnchorDashboard(model, { cwd = process.cwd(), env = process.env } = {}) {
  const workspaceId = canvasWorkspaceId(cwd);
  const canvasDir = env.CURSOR_CANVAS_DIR || path.join(cursorProjectsHome(env), workspaceId, "canvases");
  await mkdir(canvasDir, { recursive: true });
  const filePath = path.join(canvasDir, CANVAS_FILE_NAME);
  await writeFile(filePath, renderAnchorDashboardCanvas(model), "utf8");
  return { filePath, workspaceId };
}

export function canvasWorkspaceId(workspacePath) {
  const normalized = path.resolve(workspacePath).replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized.replace(/\/+/g, "-").replace(/[^a-z0-9._-]/gi, "_") || "empty-window";
}

export function cursorProjectsHome(env = process.env) {
  return env.CURSOR_PROJECTS_HOME || path.join(os.homedir(), ".cursor", "projects");
}

function computeCommitterScores(streams) {
  const actors = new Map();
  for (const stream of streams) {
    for (const event of stream.events) {
      const actorId = actorFromEvent(event);
      if (!actorId || actorId === "unknown") continue;
      const actor = ensureActor(actors, actorId);
      actor.events += 1;
      actor.repositories.add(stream.repository.slug);
      actor.lastSeen = maxIso(actor.lastSeen, event.ts);
      if (event.type === "commit") actor.commits += 1;
      if (event.type === "drift-flag") {
        actor.driftFlags += 1;
        const report = event.data?.report || {};
        const metrics = normalizeMetricSet(report.metrics || {});
        actor.metricsSamples += 1;
        actor.latestMetrics = metrics;
        actor.latestDecision = report.decision || "none";
        actor.latestSeverity = report.severity || "none";
        actor.latestPhase = report.phase || "NURSERY";
        actor.maxMetric = Math.max(actor.maxMetric, maxMetricValue(metrics));
        for (const key of DASHBOARD_METRIC_KEYS) {
          actor.metricTotals[key] = (actor.metricTotals[key] || 0) + Number(metrics[key] || 0);
          actor.maxMetrics[key] = Math.max(actor.maxMetrics[key] || 0, Number(metrics[key] || 0));
        }
        if (report.severity === "quarantine") actor.quarantines += 1;
      }
      if (/rat-hole|rat hole/i.test(JSON.stringify(event.data || {}))) actor.ratHoles += 1;
    }
  }

  return Array.from(actors.values())
    .map((actor) => {
      const metrics = actor.latestMetrics || normalizeMetricSet({});
      const maxMetric = maxMetricValue(metrics);
      const score = Math.max(0, Math.round((1 - maxMetric) * 100));
      const nurserySamples = actor.metricsSamples;
      const phase = actor.quarantines > 0 || actor.latestPhase === "QUARANTINE" || maxMetric >= 0.6
        ? "QUARANTINE"
        : nurserySamples < 30
          ? "NURSERY"
          : "MONITORING";
      return {
        id: actor.id,
        score,
        status: phase === "QUARANTINE" ? "quarantine" : score >= 85 ? "nominal" : score >= 65 ? "watch" : "degraded",
        phase,
        nurserySamples,
        nurseryRemaining: Math.max(0, 30 - nurserySamples),
        metrics,
        maxMetrics: roundMetricSet(actor.maxMetrics),
        baselines: averageMetricSet(actor.metricTotals, nurserySamples),
        latestDecision: actor.latestDecision,
        latestSeverity: actor.latestSeverity,
        commits: actor.commits,
        events: actor.events,
        driftFlags: actor.driftFlags,
        quarantines: actor.quarantines,
        ratHoles: actor.ratHoles,
        maxRisk: round3(maxMetric),
        repositories: Array.from(actor.repositories).sort(),
        lastSeen: actor.lastSeen
      };
    })
    .sort((a, b) => a.score - b.score || b.events - a.events || a.id.localeCompare(b.id));
}

const DASHBOARD_METRIC_KEYS = ["NFR", "FFR", "DFR", "HFR", "IDR", "RHR", "SDI", "AHR"];

function normalizeMetricSet(metrics = {}) {
  const normalized = {};
  for (const key of DASHBOARD_METRIC_KEYS) {
    const value = metrics[key] ?? metrics[key.toLowerCase()] ?? 0;
    normalized[key] = round3(Math.max(0, Math.min(1, Number(value) || 0)));
  }
  return normalized;
}

function roundMetricSet(metrics = {}) {
  return normalizeMetricSet(metrics);
}

function averageMetricSet(totals = {}, samples = 0) {
  const averaged = {};
  for (const key of DASHBOARD_METRIC_KEYS) {
    averaged[key] = samples > 0 ? round3((Number(totals[key]) || 0) / samples) : 0;
  }
  return averaged;
}

function maxMetricValue(metrics = {}) {
  return Math.max(0, ...DASHBOARD_METRIC_KEYS.map((key) => Number(metrics[key]) || 0));
}

function ensureActor(actors, id) {
  if (!actors.has(id)) {
    actors.set(id, {
      id,
      repositories: new Set(),
      commits: 0,
      events: 0,
      driftFlags: 0,
      quarantines: 0,
      ratHoles: 0,
      maxMetric: 0,
      metricsSamples: 0,
      metricTotals: normalizeMetricSet({}),
      maxMetrics: normalizeMetricSet({}),
      latestMetrics: normalizeMetricSet({}),
      latestDecision: "none",
      latestSeverity: "none",
      latestPhase: "NURSERY",
      lastSeen: null
    });
  }
  return actors.get(id);
}

function actorFromEvent(event) {
  return (
    event?.data?.actor_id ||
    event?.data?.actorId ||
    event?.data?.author ||
    event?.data?.committer ||
    event?.data?.report?.actor_id ||
    event?.data?.report?.actorId ||
    null
  );
}

function riskFromReport(report = {}) {
  const metrics = report.metrics || {};
  const maxMetric = Math.max(0, ...Object.values(metrics).map((value) => Number(value) || 0));
  const severity = { none: 0, low: 0.25, medium: 0.55, high: 0.8, quarantine: 1 }[report.severity] || 0;
  return Math.max(maxMetric, severity);
}

function maxIso(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

function serializeEvent(event) {
  return {
    ts: event.ts || "unknown",
    type: event.type || "unknown",
    actor: actorFromEvent(event) || "unknown",
    data: summarizeEventData(event.data),
    references: extractReferenceRecords(event)
  };
}

function summarizeEventData(data = {}) {
  if (!data || typeof data !== "object") return String(data || "");
  const useful = ["action", "branch", "repoUrl", "sha", "subject", "actor_id", "decision", "path", "message"];
  const parts = [];
  for (const key of useful) if (data[key]) parts.push(`${key}: ${String(data[key])}`);
  if (data.report?.message) parts.push(`report: ${data.report.message}`);
  return parts.join(", ") || JSON.stringify(data).slice(0, 180);
}

function extractReferenceRecords(event = {}) {
  const data = event.data || {};
  const actor = actorFromEvent(event) || "unknown";
  const candidates = [
    data.references,
    data.referenceUrls,
    data.reference_urls,
    data.urls,
    data.report?.references,
    data.report?.referenceUrls,
    data.report?.reference_urls,
    data.report?.urlHealth
  ].filter(Boolean);
  const rows = [];
  for (const candidate of candidates) {
    const entries = Array.isArray(candidate) ? candidate : Object.values(candidate);
    for (const entry of entries) {
      if (typeof entry === "string") {
        rows.push(referenceRecord({ url: entry }, event, actor));
      } else if (entry && typeof entry === "object") {
        rows.push(referenceRecord(entry, event, actor));
      }
    }
  }
  return rows;
}

function referenceRecord(entry, event, actor) {
  return {
    url: String(entry.url || entry.href || entry.reference || ""),
    status: String(entry.status || entry.classification || entry.health || "unknown").toUpperCase(),
    actor: String(entry.actor || entry.actor_id || actor),
    sourceEvent: String(entry.sourceEvent || entry.source_event || event.type || "unknown"),
    correctionStatus: String(entry.correctionStatus || entry.correction_status || entry.correction || "open"),
    replacementUrl: entry.replacementUrl || entry.replacement_url || entry.replacement || "",
    waybackStatus: String(entry.waybackStatus || entry.wayback_status || entry.wayback || "unknown")
  };
}

function round3(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

export function renderAnchorDashboardCanvas(model) {
  return `import {
  BarChart,
  Callout,
  Grid,
  LineChart,
  Row,
  Stack,
  useCanvasState
} from "cursor/canvas";

const snapshot = ${safeJson(model)};
const webtuiCss = ${JSON.stringify(WEBTUI_CANVAS_CSS)};
const repoCardWorkerSource = ${JSON.stringify(REPO_CARD_WORKER_SOURCE)};
const channelName = "anchor-dashboard-v1";
const localStorageKey = "anchor.dashboard.state.v1";
let bootstrappedBuildId = null;

function attrs(value) {
  return value;
}

function slugFromRepoUrl(repoUrl) {
  const cleaned = String(repoUrl || "").replace(/^git@([^:]+):/, "https://$1/").replace(/^ssh:\\/\\/git@([^/]+)\\//, "https://$1/").replace(/\\.git$/, "");
  const match = cleaned.match(/([^/:]+)\\/([^/]+)$/);
  if (!match) return cleaned.replace(/[^a-z0-9._-]/gi, "_") || "local-repo";
  return (match[1] + "__" + match[2]).replace(/[^a-z0-9._-]/gi, "_");
}

function mergeRepos(base, next) {
  const bySlug = new Map();
  for (const repo of [...(base || []), ...(next || [])]) {
    if (!repo?.slug) continue;
    bySlug.set(repo.slug, Object.assign({}, bySlug.get(repo.slug) || {}, repo));
  }
  return Array.from(bySlug.values()).sort((a, b) => a.slug.localeCompare(b.slug));
}

function enrollmentCommand(repo) {
  const url = repo.repoUrl || repo.url || "";
  return "node plugins/anchor/scripts/anchor-cli.mjs opt-in --no-cloud" + (url ? " --repo-url " + url : "");
}

function statusVariant(status) {
  if (status === "nominal" || status === "enrolled" || status === "MONITORING") return "success";
  if (status === "watch" || status === "pending" || status === "NURSERY" || status === "PENDING") return "warning";
  if (status === "degraded") return "info";
  if (status === "quarantine" || status === "blocked" || status === "QUARANTINE") return "danger";
  return "muted";
}

function scoreColor(score) {
  if (score >= 85) return "var(--nord14)";
  if (score >= 65) return "var(--nord13)";
  if (score >= 40) return "var(--nord12)";
  return "var(--nord11)";
}

const driftMetricKeys = ["NFR", "FFR", "DFR", "HFR", "IDR", "RHR", "SDI", "AHR"];

function metricValue(metrics, key) {
  if (!metrics || typeof metrics !== "object") return 0;
  const exact = metrics[key];
  const lower = metrics[key.toLowerCase()];
  const value = exact ?? lower ?? 0;
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function repoDriftQuotient(repo) {
  const metrics = repo.sidecarMetrics || {};
  const values = driftMetricKeys.map((key) => metricValue(metrics, key));
  const maxMetric = Math.max(0, ...values);
  const phasePenalty = repo.quarantine ? 1 : repo.sidecarPhase === "QUARANTINE" ? 1 : repo.sidecarPhase === "MONITORING" ? 0.05 : 0.15;
  const decisionPenalty = /block|quarantine|deny/i.test(repo.sidecarDecision || "") ? 0.8 : 0;
  return Math.round(Math.max(maxMetric, phasePenalty, decisionPenalty) * 100);
}

function driftGaugeLines(value) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const slots = 9;
  const needle = Math.min(slots - 1, Math.round((clamped / 100) * (slots - 1)));
  const arc = Array.from({ length: slots }, (_, index) => index === needle ? "^" : index < needle ? "_" : " ").join("");
  const base = clamped >= 70 ? "!!" : clamped >= 35 ? "!=" : "|_";
  return ["        \\\\_(" + arc + ")", "        " + base + " DQ " + String(clamped).padStart(3, " ") + "%"];
}

function sparklineForMetric(metrics, key) {
  const value = metricValue(metrics, key);
  const width = 8;
  const filled = Math.max(0, Math.min(width, Math.round(value * width)));
  const marker = value >= 0.7 ? "^" : value >= 0.35 ? "~" : value > 0 ? "." : "_";
  const fillChar = key === "HFR" ? "/" : key === "AHR" ? "x" : key === "DFR" ? "~" : key === "RHR" ? "!" : "=";
  const emptyChar = key === "AHR" ? "." : "_";
  const chars = Array.from({ length: width }, (_, index) => {
    if (index === Math.min(width - 1, filled)) return marker;
    return index < filled ? fillChar : emptyChar;
  });
  if (key === "HFR") return "[HFR:" + chars.join("") + "]";
  return "[" + key + ":" + chars.join("") + "]";
}

function metricColor(metrics, key) {
  const value = metricValue(metrics, key);
  if (value >= 0.7) return "var(--nord11)";
  if (value >= 0.35) return "var(--nord13)";
  if (value > 0) return "var(--nord8)";
  return "var(--foreground2)";
}

function metricToneColor(tone) {
  if (tone === "danger") return "var(--nord11)";
  if (tone === "warning") return "var(--nord13)";
  if (tone === "info") return "var(--nord8)";
  return "var(--foreground2)";
}

function polarPoint(cx, cy, radius, angleDeg) {
  const angle = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return "M " + start.x.toFixed(2) + " " + start.y.toFixed(2) + " A " + radius + " " + radius + " 0 " + large + " 0 " + end.x.toFixed(2) + " " + end.y.toFixed(2);
}

function GaugeViz({ value, label }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const angle = -120 + clamped * 2.4;
  const needle = polarPoint(72, 72, 42, angle);
  const color = clamped >= 70 ? "var(--nord11)" : clamped >= 35 ? "var(--nord13)" : "var(--nord14)";
  return (
    <svg className="wt-dq-gauge" viewBox="0 0 144 98" role="img" aria-label={(label || "DQ") + " " + String(clamped)}>
      <path d={arcPath(72, 72, 54, -120, 120)} fill="none" stroke="var(--background2)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(72, 72, 54, -120, -25)} fill="none" stroke="var(--nord14)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(72, 72, 54, -25, 45)} fill="none" stroke="var(--nord13)" strokeWidth="10" />
      <path d={arcPath(72, 72, 54, 45, 120)} fill="none" stroke="var(--nord11)" strokeWidth="10" strokeLinecap="round" />
      <line x1="72" y1="72" x2={needle.x} y2={needle.y} stroke="var(--foreground0)" strokeWidth="3" />
      <circle cx="72" cy="72" r="7" fill="var(--background0)" stroke="var(--foreground0)" strokeWidth="3" />
      <text x="72" y="29" textAnchor="middle" fill="var(--foreground2)" fontSize="10">50</text>
      <text x="28" y="67" textAnchor="middle" fill="var(--foreground2)" fontSize="10">0</text>
      <text x="116" y="67" textAnchor="middle" fill="var(--foreground2)" fontSize="10">100</text>
      <text x="72" y="94" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{clamped}</text>
    </svg>
  );
}

function LiquidViz({ value, id }) {
  const clamped = Math.max(0, Math.min(1, Number(value) || 0));
  const waterY = 78 - clamped * 58;
  const clipId = "liq-" + String(id || "x").replace(/[^a-zA-Z0-9_-]/g, "-");
  const wave = "M 12 " + waterY.toFixed(1) + " C 24 " + (waterY - 7).toFixed(1) + ", 36 " + (waterY + 7).toFixed(1) + ", 48 " + waterY.toFixed(1) + " S 72 " + (waterY - 7).toFixed(1) + ", 84 " + waterY.toFixed(1) + " S 108 " + (waterY + 7).toFixed(1) + ", 120 " + waterY.toFixed(1) + " V 120 H 12 Z";
  return (
    <svg className="wt-liquid" viewBox="0 0 132 132" role="img" aria-label={"Health " + String(Math.round(clamped * 100))}>
      <defs><clipPath id={clipId}><circle cx="66" cy="66" r="55" /></clipPath></defs>
      <circle cx="66" cy="66" r="55" fill="none" stroke="var(--background2)" strokeWidth="4" />
      <g clipPath={"url(#" + clipId + ")"}>
        <rect x="8" y="8" width="116" height="116" fill="var(--background0)" />
        <path d={wave} fill="var(--nord10)" opacity="0.92" />
      </g>
      <circle cx="66" cy="66" r="55" fill="none" stroke="var(--nord10)" strokeWidth="4" />
      <text x="66" y="72" textAnchor="middle" fill="var(--foreground0)" fontSize="18" fontWeight="700">{Math.round(clamped * 100)}%</text>
    </svg>
  );
}

function metricToneForValue(value) {
  const clamped = Math.max(0, Math.min(1, Number(value) || 0));
  if (clamped >= 0.7) return "danger";
  if (clamped >= 0.35) return "warning";
  if (clamped > 0) return "info";
  return "muted";
}

function metricItems(metrics, items) {
  if (Array.isArray(items)) {
    return items.map((item) => ({
      key: item.key,
      value: Math.max(0, Math.min(1, Number(item.value) || 0)),
      tone: item.tone || metricToneForValue(item.value)
    }));
  }
  return driftMetricKeys.map((key) => {
    const value = metricValue(metrics || {}, key);
    return { key, value, tone: metricToneForValue(value) };
  });
}

function MetricBarStrip({ metrics, items }) {
  return (
    <div className="wt-metric-row">
      {metricItems(metrics, items).map((metric) => (
        <div className="wt-metric-bar" key={metric.key} style={{ "--progress-color": metricToneColor(metric.tone) }}>
          <strong>{metric.key}</strong>
          <Progress value={Math.round(metric.value * 100)} color={metricToneColor(metric.tone)} />
          <span>{Math.round(metric.value * 100)}</span>
        </div>
      ))}
    </div>
  );
}

function topMetricItems(metrics, limit = 3) {
  return metricItems(metrics || {})
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function TopSignalChip({ metrics }) {
  const item = topMetricItems(metrics || {}, 1)[0] || { key: "DQ", value: 0, tone: "muted" };
  return (
    <span className="wt-signal-chip">
      <span className="wt-signal-dot" style={{ "--signal-color": metricToneColor(item.tone) }} />
      <strong>{item.key}</strong>
      <span>{Math.round(item.value * 100)}</span>
    </span>
  );
}

function actorInitials(id) {
  const parts = String(id || "?").replace(/^@/, "").split(/[^a-z0-9]+/i).filter(Boolean);
  const initials = parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return initials || "?";
}

function metricSeries(actor) {
  const categories = driftMetricKeys;
  return {
    categories,
    series: [
      { name: "Current", data: categories.map((key) => Math.round(metricValue(actor.metrics, key) * 100)), tone: "danger" },
      { name: "Baseline", data: categories.map((key) => Math.round(metricValue(actor.baselines, key) * 100)), tone: "info" },
      { name: "Max", data: categories.map((key) => Math.round(metricValue(actor.maxMetrics, key) * 100)), tone: "warning" }
    ]
  };
}

function displayRepoName(repo) {
  if (repo.repoUrl) {
    const cleaned = String(repo.repoUrl).replace(/\\.git$/, "");
    const match = cleaned.match(/([^/:]+)\\/([^/]+)$/);
    if (match) return match[1] + "/" + match[2];
  }
  return repo.slug || "local/repository";
}

function overallScore(committers) {
  if (!committers.length) return 100;
  return Math.round(committers.reduce((sum, actor) => sum + actor.score, 0) / committers.length);
}

function collectReferenceRows(events) {
  const rows = [];
  for (const event of events || []) {
    for (const reference of event.references || []) {
      if (!reference.url) continue;
      rows.push({
        url: reference.url,
        status: String(reference.status || "UNKNOWN").toUpperCase(),
        actor: reference.actor || event.actor || "unknown",
        sourceEvent: reference.sourceEvent || event.type || "unknown",
        correctionStatus: reference.correctionStatus || "open",
        replacementUrl: reference.replacementUrl || "",
        waybackStatus: reference.waybackStatus || "unknown",
        ts: event.ts
      });
    }
  }
  return rows;
}

function referenceTone(status) {
  if (/LIVE|OK|RESOLV/.test(status)) return "success";
  if (/STALE|WAYBACK|ARCHIVE/.test(status)) return "warning";
  if (/HALLUCINATED|NON_RESOLVING|BROKEN|DEAD|FAIL/.test(status)) return "danger";
  return "muted";
}

function readLocalDashboardState() {
  try {
    if (typeof localStorage === "undefined") return null;
    return JSON.parse(localStorage.getItem(localStorageKey) || "null");
  } catch {
    return null;
  }
}

function writeLocalDashboardState(value) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(localStorageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function deriveRepoCardModels(repos, committers) {
  return (repos || []).map((repo) => {
    const actors = (committers || [])
      .filter((actor) => (actor.repositories || []).includes(repo.slug))
      .slice(0, 3)
      .map((actor) => ({ id: actor.id, score: actor.score, status: actor.status, phase: actor.phase, metrics: actor.metrics }));
    const primaryActor = actors[0] || null;
    const metrics = primaryActor?.metrics || repo.sidecarMetrics || {};
    const dq = primaryActor ? Math.round(Math.max(0, ...driftMetricKeys.map((key) => metricValue(metrics, key))) * 100) : repoDriftQuotient(repo);
    return {
      slug: repo.slug,
      name: displayRepoName(repo),
      dq,
      phase: primaryActor?.phase || (repo.quarantine ? "quarantine" : repo.sidecarPhase || "NURSERY"),
      branch: repo.branch || "main",
      eventCount: repo.eventCount || 0,
      lastSyncedSha: repo.lastSyncedSha || null,
      gaugeLines: driftGaugeLines(dq),
      actors: actors.length ? actors : [{ id: "unassigned", score: 0, status: "watch" }],
      metrics: driftMetricKeys.map((key) => ({
        key,
        value: metricValue(metrics, key),
        spark: sparklineForMetric(metrics, key),
        tone: metricValue(metrics, key) >= 0.7 ? "danger" : metricValue(metrics, key) >= 0.35 ? "warning" : metricValue(metrics, key) > 0 ? "info" : "muted"
      }))
    };
  });
}

function buildRepoCardsInWorker(repos, committers) {
  return new Promise((resolve, reject) => {
    if (typeof Worker !== "function" || typeof Blob !== "function" || typeof URL === "undefined") {
      reject(new Error("Worker unavailable"));
      return;
    }
    const blob = new Blob([repoCardWorkerSource], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(new Error("repo-card worker timed out"));
    }, 2500);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(event.data?.cards || []);
    };
    worker.onerror = (error) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(error);
    };
    worker.postMessage({ repos, committers });
  });
}

async function renderActorOffscreenStrip(actors) {
  if (typeof OffscreenCanvas !== "function" || !actors?.length) return null;
  const width = Math.max(240, Math.min(720, actors.length * 72));
  const height = 42;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#2e3440";
  ctx.fillRect(0, 0, width, height);
  actors.forEach((actor, index) => {
    const x = index * 72 + 6;
    const dq = Math.max(0, Math.min(100, 100 - Number(actor.score || 0)));
    const color = dq >= 60 ? "#bf616a" : dq >= 35 ? "#ebcb8b" : "#a3be8c";
    ctx.fillStyle = "#3b4252";
    ctx.fillRect(x, 8, 54, 10);
    ctx.fillStyle = color;
    ctx.fillRect(x, 8, Math.round((dq / 100) * 54), 10);
    ctx.fillStyle = "#d8dee9";
    ctx.font = "10px monospace";
    ctx.fillText(String(actor.id || "?").slice(0, 8), x, 32);
  });
  const blob = await canvas.convertToBlob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB missing"));
    const req = indexedDB.open("anchor-dashboard", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbGet(key) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function withLock(name, fn) {
  if (!navigator.locks?.request) return fn();
  return navigator.locks.request(name, fn);
}

function broadcast(payload) {
  if (typeof BroadcastChannel !== "function") return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage(payload);
  channel.close();
}

async function notify(title, body, enabled) {
  if (!enabled || typeof Notification !== "function") return;
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission === "granted") new Notification(title, { body });
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

async function digestText(text) {
  if (!crypto.subtle?.digest) return "no-crypto";
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function compressedExportSize(payload) {
  if (typeof CompressionStream !== "function") return "compression unavailable";
  const compressed = new Blob([JSON.stringify(payload)]).stream().pipeThrough(new CompressionStream("gzip"));
  const blob = await new Response(compressed).blob();
  return String(blob.size) + " bytes gzip";
}

async function exportJson(payload, setStatus) {
  const digest = await digestText(JSON.stringify(payload));
  const envelope = Object.assign({ digest }, payload);
  const text = JSON.stringify(envelope, null, 2);
  if (typeof showSaveFilePicker === "function") {
    const handle = await showSaveFilePicker({
      suggestedName: "anchor-dashboard-export.json",
      types: [{ description: "Anchor dashboard export", accept: { "application/json": [".json"] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    setStatus("exported json via File System Access");
  } else {
    await writeClipboard(text);
    setStatus("copied export json to clipboard");
  }
}

async function importJson(setRepos, setStatus) {
  if (typeof showOpenFilePicker !== "function") {
    setStatus("File System Access import unavailable");
    return;
  }
  const [handle] = await showOpenFilePicker({
    types: [{ description: "Anchor dashboard export", accept: { "application/json": [".json"] } }],
    multiple: false
  });
  const file = await handle.getFile();
  const parsed = JSON.parse(await file.text());
  setRepos((current) => mergeRepos(current, parsed.repositories || []));
  setStatus("imported " + String((parsed.repositories || []).length) + " repositories");
}

async function runSummarizer(repos, committers, setAiStatus) {
  if (typeof Summarizer !== "function") {
    setAiStatus("Summarizer is unavailable in this Cursor runtime.");
    return;
  }
  try {
    const availability = await Summarizer.availability();
    const session = await Summarizer.create();
    const result = await session.summarize("Summarize Anchor health in three bullets: " + JSON.stringify({ repos: repos.slice(0, 8), committers: committers.slice(0, 8) }));
    if (typeof session.destroy === "function") session.destroy();
    setAiStatus("Summarizer (" + availability + "): " + result);
  } catch (error) {
    setAiStatus(error && error.message ? error.message : String(error));
  }
}

function scheduleIdle(fn) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn);
  else setTimeout(fn, 0);
}

function Badge({ children, variant }) {
  return <span {...attrs({ "is-": "badge", "variant-": variant || "muted" })}>{children}</span>;
}

function Metric({ label, value, detail, variant }) {
  return (
    <section {...attrs({ "box-": "square" })} style={{ "--box-border-color": "var(--" + (variant || "foreground0") + ")" }}>
      <div className="wt-label">{label}</div>
      <span className="wt-stat-value">{value}</span>
      <div className="wt-muted">{detail}</div>
    </section>
  );
}

function Progress({ value, color }) {
  return <span {...attrs({ "is-": "progress" })} style={{ "--progress-value": String(Math.max(0, Math.min(100, value))) + "%", "--progress-color": color || "var(--foreground0)" }} />;
}

function ModeBanner({ active, enrolled, repositories, score }) {
  return (
    <div className="wt-mode" data-active={active ? "true" : "false"}>
      <Badge variant={active ? "success" : "info"}>{active ? "active // htop" : "setup // midnight commander"}</Badge>
      <div className="wt-muted">
        {active ? "Anchor is monitoring " + String(enrolled) + " enrolled repositories with score " + String(score) + "." : "Stage repositories in the left pane, copy commands from the right pane, then run opt-in in each checkout."}
      </div>
    </div>
  );
}

function SectionTabs({ panel, setPanel }) {
  const tabs = ["overview", "nursery", "references", "corrections"];
  return (
    <nav className="wt-tabs" aria-label="Dashboard sections">
      {tabs.map((tab) => (
        <button className="wt-tab" key={tab} data-active={panel === tab ? "true" : "false"} onClick={() => setPanel(tab)}>
          {tab}
        </button>
      ))}
    </nav>
  );
}

function HtopMeters({ score, repositories, enrolled, committers, events }) {
  const repoLoad = repositories.length ? Math.round((enrolled / repositories.length) * 100) : 0;
  const actorLoad = Math.min(100, committers.length * 12);
  const driftLoad = Math.min(100, (events || []).filter((event) => event.type === "drift-flag").length * 18);
  const eventLoad = Math.min(100, (events || []).length * 4);
  const meters = [
    ["REP", repoLoad, "var(--nord14)", enrolled + "/" + repositories.length],
    ["ACT", actorLoad, "var(--nord8)", String(committers.length)],
    ["DRF", driftLoad, driftLoad ? "var(--nord11)" : "var(--nord14)", String((events || []).filter((event) => event.type === "drift-flag").length)],
    ["HLT", score, scoreColor(score), String(score)]
  ];
  return (
    <section {...attrs({ "box-": "square" })} className="wt-stack" style={{ "--box-border-color": "var(--nord14)" }}>
      <div className="wt-section-title">Active Meters</div>
      <div className="wt-meters">
        {meters.map(([label, value, color, detail]) => (
          <div className="wt-meter" key={label}>
            <code>{label}</code>
            <Progress value={value} color={color} />
            <span className="wt-muted">{detail}</span>
          </div>
        ))}
      </div>
      <div className="wt-muted">events load {eventLoad}% · monitoring loop is local and Canvas-persistent</div>
    </section>
  );
}

function ReferenceHealthQueue({ references }) {
  return (
    <section {...attrs({ "box-": "square" })} className="wt-stack" style={{ "--box-border-color": "var(--nord15)" }}>
      <div className="wt-section-title">Reference Health Queue</div>
      <div className="wt-scroll">
        <table>
          <thead><tr><th>URL</th><th>Status</th><th>Actor</th><th>Source</th><th>Wayback</th><th>Correction</th></tr></thead>
          <tbody>
            {references.length ? references.slice(0, 14).map((row, index) => (
              <tr key={index}>
                <td><div className="wt-reference-url" title={row.url}>{row.url}</div></td>
                <td><Badge variant={referenceTone(row.status)}>{row.status}</Badge></td>
                <td>@{row.actor}</td>
                <td>{row.sourceEvent}</td>
                <td>{row.waybackStatus}</td>
                <td>{row.correctionStatus}</td>
              </tr>
            )) : <tr><td colSpan={6}>No cited URL health records yet. Feed urlhealth classifications into trajectory references to populate this queue.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActorProcessList({ actors, sortKey, setSortKey, offscreenStrip, offscreenStatus }) {
  const sorted = [...actors].sort((a, b) => {
    if (sortKey === "dq") return (100 - b.score) - (100 - a.score);
    if (sortKey === "phase") return String(a.phase).localeCompare(String(b.phase));
    if (sortKey === "rhr") return Number(b.metrics?.RHR || 0) - Number(a.metrics?.RHR || 0);
    return String(a.id).localeCompare(String(b.id));
  });
  return (
    <section {...attrs({ "box-": "square" })} className="wt-stack" style={{ "--box-border-color": "var(--nord14)" }}>
      <div className="wt-row" style={{ justifyContent: "space-between" }}>
        <div className="wt-section-title">Actor Process List</div>
        <div className="wt-row">
          {["dq", "phase", "rhr", "actor"].map((key) => <button key={key} {...attrs({ "variant-": "secondary" })} onClick={() => setSortKey(key)}>{sortKey === key ? "*" : ""}{key}</button>)}
        </div>
      </div>
      {offscreenStrip ? (
        <img className="wt-process-strip" alt="Offscreen actor metric strip" src={offscreenStrip} />
      ) : (
        <div className="wt-muted">OffscreenCanvas strip {offscreenStatus || "pending"}.</div>
      )}
      <div className="wt-process-row wt-process-head"><span>DQ</span><span>Actor</span><span>Phase</span><span>Score</span><span>Signals</span><span>Reason</span></div>
      {sorted.length ? sorted.map((actor) => (
        <div className="wt-process-row" key={actor.id} style={{ "--process-color": scoreColor(actor.score) }}>
          <span>{100 - actor.score}%</span>
          <strong>@{actor.id}</strong>
          <Badge variant={statusVariant(actor.phase)}>{actor.phase}</Badge>
          <span>{actor.score}</span>
          <MetricBarStrip items={topMetricItems(actor.metrics, 4)} />
          <span className="wt-muted">{actor.quarantines ? "quarantine alarm" : actor.latestDecision || "none"}</span>
        </div>
      )) : <Callout tone="neutral" title="No actors">No actor process rows yet.</Callout>}
    </section>
  );
}

function NurseryBaselinePanel({ actors }) {
  const points = [[18, 57], [39, 48], [57, 39], [75, 54], [25, 75], [52, 70], [84, 76], [13, 35]];
  const rows = actors.length ? actors : [{ id: "unassigned", score: 100, phase: "NURSERY", metrics: {} }];
  return (
    <section {...attrs({ "box-": "double" })} className="wt-stack wt-mc-pane">
      <div className="wt-row" style={{ justifyContent: "space-between" }}>
        <div className="wt-section-title">Nursery Map</div>
        <div className="wt-muted">Actors start in the meadow and graduate to harbor after 30 clean samples.</div>
      </div>
      <div className="wt-nursery-map">
        <div className="wt-map-room wt-room-meadow" />
        <div className="wt-map-room wt-room-bed" />
        <div className="wt-map-room wt-room-library" />
        <div className="wt-map-room wt-room-harbor" />
        {rows.slice(0, 8).map((actor, index) => {
          const point = points[index % points.length];
          const risk = 100 - Number(actor.score || 0);
          const tokenColor = risk >= 60 ? "var(--nord11)" : risk >= 35 ? "var(--nord13)" : "var(--nord14)";
          return (
            <div key={actor.id}>
              <div className="wt-actor-token" style={{ left: String(point[0]) + "%", top: String(point[1]) + "%", "--token-color": tokenColor }}>{actorInitials(actor.id)}</div>
              <div className="wt-actor-label" style={{ left: "calc(" + String(point[0]) + "% + 44px)", top: "calc(" + String(point[1]) + "% + 14px)" }}>@{actor.id} · {actor.phase || "NURSERY"} · DQ {risk}</div>
            </div>
          );
        })}
        <div className="wt-nursery-legend">
          <strong>rooms</strong>
          <span>meadow: first samples</span>
          <span>library: plan checks</span>
          <span>harbor: monitoring-ready</span>
          <span>red token: quarantine risk</span>
        </div>
      </div>
    </section>
  );
}

function CorrectionWorkbench({ references }) {
  const failed = references.filter((row) => referenceTone(row.status) === "danger" || row.replacementUrl);
  return (
    <section {...attrs({ "box-": "square" })} className="wt-stack" style={{ "--box-border-color": "var(--nord13)" }}>
      <div className="wt-section-title">Correction Workbench</div>
      <div className="wt-scroll">
        <table>
          <thead><tr><th>Original</th><th>Replacement</th><th>Wayback</th><th>Status</th><th>Actor</th></tr></thead>
          <tbody>
            {failed.length ? failed.slice(0, 10).map((row, index) => (
              <tr key={index}>
                <td><div className="wt-reference-url" title={row.url}>{row.url}</div></td>
                <td><div className="wt-reference-url" title={row.replacementUrl || "none"}>{row.replacementUrl || "none"}</div></td>
                <td>{row.waybackStatus}</td>
                <td>{row.correctionStatus}</td>
                <td>@{row.actor}</td>
              </tr>
            )) : <tr><td colSpan={5}>No failed references waiting for correction.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricLegend() {
  const items = [
    ["NFR", "Non-failure concealment", "var(--nord11)"],
    ["FFR", "Fabricated file/download rate", "var(--nord12)"],
    ["DFR", "Silent source substitution", "var(--nord13)"],
    ["HFR", "Hallucinated downstream answers", "var(--nord15)"],
    ["IDR", "Intentional constraint violations", "var(--nord11)"],
    ["RHR", "Reference hallucination rate", "var(--nord13)"],
    ["SDI", "Semantic drift index", "var(--nord8)"],
    ["AHR", "Artifact hallucination rate", "var(--nord14)"]
  ];
  return (
    <section {...attrs({ "box-": "square" })} className="wt-stack">
      <div className="wt-section-title">Metric Legend / Alarm Explainer</div>
      <div className="wt-legend-grid">
        {items.map(([key, label, color]) => (
          <div className="wt-legend-item" key={key} style={{ "--legend-color": color }}>
            <strong>{key}</strong>
            <div className="wt-muted">{label}</div>
          </div>
        ))}
      </div>
      <div className="wt-muted">Nursery collects 30 actor samples. Any high deception/reference signal at or above 0.600 trips quarantine.</div>
    </section>
  );
}

function RepoDriftCard({ card }) {
  const dq = card.dq || 0;
  const color = dq >= 70 ? "var(--nord11)" : dq >= 35 ? "var(--nord13)" : "var(--nord14)";
  return (
    <article className="wt-repo-card" style={{ "--repo-color": color }}>
      <div className="wt-repo-title">
        <strong>{card.name}</strong>
        <Badge variant={statusVariant(card.phase)}>{card.phase}</Badge>
      </div>
      <div className="wt-dq-row">
        <div className="wt-dq-viz">
          <GaugeViz value={dq} label={card.name + " drift quotient"} />
          <LiquidViz value={1 - dq / 100} id={card.slug} />
        </div>
        <div className="wt-stack">
          <div className="wt-muted">{card.branch || "main"} · {card.eventCount || 0} events · {card.lastSyncedSha ? card.lastSyncedSha.slice(0, 10) : "unsynced"}</div>
          <div className="wt-metric-row">
            {(card.actors || []).slice(0, 3).map((actor) => (
              <span className="wt-actor-metric" key={actor.id}>
                @{actor.id}
              </span>
            ))}
          </div>
        </div>
      </div>
      <TopSignalChip metrics={Object.fromEntries((card.metrics || []).map((metric) => [metric.key, metric.value]))} />
    </article>
  );
}

function RepoDriftCards({ repos, committers, repoCards }) {
  if (!repos.length) return <Callout tone="neutral" title="No repositories">Stage or opt in a repository to create a drift card.</Callout>;
  const fallback = deriveRepoCardModels(repos, committers);
  const bySlug = new Map((repoCards || []).map((card) => [card.slug, card]));
  const cards = fallback.map((card) => bySlug.get(card.slug) || card);
  return (
    <div className="wt-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))" }}>
      {cards.map((card) => <RepoDriftCard key={card.slug} card={card} />)}
    </div>
  );
}

function RepoTable({ repos }) {
  return (
    <div className="wt-scroll">
      <table>
        <thead><tr><th>Slug</th><th>URL</th><th>Branch</th><th>Enrollment</th><th>Events</th><th>Phase</th></tr></thead>
        <tbody>
          {repos.length ? repos.map((repo) => (
            <tr key={repo.slug}>
              <td>{repo.slug}</td>
              <td>{repo.repoUrl || "local/manual"}</td>
              <td>{repo.branch || "main"}</td>
              <td><Badge variant={statusVariant(repo.optedIn ? "enrolled" : repo.enrollmentStatus || "pending")}>{repo.optedIn ? "enrolled" : repo.enrollmentStatus || "pending"}</Badge></td>
              <td>{repo.eventCount || 0}</td>
              <td><Badge variant={statusVariant(repo.quarantine ? "quarantine" : repo.sidecarPhase || "NURSERY")}>{repo.quarantine ? "quarantine" : repo.sidecarPhase || "NURSERY"}</Badge></td>
            </tr>
          )) : <tr><td colSpan={6}>No repositories staged or enrolled.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function CommitterTable({ committers }) {
  return (
    <div className="wt-scroll">
      <table>
        <thead><tr><th>Actor</th><th>Phase</th><th>Score</th><th>NFR</th><th>FFR</th><th>DFR</th><th>HFR</th><th>IDR</th><th>RHR</th><th>SDI</th><th>AHR</th><th>Nursery</th><th>Repos</th></tr></thead>
        <tbody>
          {committers.length ? committers.map((actor) => (
            <tr key={actor.id}>
              <td>{actor.id}</td>
              <td><Badge variant={statusVariant(actor.phase)}>{actor.phase}</Badge></td>
              <td>{actor.score}</td>
              {driftMetricKeys.map((key) => <td key={key}>{Number(actor.metrics?.[key] || 0).toFixed(3)}</td>)}
              <td>{actor.nurserySamples}/30</td>
              <td>{actor.repositories.join(", ") || "none"}</td>
            </tr>
          )) : <tr><td colSpan={13}>No actors scored yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ActorMetricStrip({ metrics }) {
  return <MetricBarStrip metrics={metrics || {}} />;
}

function CommitterWall({ committers }) {
  if (!committers.length) return <Callout tone="neutral" title="No actor telemetry yet">Run sync or record commit telemetry to populate committer scores.</Callout>;
  return (
    <div className="wt-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {committers.slice(0, 8).map((actor) => (
        <div className="wt-score-card" key={actor.id} style={{ "--score-color": scoreColor(actor.score) }}>
          <div className="wt-row" style={{ justifyContent: "space-between" }}>
            <strong>{actor.id}</strong>
            <Badge variant={statusVariant(actor.phase)}>{actor.phase}</Badge>
          </div>
          <Progress value={actor.score} color={scoreColor(actor.score)} />
          <ActorMetricStrip metrics={actor.metrics} />
          <div className="wt-muted">{actor.score}/100 · nursery {actor.nurserySamples}/30 · baseline NFR {Number(actor.baselines?.NFR || 0).toFixed(3)}</div>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ events }) {
  const cells = Array.from({ length: 36 }, (_, index) => events[events.length - 36 + index]).map((event) => {
    if (!event) return "var(--background2)";
    if (event.type === "drift-flag") return "var(--nord11)";
    if (event.type === "commit") return "var(--nord14)";
    if (/session|prompt|hook/i.test(event.type)) return "var(--nord8)";
    return "var(--nord13)";
  });
  return <div className="wt-heatmap">{cells.map((color, index) => <span className="wt-cell" key={index} style={{ "--cell-color": color }} title={events[index]?.type || "empty"} />)}</div>;
}

export default function AnchorDashboard() {
  const baseRepos = snapshot.repositories || [];
  const [repos, setRepos] = useCanvasState("anchor.repositories", baseRepos);
  const [form, setForm] = useCanvasState("anchor.enrollmentForm", { repoUrl: "", branch: "main", note: "" });
  const [status, setStatus] = useCanvasState("anchor.dashboardStatus", "ready");
  const [alertsEnabled, setAlertsEnabled] = useCanvasState("anchor.alertsEnabled", false);
  const [aiStatus, setAiStatus] = useCanvasState("anchor.aiStatus", "not run");
  const [repoCards, setRepoCards] = useCanvasState("anchor.repoCards", []);
  const [actorSortKey, setActorSortKey] = useCanvasState("anchor.actorSortKey", "dq");
  const [dashboardPanel, setDashboardPanel] = useCanvasState("anchor.dashboardPanel", "overview");
  const [offscreenStrip, setOffscreenStrip] = useCanvasState("anchor.offscreenActorStrip", null);
  const [offscreenStatus, setOffscreenStatus] = useCanvasState("anchor.offscreenStatus", "pending");

  const committers = snapshot.committers || [];
  const references = collectReferenceRows(snapshot.events || []);
  const mergedRepos = mergeRepos(baseRepos, repos);
  const score = overallScore(committers);
  const enrolled = mergedRepos.filter((repo) => repo.optedIn || repo.enrollmentStatus === "enrolled").length;
  const quarantined = mergedRepos.filter((repo) => repo.quarantine).length;
  const active = enrolled > 0;
  const commandPreview = form.repoUrl ? enrollmentCommand({ repoUrl: form.repoUrl }) : "node plugins/anchor/scripts/anchor-cli.mjs opt-in --no-cloud --repo-url <repo>";

  if (bootstrappedBuildId !== snapshot.generatedAt) {
    bootstrappedBuildId = snapshot.generatedAt;
    scheduleIdle(async () => {
      try {
        const local = readLocalDashboardState();
        if (local?.repositories) setRepos((current) => mergeRepos(current, local.repositories));
        if (local?.repoCards) setRepoCards(local.repoCards);
        const stored = await idbGet("state");
        if (stored?.repositories) setRepos((current) => mergeRepos(current, stored.repositories));
        if (stored?.repoCards) setRepoCards(stored.repoCards);
        try {
          const strip = await renderActorOffscreenStrip(committers);
          if (strip) {
            setOffscreenStrip(strip);
            setOffscreenStatus("created");
          } else {
            setOffscreenStatus("unavailable");
          }
        } catch (error) {
          setOffscreenStatus(error?.message || String(error));
        }
        let cards = deriveRepoCardModels(mergedRepos, committers);
        try {
          cards = await buildRepoCardsInWorker(mergedRepos, committers);
          setStatus("repo cards refreshed by Worker");
        } catch {
          setStatus("repo cards refreshed without Worker");
        }
        setRepoCards(cards);
        const nextState = { repositories: mergedRepos, repoCards: cards, updatedAt: new Date().toISOString() };
        writeLocalDashboardState(nextState);
        await idbSet("state", nextState);
      } catch (error) {
        setStatus(error && error.message ? error.message : String(error));
      }
    });
  }

  async function enrollRepo() {
    const slug = slugFromRepoUrl(form.repoUrl);
    const repo = {
      slug,
      repoUrl: form.repoUrl,
      branch: form.branch || "main",
      note: form.note || "",
      optedIn: false,
      enrollmentStatus: "pending",
      eventCount: 0,
      sidecarPhase: "PENDING",
      quarantine: false,
      createdAt: new Date().toISOString()
    };
    const next = mergeRepos(mergedRepos, [repo]);
    await withLock("anchor-dashboard-write", async () => {
      setRepos(next);
      let cards = deriveRepoCardModels(next, committers);
      try {
        cards = await buildRepoCardsInWorker(next, committers);
      } catch {}
      setRepoCards(cards);
      const nextState = { repositories: next, repoCards: cards, updatedAt: new Date().toISOString() };
      writeLocalDashboardState(nextState);
      await idbSet("state", nextState);
    });
    broadcast({ type: "repository-enrolled", repo });
    await writeClipboard(enrollmentCommand(repo));
    await notify("Anchor enrollment staged", slug + " command copied to clipboard", alertsEnabled);
    setStatus("staged " + slug + " and copied opt-in command");
  }

  async function exportState() {
    const payload = { generatedAt: new Date().toISOString(), repositories: mergedRepos, committers };
    const gzipSize = await compressedExportSize(payload);
    await exportJson(Object.assign({ gzipSize }, payload), setStatus);
  }

  return (
    <div className="anchor-webtui">
      <style>{webtuiCss}</style>
      <Stack gap={14}>
        <header className="wt-topbar">
          <div className="wt-stack">
            <div className="wt-kicker">webtui // anchor control plane</div>
            <h1 className="wt-title"><span>{active ? "Anchor Monitor" : "Repository Enrollment"}</span><Badge variant={quarantined ? "danger" : "success"}>{quarantined ? "quarantine" : "nominal"}</Badge></h1>
            <div className="wt-muted">generated {snapshot.generatedAt.replace("T", " ").replace("Z", " UTC")} · {snapshot.slug} · {snapshot.branch}</div>
          </div>
          <div className="wt-row" style={{ justifyContent: "flex-end" }}>
            <Badge variant={statusVariant(snapshot.planPhase)}>{snapshot.planPhase}</Badge>
            <Badge variant={statusVariant(snapshot.sidecarPhase)}>{snapshot.sidecarPhase}</Badge>
            <button {...attrs({ "variant-": "secondary" })} onClick={() => setAlertsEnabled(!alertsEnabled)}>{alertsEnabled ? "alerts on" : "alerts off"}</button>
          </div>
        </header>

        <ModeBanner active={active} enrolled={enrolled} repositories={mergedRepos.length} score={score} />

        <div className="wt-grid wt-grid-4">
          <Metric label="repositories" value={mergedRepos.length} detail={enrolled + " enrolled"} variant="nord8" />
          <Metric label="committers" value={committers.length} detail="scored actors" variant="nord15" />
          <Metric label="health score" value={score} detail="average actor score" variant={score >= 85 ? "nord14" : score >= 65 ? "nord13" : "nord11"} />
          <Metric label="trajectory" value={(snapshot.events || []).length} detail="recent local events" variant="nord10" />
        </div>

        <div className="wt-grid wt-grid-main">
          <section {...attrs({ "box-": "double" })} className="wt-stack wt-mc-pane">
            <div className="wt-section-title">Enroll Repository</div>
            <label className="wt-stack">
              <span className="wt-label">repository url</span>
              <input value={form.repoUrl} onChange={(event) => setForm((current) => Object.assign({}, current, { repoUrl: event.target.value }))} placeholder="https://github.com/org/repo.git" />
            </label>
            <label className="wt-stack">
              <span className="wt-label">branch</span>
              <input value={form.branch} onChange={(event) => setForm((current) => Object.assign({}, current, { branch: event.target.value }))} placeholder="main" />
            </label>
            <label className="wt-stack">
              <span className="wt-label">operator note</span>
              <textarea value={form.note} onChange={(event) => setForm((current) => Object.assign({}, current, { note: event.target.value }))} placeholder="why this repo is being anchored" />
            </label>
            <div className="wt-command">{commandPreview}</div>
            <div className="wt-row">
              <button disabled={!form.repoUrl} onClick={enrollRepo}>stage enroll</button>
              <button {...attrs({ "variant-": "secondary" })} onClick={() => writeClipboard(mergedRepos.map(enrollmentCommand).join("\\n")).then(() => setStatus("copied enrollment commands"))}>copy commands</button>
            </div>
          </section>

          <section className="wt-stack wt-mc-pane" {...attrs({ "box-": "double" })}>
            <div className="wt-section-title">{active ? "Monitor Controls" : "Command Pane"}</div>
            <div className="wt-row">
              <button {...attrs({ "variant-": "secondary" })} onClick={exportState}>export</button>
              <button {...attrs({ "variant-": "secondary" })} onClick={() => importJson(setRepos, setStatus)}>import</button>
              <button {...attrs({ "variant-": "secondary" })} onClick={() => writeClipboard(JSON.stringify({ repositories: mergedRepos, committers }, null, 2)).then(() => setStatus("copied dashboard json"))}>copy json</button>
              <button {...attrs({ "variant-": "secondary" })} onClick={() => notify("Anchor status", quarantined ? "Quarantine active" : "All enrolled repositories nominal", true)}>test alert</button>
              <button {...attrs({ "variant-": "secondary" })} onClick={() => runSummarizer(mergedRepos, committers, setAiStatus)}>summarize</button>
            </div>
            <Callout tone={quarantined ? "danger" : "success"} title={status}>{aiStatus}</Callout>
            {active ? <HtopMeters score={score} repositories={mergedRepos} enrolled={enrolled} committers={committers} events={snapshot.events || []} /> : null}
            <section {...attrs({ "box-": "square" })} className="wt-stack" style={{ "--box-border-color": "var(--nord8)" }}>
              <div className="wt-section-title">Risk Heatmap</div>
              <Heatmap events={snapshot.events || []} />
              <div className="wt-muted">commit = green · drift = red · session/hook = blue · other = amber</div>
            </section>
          </section>
        </div>

        <SectionTabs panel={dashboardPanel} setPanel={setDashboardPanel} />

        <span {...attrs({ "is-": "separator" })} />

        {dashboardPanel === "overview" ? <ActorProcessList actors={committers} sortKey={actorSortKey} setSortKey={setActorSortKey} offscreenStrip={offscreenStrip} offscreenStatus={offscreenStatus} /> : null}
        {dashboardPanel === "nursery" ? <NurseryBaselinePanel actors={committers} /> : null}
        {dashboardPanel === "references" ? <ReferenceHealthQueue references={references} /> : null}
        {dashboardPanel === "corrections" ? <CorrectionWorkbench references={references} /> : null}

        <span {...attrs({ "is-": "separator" })} />

        <MetricLegend />

        <span {...attrs({ "is-": "separator" })} />

        <section className="wt-stack">
          <div className="wt-section-title">Repo Registration Cards</div>
          <RepoDriftCards repos={mergedRepos} committers={committers} repoCards={repoCards} />
        </section>

        <span {...attrs({ "is-": "separator" })} />

        <div className="wt-grid wt-grid-2">
          <section className="wt-stack">
            <div className="wt-section-title">Committer Scores</div>
            <CommitterWall committers={committers} />
            {committers.length ? (
              <BarChart
                categories={committers.slice(0, 10).map((actor) => actor.id.slice(0, 12))}
                series={[{ name: "Score", data: committers.slice(0, 10).map((actor) => actor.score), tone: "info" }]}
                height={180}
              />
            ) : null}
            <CommitterTable committers={committers} />
          </section>

          <section className="wt-stack">
            <div className="wt-section-title">Repositories</div>
            <RepoTable repos={mergedRepos} />
          </section>
        </div>

        <span {...attrs({ "is-": "separator" })} />

        <section className="wt-stack">
          <div className="wt-section-title">Recent Trajectory</div>
          <div className="wt-scroll">
            <table>
              <thead><tr><th>Time</th><th>Type</th><th>Actor</th><th>Details</th></tr></thead>
              <tbody>
                {(snapshot.events || []).slice(-14).reverse().map((event, index) => (
                  <tr key={index}>
                    <td>{event.ts.replace("T", " ").replace("Z", " UTC")}</td>
                    <td><Badge variant={event.type === "drift-flag" ? "danger" : event.type === "commit" ? "success" : "info"}>{event.type}</Badge></td>
                    <td>{event.actor}</td>
                    <td>{event.data || "no details"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Stack>
    </div>
  );
}
`;
}

function safeJson(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
