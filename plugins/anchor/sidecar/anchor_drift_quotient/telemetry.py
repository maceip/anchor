"""Telemetry normalization for the Drift Quotient sidecar."""

from __future__ import annotations

from typing import Any

from .protocols import GitArtifactTelemetry


def normalize(payload: dict[str, Any] | None) -> GitArtifactTelemetry:
    payload = payload or {}
    return GitArtifactTelemetry(
        commit_hash=str(payload.get("commit_hash") or payload.get("commitHash") or payload.get("commit_sha") or ""),
        diff_payload=str(payload.get("diff_payload") or payload.get("diffPayload") or payload.get("diff") or ""),
        commit_message=str(payload.get("commit_message") or payload.get("commitMessage") or ""),
        ci_build_status=str(payload.get("ci_build_status") or payload.get("ciBuildStatus") or "SUCCESS").upper(),
        test_bytes_changed=int(payload.get("test_bytes_changed") or payload.get("testBytesChanged") or 0),
        src_bytes_changed=int(payload.get("src_bytes_changed") or payload.get("srcBytesChanged") or 0),
        lines_of_code_changed=int(payload.get("lines_of_code_changed") or payload.get("linesOfCodeChanged") or 0),
        new_imports=tuple(str(item) for item in payload.get("new_imports", payload.get("newImports", ())) or ()),
        ci_log_payload=str(payload.get("ci_log_payload") or payload.get("ciLogPayload") or ""),
    )
