import unittest

from anchor_drift_quotient.heuristics import (
    HashingEvaluatorLLM,
    SidecarDriftEngine,
    SimpleRepoStateAnalyzer,
    StaticPackageRegistry,
    cosine_similarity,
)
from anchor_drift_quotient.protocols import GitArtifactTelemetry


class HeuristicsTest(unittest.TestCase):
    def test_hallucinated_import_sets_ahr(self):
        engine = SidecarDriftEngine(
            registry=StaticPackageRegistry(frozenset({"known"})),
            llm=HashingEvaluatorLLM(),
            north_star_doc="build anchor",
        )
        telemetry = GitArtifactTelemetry(
            commit_hash="abc",
            diff_payload="import missing_package",
            commit_message="add dependency",
            ci_build_status="SUCCESS",
            test_bytes_changed=0,
            src_bytes_changed=10,
            lines_of_code_changed=2,
            new_imports=("missing_package",),
        )
        metrics = engine.compute(telemetry, SimpleRepoStateAnalyzer(), [1.0] * 32)
        self.assertEqual(metrics["AHR"], 1.0)

    def test_complexity_delta_is_normalized_by_changed_lines(self):
        engine = SidecarDriftEngine(
            registry=StaticPackageRegistry(),
            llm=HashingEvaluatorLLM(),
            north_star_doc="build anchor",
        )
        telemetry = GitArtifactTelemetry(
            commit_hash="abc",
            diff_payload="",
            commit_message="simplify",
            ci_build_status="SUCCESS",
            test_bytes_changed=20,
            src_bytes_changed=10,
            lines_of_code_changed=4,
        )
        repo = SimpleRepoStateAnalyzer(complexity=14, previous_complexity=10, clone_density=0.2)
        metrics = engine.compute(telemetry, repo, [1.0] * 32)
        self.assertEqual(metrics["TMCR"], 2.0)
        self.assertEqual(metrics["CCDC"], 1.0)
        self.assertEqual(metrics["CFS"], 0.2)

    def test_empty_vectors_are_not_semantic_drift(self):
        self.assertEqual(cosine_similarity([0.0, 0.0], [0.0, 0.0]), 1.0)

    def test_scoped_and_node_imports_resolve(self):
        registry = StaticPackageRegistry(frozenset({"@octokit/rest"}))
        self.assertTrue(registry.exists("@octokit/rest"))
        self.assertTrue(registry.exists("node:fs"))


if __name__ == "__main__":
    unittest.main()
