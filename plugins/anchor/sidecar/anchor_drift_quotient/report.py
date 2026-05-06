"""Report normalization for Anchor DriftReport consumers."""

from __future__ import annotations

from .protocols import DriftReport, MetricAlarm, PipelinePhase

ALL_METRICS = ("SDI", "AHR", "TMCR", "CCDC", "CFS", "FI")


def normalize_metrics(metrics: dict[str, float]) -> dict[str, float]:
    return {metric: round(float(metrics.get(metric, 0.0)), 6) for metric in ALL_METRICS}


def severity_for(phase: PipelinePhase, alarms: tuple[MetricAlarm, ...], metrics: dict[str, float]) -> str:
    if phase is PipelinePhase.QUARANTINE:
        return "quarantine"
    if any(alarm.metric in {"AHR", "FI"} for alarm in alarms):
        return "quarantine"
    max_metric = max(metrics.values(), default=0.0)
    if max_metric >= 0.8:
        return "high"
    if max_metric >= 0.5 or alarms:
        return "medium"
    if max_metric > 0:
        return "low"
    return "none"


def message_for(severity: str, decision: str, alarms: tuple[MetricAlarm, ...]) -> str:
    if severity == "none":
        return "No statistical drift detected."
    if severity == "quarantine":
        reasons = "; ".join(alarm.reason for alarm in alarms) or decision
        return f"Anchor sidecar triggered quarantine: {reasons}"
    return f"Anchor sidecar recorded {severity} drift: {decision}"


def build_report(
    *,
    phase: PipelinePhase,
    decision: str,
    metrics: dict[str, float],
    alarms: tuple[MetricAlarm, ...] = (),
) -> DriftReport:
    normalized = normalize_metrics(metrics)
    severity = severity_for(phase, alarms, normalized)
    return DriftReport(
        severity=severity,
        phase=phase.name,
        decision=decision,
        metrics=normalized,
        alarms=alarms,
        message=message_for(severity, decision, alarms),
    )
