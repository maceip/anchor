"""Phase 2 placeholder heuristics for sidecar smoke tests."""

from __future__ import annotations

from .protocols import Telemetry


def flail_index(telemetry: Telemetry) -> float:
    return min(1.0, max(0.0, telemetry.ci_failures / 5))


def infra_ratio(telemetry: Telemetry) -> float:
    if not telemetry.files:
        return 0.0
    infra = sum(1 for file in telemetry.files if _is_infra(file))
    return infra / len(telemetry.files)


def _is_infra(file: str) -> bool:
    lowered = file.lower()
    return (
        lowered.startswith(".github/")
        or lowered.startswith("infra/")
        or lowered.startswith("deploy/")
        or lowered.endswith((".yml", ".yaml", ".tf", ".sh"))
    )
