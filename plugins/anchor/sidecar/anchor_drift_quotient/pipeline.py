"""Minimal Drift Quotient sidecar pipeline.

This module intentionally stays conservative in Phase 2. It accepts telemetry
and returns a stable report shape consumed by the Node bridge. Phase 3 replaces
the placeholder metrics with CUSUM and the full Drift Quotient model.
"""

from __future__ import annotations

from typing import Any

from .heuristics import flail_index, infra_ratio
from .protocols import SidecarReport
from .telemetry import normalize


def evaluate(payload: dict[str, Any] | None = None) -> SidecarReport:
    telemetry = normalize(payload)
    metrics = {
        "FI": flail_index(telemetry),
        "infraRatio": infra_ratio(telemetry),
    }
    quarantine = metrics["FI"] >= 1.0
    return SidecarReport(
        phase="QUARANTINE" if quarantine else "NURSERY",
        quarantine=quarantine,
        metrics=metrics,
        signals=(),
        recommended_action="quarantine" if quarantine else "monitor",
    )
