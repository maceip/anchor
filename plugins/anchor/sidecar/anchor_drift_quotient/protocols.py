"""Domain protocols and immutable data shapes for the Drift Quotient sidecar."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any, Protocol, Sequence

Vector = Sequence[float]


class PipelinePhase(Enum):
    NURSERY = auto()
    MONITORING = auto()
    QUARANTINE = auto()


@dataclass(frozen=True)
class GitArtifactTelemetry:
    commit_hash: str
    diff_payload: str
    commit_message: str
    ci_build_status: str
    test_bytes_changed: int
    src_bytes_changed: int
    lines_of_code_changed: int
    new_imports: tuple[str, ...] = ()
    ci_log_payload: str = ""
    # Per-actor deception & drift signals (populated from trajectory / tool logs)
    actor_id: str = "unknown"
    unreported_failures: int = 0
    total_failures: int = 0
    fabricated_files: int = 0
    total_downloads: int = 0
    unauthorized_switches: int = 0
    total_reads: int = 0
    hallucinated_answers: int = 0
    downstream_tasks: int = 0
    constraint_violations: int = 0
    total_steps: int = 0
    reference_urls: int = 0
    non_resolving_reference_urls: int = 0
    stale_reference_urls: int = 0
    hallucinated_reference_urls: int = 0
    # Production AHR from JS side (urlhealth style)
    ahr: float = 0.0
    ahr_breakdown: dict = field(default_factory=dict)


class EvaluatorLLM(Protocol):
    def extract_intent_vector(self, commit_msg: str, diff: str) -> Vector: ...
    def check_prerequisite_alignment(self, diff: str, north_star_doc: str) -> float: ...


class RepoStateAnalyzer(Protocol):
    def calculate_total_complexity(self) -> int: ...
    def calculate_ast_clone_density(self) -> float: ...
    def get_previous_state(self) -> "RepoStateAnalyzer": ...


class PackageRegistry(Protocol):
    def exists(self, package_name: str) -> bool: ...


@dataclass(frozen=True)
class MetricAlarm:
    metric: str
    reason: str

    def to_dict(self) -> dict[str, str]:
        return {"metric": self.metric, "reason": self.reason}


@dataclass(frozen=True)
class DriftReport:
    severity: str
    phase: str
    decision: str
    metrics: dict[str, float]
    alarms: tuple[MetricAlarm, ...] = ()
    message: str = ""
    ahr_breakdown: dict = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "phase": self.phase,
            "decision": self.decision,
            "metrics": self.metrics,
            "alarms": [alarm.to_dict() for alarm in self.alarms],
            "message": self.message,
        }


@dataclass
class PipelineSnapshot:
    phase: str = "NURSERY"
    commit_count: int = 0
    stable_commits_streak: int = 0
    recent_ci_failures: int = 0
    nursery_history: dict[str, list[float]] = field(default_factory=dict)
    baselines: dict[str, dict[str, float]] = field(default_factory=dict)
    project_vector_centroid: list[float] | None = None
    cumulative_sums: dict[str, float] = field(default_factory=dict)
    last_decision: dict[str, Any] | None = None
