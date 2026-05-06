"""Master Drift Quotient sidecar pipeline."""

from __future__ import annotations

from typing import Any

from .cusum import CUSUMTracker
from .heuristics import (
    HashingEvaluatorLLM,
    SidecarDriftEngine,
    SimpleRepoStateAnalyzer,
    StaticPackageRegistry,
    calculate_baselines,
    flail_index,
    update_centroid,
)
from .protocols import (
    DriftReport,
    GitArtifactTelemetry,
    MetricAlarm,
    PipelinePhase,
    PipelineSnapshot,
    RepoStateAnalyzer,
    Vector,
)
from .report import build_report
from .telemetry import normalize

METRICS = ("SDI", "AHR", "TMCR", "CCDC", "CFS")


class AutonomousDriftPipeline:
    def __init__(
        self,
        engine: SidecarDriftEngine,
        nursery_size: int = 30,
        stability_threshold: int = 50,
        snapshot: PipelineSnapshot | None = None,
    ) -> None:
        self.engine = engine
        self.nursery_size = nursery_size
        self.stability_threshold = stability_threshold
        snapshot = snapshot or PipelineSnapshot()

        self.phase = PipelinePhase[snapshot.phase]
        self.commit_count = snapshot.commit_count
        self.stable_commits_streak = snapshot.stable_commits_streak
        self.recent_ci_failures = snapshot.recent_ci_failures
        self.nursery_history = {metric: list(snapshot.nursery_history.get(metric, [])) for metric in METRICS}
        self.baselines = dict(snapshot.baselines)
        self.project_vector_centroid = snapshot.project_vector_centroid
        self.last_report: DriftReport | None = None
        self.last_alarms: tuple[MetricAlarm, ...] = ()

        self.trackers = {
            "SDI": CUSUMTracker("SDI", drift_tolerance_std_devs=1.0, alarm_threshold=3.0),
            "AHR": CUSUMTracker("AHR", drift_tolerance_std_devs=0.1, alarm_threshold=0.5),
            "TMCR": CUSUMTracker("TMCR", drift_tolerance_std_devs=2.0, alarm_threshold=4.0),
            "CCDC": CUSUMTracker("CCDC", drift_tolerance_std_devs=2.5, alarm_threshold=5.0),
            "CFS": CUSUMTracker("CFS", drift_tolerance_std_devs=2.0, alarm_threshold=4.0),
        }
        for metric, value in snapshot.cumulative_sums.items():
            if metric in self.trackers:
                self.trackers[metric].cumulative_sum = float(value)

    def process_commit(
        self,
        telemetry: GitArtifactTelemetry,
        current_repo_state: RepoStateAnalyzer,
    ) -> str:
        return self.process_commit_report(telemetry, current_repo_state).decision

    def process_commit_report(
        self,
        telemetry: GitArtifactTelemetry,
        current_repo_state: RepoStateAnalyzer,
    ) -> DriftReport:
        if self.phase is PipelinePhase.QUARANTINE:
            report = build_report(
                phase=self.phase,
                decision="REJECTED_QUARANTINE_LOCK",
                metrics={"FI": flail_index(self.recent_ci_failures)},
                alarms=self.last_alarms,
            )
            self.last_report = report
            return report

        self.commit_count += 1

        if telemetry.ci_build_status == "FAILURE":
            self.recent_ci_failures += 1
            if self.recent_ci_failures >= 3:
                alarm = MetricAlarm("FI", "3 sequential CI failures")
                report = self._trigger_quarantine(telemetry.commit_hash, (alarm,), {"FI": 1.0})
                self.last_report = report
                return report
        else:
            self.recent_ci_failures = 0

        current_intent = self.engine.llm.extract_intent_vector(
            telemetry.commit_message,
            telemetry.diff_payload,
        )
        baseline_vector = self.project_vector_centroid or list(current_intent)
        metrics = self.engine.compute(telemetry, current_repo_state, baseline_vector)
        metrics["FI"] = flail_index(self.recent_ci_failures)

        if self.phase is PipelinePhase.NURSERY:
            report = self._execute_nursery(metrics, current_intent, telemetry)
        else:
            report = self._execute_monitoring(metrics, telemetry)
        self.last_report = report
        return report

    def _execute_nursery(
        self,
        metrics: dict[str, float],
        current_intent: Vector,
        telemetry: GitArtifactTelemetry,
    ) -> DriftReport:
        if metrics.get("AHR", 0.0) > 0:
            alarm = MetricAlarm("AHR", "Hallucination in Nursery")
            return self._trigger_quarantine(telemetry.commit_hash, (alarm,), metrics)

        for metric in METRICS:
            self.nursery_history.setdefault(metric, []).append(float(metrics.get(metric, 0.0)))
        self.project_vector_centroid = update_centroid(
            self.project_vector_centroid,
            current_intent,
            len(self.nursery_history["SDI"]),
        )

        if len(self.nursery_history["SDI"]) >= self.nursery_size:
            self.baselines = calculate_baselines(self.nursery_history)
            self.phase = PipelinePhase.MONITORING
            decision = "NURSERY_GRADUATED"
        else:
            decision = "NURSERY_RECORDED"
        return build_report(phase=self.phase, decision=decision, metrics=metrics)

    def _execute_monitoring(
        self,
        metrics: dict[str, float],
        telemetry: GitArtifactTelemetry,
    ) -> DriftReport:
        alarms: list[MetricAlarm] = []
        for metric in METRICS:
            baseline = self.baselines.get(metric, {"mean": 0.0, "std_dev": 0.001})
            if self.trackers[metric].update_and_check(
                float(metrics.get(metric, 0.0)),
                float(baseline.get("mean", 0.0)),
                float(baseline.get("std_dev", 0.001)),
            ):
                alarms.append(MetricAlarm(metric, f"{metric} exceeded CUSUM threshold"))

        if alarms:
            return self._trigger_quarantine(telemetry.commit_hash, tuple(alarms), metrics)

        if all(tracker.cumulative_sum == 0 for tracker in self.trackers.values()):
            self.stable_commits_streak += 1
        else:
            self.stable_commits_streak = 0

        if self.stable_commits_streak >= self.stability_threshold:
            self._initiate_re_nursery()
            return build_report(phase=self.phase, decision="RE_NURSERY_INITIATED", metrics=metrics)

        return build_report(phase=self.phase, decision="MONITORING_VERIFIED", metrics=metrics)

    def _initiate_re_nursery(self) -> None:
        self.phase = PipelinePhase.NURSERY
        self.baselines = {}
        self.nursery_history = {metric: [] for metric in METRICS}
        self.stable_commits_streak = 0
        for tracker in self.trackers.values():
            tracker.reset()

    def _trigger_quarantine(
        self,
        commit_hash: str,
        alarms: tuple[MetricAlarm, ...],
        metrics: dict[str, float],
    ) -> DriftReport:
        self.phase = PipelinePhase.QUARANTINE
        self.last_alarms = alarms
        return build_report(
            phase=self.phase,
            decision="QUARANTINE_TRIGGERED",
            metrics=metrics,
            alarms=alarms,
        )

    def snapshot(self) -> PipelineSnapshot:
        return PipelineSnapshot(
            phase=self.phase.name,
            commit_count=self.commit_count,
            stable_commits_streak=self.stable_commits_streak,
            recent_ci_failures=self.recent_ci_failures,
            nursery_history={metric: list(values) for metric, values in self.nursery_history.items()},
            baselines=dict(self.baselines),
            project_vector_centroid=list(self.project_vector_centroid) if self.project_vector_centroid is not None else None,
            cumulative_sums={metric: tracker.cumulative_sum for metric, tracker in self.trackers.items()},
            last_decision=self.last_report.to_dict() if self.last_report else None,
        )


def evaluate(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    telemetry = normalize(payload.get("telemetry") or payload)
    north_star_doc = str(payload.get("north_star_doc") or payload.get("northStarDoc") or "")
    state = payload.get("state") or {}
    repo_payload = payload.get("repo") or {}
    registry = StaticPackageRegistry(frozenset(payload.get("known_packages") or payload.get("knownPackages") or ()))
    engine = SidecarDriftEngine(registry, HashingEvaluatorLLM(), north_star_doc)
    pipeline = AutonomousDriftPipeline(
        engine,
        nursery_size=int(payload.get("nursery_size") or payload.get("nurserySize") or 30),
        stability_threshold=int(payload.get("stability_threshold") or payload.get("stabilityThreshold") or 50),
        snapshot=snapshot_from_dict(state),
    )
    repo = SimpleRepoStateAnalyzer(
        complexity=int(repo_payload.get("complexity") or 0),
        clone_density=float(repo_payload.get("clone_density") or repo_payload.get("cloneDensity") or 0.0),
        previous_complexity=int(repo_payload.get("previous_complexity") or repo_payload.get("previousComplexity") or 0),
        previous_clone_density=float(repo_payload.get("previous_clone_density") or repo_payload.get("previousCloneDensity") or 0.0),
    )
    report = pipeline.process_commit_report(telemetry, repo)
    return {
        "report": report.to_dict(),
        "state": snapshot_to_dict(pipeline.snapshot()),
    }


def snapshot_from_dict(data: dict[str, Any]) -> PipelineSnapshot:
    return PipelineSnapshot(
        phase=str(data.get("phase") or "NURSERY"),
        commit_count=int(data.get("commitCount") or data.get("commit_count") or 0),
        stable_commits_streak=int(data.get("stableCommitsStreak") or data.get("stable_commits_streak") or 0),
        recent_ci_failures=int(data.get("recentCiFailures") or data.get("recent_ci_failures") or 0),
        nursery_history=dict(data.get("nurseryHistory") or data.get("nursery_history") or {}),
        baselines=dict(data.get("baselines") or {}),
        project_vector_centroid=data.get("projectVectorCentroid") or data.get("project_vector_centroid"),
        cumulative_sums=dict(data.get("cumulativeSums") or data.get("cumulative_sums") or {}),
        last_decision=data.get("lastDecision") or data.get("last_decision"),
    )


def snapshot_to_dict(snapshot: PipelineSnapshot) -> dict[str, Any]:
    return {
        "phase": snapshot.phase,
        "commitCount": snapshot.commit_count,
        "stableCommitsStreak": snapshot.stable_commits_streak,
        "recentCiFailures": snapshot.recent_ci_failures,
        "nurseryHistory": snapshot.nursery_history,
        "baselines": snapshot.baselines,
        "projectVectorCentroid": snapshot.project_vector_centroid,
        "cumulativeSums": snapshot.cumulative_sums,
        "lastDecision": snapshot.last_decision,
        "quarantine": snapshot.phase == "QUARANTINE",
    }
