import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildAnchorDashboardModel,
  canvasWorkspaceId,
  renderAnchorDashboardCanvas,
  writeAnchorDashboard
} from "./canvas-dashboard.mjs";

test("canvasWorkspaceId matches Cursor project directory convention", () => {
  assert.equal(canvasWorkspaceId("/Users/mac/cursor-anchor"), "Users-mac-cursor-anchor");
});

test("renderAnchorDashboardCanvas follows native canvas constraints and uses WebTUI adapter", () => {
  const source = renderAnchorDashboardCanvas(sampleModel());
  assert.match(source, /from "cursor\/canvas"/);
  assert.doesNotMatch(source, new RegExp('from "\\\\.\\\\/'));
  assert.doesNotMatch(source, /function\s+s[a-z]{3}\(/);
  assert.match(source, /webtuiCss/);
  assert.match(source, /WebTUI Canvas adapter/);
  assert.match(source, /Repository Enrollment/);
  assert.match(source, /Committer Scores/);
  assert.match(source, /Risk Heatmap/);
  assert.match(source, /Nursery Map/);
  assert.match(source, /Repo Registration Cards/);
  assert.match(source, /function SectionTabs/);
  assert.match(source, /function RepoDriftCard/);
  assert.match(source, /function ReferenceHealthQueue/);
  assert.match(source, /function ActorProcessList/);
  assert.match(source, /function NurseryBaselinePanel/);
  assert.match(source, /function CorrectionWorkbench/);
  assert.match(source, /function MetricLegend/);
  assert.match(source, /function GaugeViz/);
  assert.match(source, /function LiquidViz/);
  assert.match(source, /function MetricBarStrip/);
  assert.match(source, /new OffscreenCanvas/);
  assert.match(source, /anchor\.offscreenStatus/);
  assert.match(source, /LineChart/);
  assert.match(source, /wt-chart-panel/);
  assert.match(source, /wt-metric-bar/);
  assert.match(source, /driftMetricKeys = \["NFR"/);
  assert.match(source, /"RHR"/);
  assert.match(source, /DQ/);
  assert.match(source, /localStorageKey/);
  assert.match(source, /buildRepoCardsInWorker/);
  assert.match(source, /new Worker/);
});

test("writeAnchorDashboard writes to the Cursor canvases directory", async () => {
  const projectsHome = await mkdtemp(path.join(os.tmpdir(), "anchor-canvas-projects-"));
  const result = await writeAnchorDashboard(sampleModel(), {
    cwd: "/tmp/example/repo",
    env: { ...process.env, CURSOR_PROJECTS_HOME: projectsHome }
  });

  assert.equal(
    result.filePath,
    path.join(projectsHome, "tmp-example-repo", "canvases", "anchor-dashboard.canvas.tsx")
  );
  const source = await readFile(result.filePath, "utf8");
  assert.match(source, /Ada Anchor/);
  assert.match(source, /WebTUI/);
});

test("buildAnchorDashboardModel discovers repositories and scores committers", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "anchor-home-dashboard-"));
  const env = { ...process.env, ANCHOR_HOME: home };
  const slug = "example__alpha";
  const repoDir = path.join(home, slug);
  await import("node:fs/promises").then(({ mkdir }) => mkdir(repoDir, { recursive: true }));
  await writeFile(
    path.join(repoDir, "state.json"),
    JSON.stringify({
      slug,
      repoUrl: "https://github.com/example/alpha.git",
      optedIn: true,
      branch: "main",
      sidecar: { phase: "MONITORING", quarantine: false, lastDecision: { decision: "allow", metrics: {} } }
    })
  );
  await writeFile(
    path.join(repoDir, "trajectory.jsonl"),
    [
      JSON.stringify({ ts: "2026-05-06T00:00:00Z", type: "commit", data: { actor_id: "Ada Anchor", sha: "a", subject: "feat: one" } }),
      JSON.stringify({ ts: "2026-05-06T00:00:30Z", type: "drift-flag", data: { report: { actor_id: "Ada Anchor", phase: "NURSERY", decision: "NURSERY_RECORDED", severity: "low", metrics: { NFR: 0.2, FFR: 0.1, DFR: 0, HFR: 0, IDR: 0, RHR: 0.4, SDI: 0, AHR: 0 } } } }),
      JSON.stringify({ ts: "2026-05-06T00:01:00Z", type: "commit", data: { actor_id: "Grace Hopper", sha: "b", subject: "fix: two" } }),
      JSON.stringify({ ts: "2026-05-06T00:01:30Z", type: "drift-flag", data: { report: { actor_id: "Grace Hopper", phase: "NURSERY", decision: "NURSERY_RECORDED", severity: "medium", metrics: { NFR: 0, FFR: 0, DFR: 0.5, HFR: 0, IDR: 0, SDI: 0, AHR: 0 } } } }),
      ""
    ].join("\n")
  );

  const model = await buildAnchorDashboardModel(slug, { cwd: "/tmp/alpha", env });
  assert.equal(model.repositories.length, 1);
  assert.deepEqual(model.committers.map((actor) => actor.id).sort(), ["Ada Anchor", "Grace Hopper"]);
  const ada = model.committers.find((actor) => actor.id === "Ada Anchor");
  assert.equal(ada.metrics.NFR, 0.2);
  assert.equal(ada.metrics.RHR, 0.4);
  assert.equal(ada.score, 60);
  assert.equal(ada.phase, "NURSERY");
});

function sampleModel() {
  return {
    generatedAt: "2026-05-06T12:00:00Z",
    cwd: "/Users/mac/cursor-anchor",
    slug: "maceip__cursor-anchor",
    optedIn: true,
    branch: "main",
    planPhase: "Phase 4",
    sidecarPhase: "MONITORING",
    quarantine: false,
    repositories: [
      {
        slug: "maceip__cursor-anchor",
        repoUrl: "https://github.com/maceip/cursor-anchor.git",
        branch: "main",
        optedIn: true,
        planPhase: "Phase 4",
        sidecarPhase: "MONITORING",
        sidecarMetrics: { NFR: 0.2, FFR: 0, DFR: 0.5, HFR: 0.1, IDR: 0.8, RHR: 0.25, SDI: 0, AHR: 0.35 },
        quarantine: false,
        eventCount: 2
      }
    ],
    committers: [
      {
        id: "Ada Anchor",
        score: 100,
        status: "nominal",
        phase: "NURSERY",
        nurserySamples: 1,
        nurseryRemaining: 29,
        metrics: { NFR: 0.2, FFR: 0, DFR: 0.5, HFR: 0.1, IDR: 0.8, RHR: 0.25, SDI: 0, AHR: 0.35 },
        maxMetrics: { NFR: 0.2, FFR: 0, DFR: 0.5, HFR: 0.1, IDR: 0.8, RHR: 0.25, SDI: 0, AHR: 0.35 },
        baselines: { NFR: 0.2, FFR: 0, DFR: 0.5, HFR: 0.1, IDR: 0.8, RHR: 0.25, SDI: 0, AHR: 0.35 },
        latestDecision: "NURSERY_RECORDED",
        latestSeverity: "high",
        commits: 2,
        events: 2,
        driftFlags: 0,
        quarantines: 0,
        ratHoles: 0,
        maxRisk: 0,
        repositories: ["maceip__cursor-anchor"],
        lastSeen: "2026-05-06T12:00:00Z"
      }
    ],
    events: [
      {
        ts: "2026-05-06T12:00:00Z",
        type: "reference-check",
        actor: "Ada Anchor",
        data: "checked URL",
        references: [
          {
            url: "https://example.invalid/missing",
            status: "LIKELY_HALLUCINATED",
            actor: "Ada Anchor",
            sourceEvent: "reference-check",
            correctionStatus: "open",
            replacementUrl: "",
            waybackStatus: "missing"
          }
        ]
      }
    ]
  };
}
