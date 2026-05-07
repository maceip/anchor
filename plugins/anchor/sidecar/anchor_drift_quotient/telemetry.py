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
        actor_id=str(payload.get("actor_id") or payload.get("actorId") or payload.get("committer") or "unknown"),
        unreported_failures=int(payload.get("unreported_failures") or payload.get("unreportedFailures") or 0),
        total_failures=int(payload.get("total_failures") or payload.get("totalFailures") or 0),
        fabricated_files=int(payload.get("fabricated_files") or payload.get("fabricatedFiles") or 0),
        total_downloads=int(payload.get("total_downloads") or payload.get("totalDownloads") or 0),
        unauthorized_switches=int(payload.get("unauthorized_switches") or payload.get("unauthorizedSwitches") or 0),
        total_reads=int(payload.get("total_reads") or payload.get("totalReads") or 0),
        hallucinated_answers=int(payload.get("hallucinated_answers") or payload.get("hallucinatedAnswers") or 0),
        downstream_tasks=int(payload.get("downstream_tasks") or payload.get("downstreamTasks") or 0),
        constraint_violations=int(payload.get("constraint_violations") or payload.get("constraintViolations") or 0),
        total_steps=int(payload.get("total_steps") or payload.get("totalSteps") or 0),
        reference_urls=int(payload.get("reference_urls") or payload.get("referenceUrls") or 0),
        non_resolving_reference_urls=int(payload.get("non_resolving_reference_urls") or payload.get("nonResolvingReferenceUrls") or 0),
        stale_reference_urls=int(payload.get("stale_reference_urls") or payload.get("staleReferenceUrls") or 0),
        hallucinated_reference_urls=int(payload.get("hallucinated_reference_urls") or payload.get("hallucinatedReferenceUrls") or 0),
        ahr=float(payload.get("ahr") or payload.get("AHR") or 0.0),
        ahr_breakdown=payload.get("ahr_breakdown") or payload.get("ahrBreakdown") or {},
    )
