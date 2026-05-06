"""Shared sidecar data shapes."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

Phase = Literal["NURSERY", "MONITORING", "QUARANTINE"]


@dataclass(frozen=True)
class Telemetry:
    commit_sha: str | None = None
    files: tuple[str, ...] = ()
    ci_failures: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class SidecarReport:
    phase: Phase
    quarantine: bool
    metrics: dict[str, float]
    signals: tuple[dict[str, Any], ...]
    recommended_action: str
