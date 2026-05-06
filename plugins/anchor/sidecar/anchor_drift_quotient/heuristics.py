"""Drift Quotient metric computation."""

from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from statistics import mean, pstdev
from typing import Iterable

from .protocols import (
    EvaluatorLLM,
    GitArtifactTelemetry,
    PackageRegistry,
    RepoStateAnalyzer,
    Vector,
)

MODULE_ERROR_RE = re.compile(r"\b(ModuleNotFoundError|Cannot find module|ERR_MODULE_NOT_FOUND)\b", re.I)


class HashingEvaluatorLLM:
    """Deterministic local evaluator used until a real local LLM is configured."""

    def extract_intent_vector(self, commit_msg: str, diff: str) -> Vector:
        text = f"{commit_msg}\n{diff}".lower()
        buckets = [0.0] * 32
        for token in re.findall(r"[a-z0-9_./-]{3,}", text):
            digest = hashlib.blake2b(token.encode("utf8"), digest_size=2).digest()
            buckets[int.from_bytes(digest, "big") % len(buckets)] += 1.0
        magnitude = math.sqrt(sum(value * value for value in buckets)) or 1.0
        return [value / magnitude for value in buckets]

    def check_prerequisite_alignment(self, diff: str, north_star_doc: str) -> float:
        diff_terms = set(re.findall(r"[a-z0-9_-]{4,}", diff.lower()))
        plan_terms = set(re.findall(r"[a-z0-9_-]{4,}", north_star_doc.lower()))
        if not diff_terms or not plan_terms:
            return 0.0
        expansion_terms = diff_terms - plan_terms
        suspicious = {
            term
            for term in expansion_terms
            if term in {"payment", "billing", "auth", "oauth", "dashboard", "migration", "terraform", "kubernetes"}
        }
        return min(0.5, len(suspicious) * 0.1)


@dataclass(frozen=True)
class StaticPackageRegistry:
    known_packages: frozenset[str] = frozenset()

    def exists(self, package_name: str) -> bool:
        base = normalize_package_name(package_name)
        if not base:
            return True
        if base.startswith((".", "#")):
            return True
        if base in self.known_packages:
            return True
        return base in _BUILTIN_PACKAGES


@dataclass(frozen=True)
class SimpleRepoStateAnalyzer:
    complexity: int = 0
    clone_density: float = 0.0
    previous_complexity: int = 0
    previous_clone_density: float = 0.0

    def calculate_total_complexity(self) -> int:
        return self.complexity

    def calculate_ast_clone_density(self) -> float:
        return self.clone_density

    def get_previous_state(self) -> "SimpleRepoStateAnalyzer":
        return SimpleRepoStateAnalyzer(
            complexity=self.previous_complexity,
            clone_density=self.previous_clone_density,
            previous_complexity=self.previous_complexity,
            previous_clone_density=self.previous_clone_density,
        )


class SidecarDriftEngine:
    def __init__(self, registry: PackageRegistry, llm: EvaluatorLLM, north_star_doc: str) -> None:
        self.registry = registry
        self.llm = llm
        self.north_star_doc = north_star_doc

    def compute(
        self,
        telemetry: GitArtifactTelemetry,
        repo: RepoStateAnalyzer,
        baseline_vector: Vector,
    ) -> dict[str, float]:
        intent_vector = self.llm.extract_intent_vector(telemetry.commit_message, telemetry.diff_payload)
        base_sdi = 1.0 - clamp(cosine_similarity(intent_vector, baseline_vector))
        alignment_penalty = self.llm.check_prerequisite_alignment(telemetry.diff_payload, self.north_star_doc)
        sdi = clamp(base_sdi + alignment_penalty)

        hallucinations = sum(1 for imp in telemetry.new_imports if not self.registry.exists(imp))
        module_error_detected = bool(MODULE_ERROR_RE.search(telemetry.ci_log_payload))
        ahr = 1.0 if hallucinations > 0 or module_error_detected else 0.0

        tmcr = telemetry.test_bytes_changed / max(telemetry.src_bytes_changed, 1)
        delta_complexity = (
            repo.calculate_total_complexity()
            - repo.get_previous_state().calculate_total_complexity()
        )
        ccdc = delta_complexity / max(1, telemetry.lines_of_code_changed)
        cfs = clamp(repo.calculate_ast_clone_density())

        return {
            "SDI": round(sdi, 6),
            "AHR": round(ahr, 6),
            "TMCR": round(max(0.0, tmcr), 6),
            "CCDC": round(max(0.0, ccdc), 6),
            "CFS": round(cfs, 6),
        }


def flail_index(recent_ci_failures: int) -> float:
    return min(1.0, max(0.0, recent_ci_failures / 3))


def cosine_similarity(left: Vector, right: Vector) -> float:
    size = min(len(left), len(right))
    if size == 0:
        return 0.0
    dot = sum(float(left[i]) * float(right[i]) for i in range(size))
    left_mag = math.sqrt(sum(float(value) * float(value) for value in left))
    right_mag = math.sqrt(sum(float(value) * float(value) for value in right))
    if left_mag == 0 and right_mag == 0:
        return 1.0
    if left_mag == 0 or right_mag == 0:
        return 0.0
    return dot / (left_mag * right_mag)


def update_centroid(current: Vector | None, new_vector: Vector, count: int) -> list[float]:
    if current is None:
        return [float(value) for value in new_vector]
    size = min(len(current), len(new_vector))
    if size == 0:
        return [float(value) for value in new_vector]
    prior_weight = max(0, count - 1)
    return [
        ((float(current[i]) * prior_weight) + float(new_vector[i])) / max(1, count)
        for i in range(size)
    ]


def calculate_baselines(history: dict[str, list[float]]) -> dict[str, dict[str, float]]:
    baselines: dict[str, dict[str, float]] = {}
    for metric, values in history.items():
        if not values:
            baselines[metric] = {"mean": 0.0, "std_dev": 0.001}
        else:
            baselines[metric] = {
                "mean": mean(values),
                "std_dev": max(pstdev(values), 0.001),
            }
    return baselines


def clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def package_registry_from_imports(imports: Iterable[str]) -> StaticPackageRegistry:
    return StaticPackageRegistry(frozenset(normalize_package_name(item) for item in imports))


def normalize_package_name(package_name: str) -> str:
    package_name = package_name.strip()
    if package_name.startswith("node:"):
        return package_name.split(":", 1)[1]
    if package_name.startswith("@"):
        parts = package_name.split("/")
        return "/".join(parts[:2]) if len(parts) >= 2 else package_name
    return package_name.split(".", 1)[0].split("/", 1)[0]


_BUILTIN_PACKAGES = frozenset(
    {
        "assert",
        "async_hooks",
        "child_process",
        "crypto",
        "dataclasses",
        "fs",
        "http",
        "https",
        "json",
        "math",
        "node",
        "os",
        "path",
        "process",
        "re",
        "statistics",
        "sys",
        "typing",
        "unittest",
        "url",
    }
)
