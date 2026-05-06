"""Telemetry normalization for the Drift Quotient sidecar."""

from __future__ import annotations

from typing import Any

from .protocols import Telemetry


def normalize(payload: dict[str, Any] | None) -> Telemetry:
    payload = payload or {}
    files = payload.get("files") or ()
    return Telemetry(
        commit_sha=payload.get("commit_sha") or payload.get("commitSha"),
        files=tuple(str(file) for file in files),
        ci_failures=int(payload.get("ci_failures") or payload.get("ciFailures") or 0),
        metadata=dict(payload.get("metadata") or {}),
    )
