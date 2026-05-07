"""End-to-end tests for per-actor deception & drift signals (NFR, FFR, DFR, HFR, IDR)."""

import unittest

from anchor_drift_quotient.heuristics import (
    non_failure_concealment_rate,
    file_fabrication_rate,
    silent_source_substitution_rate,
    hallucinated_downstream_answer_rate,
    intentional_constraint_violation_rate,
    reference_hallucination_rate,
)
from anchor_drift_quotient.pipeline import AutonomousDriftPipeline
from anchor_drift_quotient.protocols import GitArtifactTelemetry
from anchor_drift_quotient.heuristics import SidecarDriftEngine, HashingEvaluatorLLM, StaticPackageRegistry, SimpleRepoStateAnalyzer


class DeceptionSignalsTest(unittest.TestCase):

    def test_nfr_concealment(self):
        self.assertEqual(non_failure_concealment_rate(0, 0), 0.0)
        self.assertEqual(non_failure_concealment_rate(3, 3), 1.0)
        self.assertEqual(non_failure_concealment_rate(2, 5), 0.4)

    def test_ffr_fabrication(self):
        self.assertEqual(file_fabrication_rate(2, 4), 0.5)
        self.assertEqual(file_fabrication_rate(0, 10), 0.0)
        self.assertEqual(file_fabrication_rate(5, 0), 0.0)  # edge case

    def test_dfr_silent_switch(self):
        self.assertEqual(silent_source_substitution_rate(1, 3), 1/3)
        self.assertEqual(silent_source_substitution_rate(4, 4), 1.0)

    def test_hfr_hallucinated_downstream(self):
        self.assertEqual(hallucinated_downstream_answer_rate(2, 5), 0.4)
        self.assertEqual(hallucinated_downstream_answer_rate(0, 0), 0.0)

    def test_idr_constraint_violation(self):
        self.assertEqual(intentional_constraint_violation_rate(7, 10), 0.7)
        self.assertEqual(intentional_constraint_violation_rate(0, 20), 0.0)

    def test_rhr_reference_hallucination(self):
        self.assertEqual(reference_hallucination_rate(0, 0), 0.0)
        self.assertEqual(reference_hallucination_rate(2, 10), 0.2)
        self.assertEqual(reference_hallucination_rate(5, 5), 1.0)


class PipelineDeceptionIntegrationTest(unittest.TestCase):

    def _make_pipeline(self):
        engine = SidecarDriftEngine(
            StaticPackageRegistry(),
            HashingEvaluatorLLM(),
            "Anchor anti-drift North Star"
        )
        return AutonomousDriftPipeline(engine, nursery_size=5)

    def test_nfr_triggers_quarantine(self):
        pipeline = self._make_pipeline()
        telemetry = GitArtifactTelemetry(
            commit_hash="abc",
            diff_payload="",
            commit_message="fix",
            ci_build_status="SUCCESS",
            test_bytes_changed=0,
            src_bytes_changed=10,
            lines_of_code_changed=2,
            unreported_failures=4,
            total_failures=4,
            actor_id="agent-7"
        )
        report = pipeline.process_commit_report(telemetry, SimpleRepoStateAnalyzer())
        self.assertEqual(report.severity, "quarantine")
        self.assertIn("NFR", [a.metric for a in report.alarms])

    def test_ffr_triggers_quarantine(self):
        pipeline = self._make_pipeline()
        telemetry = GitArtifactTelemetry(
            commit_hash="def",
            diff_payload="",
            commit_message="add feature",
            ci_build_status="SUCCESS",
            test_bytes_changed=0,
            src_bytes_changed=20,
            lines_of_code_changed=5,
            fabricated_files=2,
            total_downloads=2,
            actor_id="agent-9"
        )
        report = pipeline.process_commit_report(telemetry, SimpleRepoStateAnalyzer())
        self.assertEqual(report.severity, "quarantine")

    def test_idr_high_violation(self):
        pipeline = self._make_pipeline()
        telemetry = GitArtifactTelemetry(
            commit_hash="ghi",
            diff_payload="",
            commit_message="refactor",
            ci_build_status="SUCCESS",
            test_bytes_changed=0,
            src_bytes_changed=30,
            lines_of_code_changed=8,
            constraint_violations=6,
            total_steps=6,
            actor_id="human-alice"
        )
        report = pipeline.process_commit_report(telemetry, SimpleRepoStateAnalyzer())
        self.assertGreaterEqual(report.metrics.get("IDR", 0.0), 0.9)

    def test_rhr_triggers_quarantine(self):
        pipeline = self._make_pipeline()
        telemetry = GitArtifactTelemetry(
            commit_hash="rhr",
            diff_payload="",
            commit_message="cite external work",
            ci_build_status="SUCCESS",
            test_bytes_changed=0,
            src_bytes_changed=10,
            lines_of_code_changed=2,
            reference_urls=5,
            hallucinated_reference_urls=4,
            actor_id="agent-cites"
        )
        report = pipeline.process_commit_report(telemetry, SimpleRepoStateAnalyzer())
        self.assertEqual(report.severity, "quarantine")
        self.assertIn("RHR", [a.metric for a in report.alarms])


if __name__ == "__main__":
    unittest.main()
