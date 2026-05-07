import {
  BarChart,
  Callout,
  Grid,
  Row,
  Stack,
  useCanvasState
} from "cursor/canvas";

const snapshot = useCanvasState("cursor/canvas");

const webtuiCss = `
:root { --nord0:#2e3440; --nord1:#3b4252; --nord2:#434c5e; --nord3:#4c566a; --nord4:#d8dee9; --nord5:#e5e9f0; --nord6:#eceff4; --nord7:#8fbcbb; --nord8:#88c0d0; --nord9:#81a1c1; --nord10:#5e81ac; --nord11:#bf616a; --nord12:#d08770; --nord13:#ebcb8b; --nord14:#a3be8c; --nord15:#b48ead; }
body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background: var(--nord0); color: var(--nord4); }
`;

export default function AnchorDashboard() {
  const metrics = snapshot.sidecarMetrics || {};
  const ahr = metrics.AHR ?? metrics.ahr ?? 0;
  const breakdown = snapshot.ahr_breakdown || snapshot.sidecarDecision?.ahr_breakdown || {};
  const phase = snapshot.sidecarPhase || "NURSERY";
  const quarantined = snapshot.quarantine === true;

  const metricKeys = ["NFR", "FFR", "DFR", "HFR", "IDR", "SDI", "AHR", "RHR"];

  return (
    <>
      <style>{webtuiCss}</style>

      <Stack gap={16} style={{ padding: 16, maxWidth: 1100 }}>
        {/* Header */}
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--nord8)" }}>
            Anchor
          </div>
          <div style={{ 
            padding: "4px 14px", 
            background: quarantined ? "#3a1f1f" : "var(--nord2)", 
            border: `1px solid ${quarantined ? "var(--nord11)" : "var(--nord3)"}`,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600
          }}>
            {quarantined ? "QUARANTINE" : phase}
          </div>
        </Row>

        {/* AHR Breakdown - Production */}
        {breakdown.hallucinated || breakdown.stale ? (
          <div style={{ 
            background: "var(--nord1)", 
            border: `2px solid ${ahr >= 0.6 ? "var(--nord11)" : "var(--nord8)"}`, 
            borderRadius: 12, 
            padding: 16 
          }}>
            <Row style={{ justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>AHR — API Hallucination Rate</div>
              <div style={{ 
                fontSize: 22, 
                fontWeight: 800, 
                color: ahr >= 0.6 ? "var(--nord11)" : ahr > 0 ? "var(--nord13)" : "var(--nord14)" 
              }}>
                {(ahr * 100).toFixed(1)}%
              </div>
            </Row>

            <Grid columns={3} gap={12}>
              <div style={{ background: "#3a1f1f", padding: 12, borderRadius: 8, borderLeft: "4px solid var(--nord11)" }}>
                <div style={{ fontSize: 11, color: "#ff9e9e", marginBottom: 4 }}>HALLUCINATED</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--nord11)" }}>
                  {breakdown.hallucinated?.length || 0}
                </div>
                <div style={{ fontSize: 11, color: "#ff9e9e" }}>Fabricated — never existed</div>
              </div>

              <div style={{ background: "#3a2f1f", padding: 12, borderRadius: 8, borderLeft: "4px solid var(--nord13)" }}>
                <div style={{ fontSize: 11, color: "#f4d35e", marginBottom: 4 }}>STALE</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--nord13)" }}>
                  {breakdown.stale?.length || 0}
                </div>
                <div style={{ fontSize: 11, color: "#f4d35e" }}>Link rot — existed in Wayback</div>
              </div>

              <div style={{ background: "#1f3a2f", padding: 12, borderRadius: 8, borderLeft: "4px solid var(--nord14)" }}>
                <div style={{ fontSize: 11, color: "#86efac", marginBottom: 4 }}>VERIFIED CLEAN</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--nord14)" }}>
                  {breakdown.verified_clean || 0}
                </div>
                <div style={{ fontSize: 11, color: "#86efac" }}>Live + resolvable</div>
              </div>
            </Grid>

            {quarantined && breakdown.hallucinated?.length > 0 && (
              <div style={{ marginTop: 14, padding: 12, background: "#2a1f1f", borderRadius: 8, fontSize: 13 }}>
                <strong>Action:</strong> Run <code>urlhealth</code> on the hallucinated imports, then submit a clean diff. 
                Sidecar will stay in quarantine until AHR returns to 0.
              </div>
            )}
          </div>
        ) : null}

        {/* All Metrics */}
        <div style={{ background: "var(--nord1)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>Drift Quotient Metrics</div>
          <Grid columns={4} gap={8}>
            {metricKeys.map(key => {
              const val = metrics[key] ?? 0;
              const pct = Math.round(val * 100);
              const color = val >= 0.6 ? "var(--nord11)" : val > 0.3 ? "var(--nord13)" : "var(--nord14)";
              return (
                <div key={key} style={{ background: "var(--nord0)", padding: 10, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--nord4)" }}>{key}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</div>
                </div>
              );
            })}
          </Grid>
        </div>

        {/* Status Footer */}
        <Row style={{ fontSize: 12, color: "var(--nord3)", justifyContent: "space-between" }}>
          <div>Actor: {snapshot.actor_id || "unknown"}</div>
          <div>Sidecar: {phase}</div>
          <div>Quarantine: {quarantined ? "ACTIVE" : "clear"}</div>
        </Row>

        {quarantined && (
          <Callout type="error">
            Anchor has quarantined this trajectory. Resolve the flagged signals (especially AHR) before continuing.
          </Callout>
        )}
      </Stack>
    </>
  );
}
