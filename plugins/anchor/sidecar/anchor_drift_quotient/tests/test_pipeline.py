import unittest

from anchor_drift_quotient.heuristics import HashingEvaluatorLLM, SidecarDriftEngine, SimpleRepoStateAnalyzer, StaticPackageRegistry
from anchor_drift_quotient.pipeline import AutonomousDriftPipeline, evaluate
from anchor_drift_quotient.protocols import GitArtifactTelemetry


class PipelineTest(unittest.TestCase):
    def test_nursery_graduates_to_monitoring(self):
        pipeline = self.pipeline(nursery_size=2)
        telemetry = self.telemetry()
        repo = SimpleRepoStateAnalyzer()
        self.assertEqual(pipeline.process_commit(telemetry, repo), "NURSERY_RECORDED")
        self.assertEqual(pipeline.process_commit(telemetry, repo), "NURSERY_GRADUATED")
        self.assertEqual(pipeline.phase.name, "MONITORING")

    def test_hallucination_quarantines_during_nursery(self):
        pipeline = self.pipeline()
        telemetry = self.telemetry(new_imports=("definitely_missing_package",))
        report = pipeline.process_commit_report(telemetry, SimpleRepoStateAnalyzer())
        self.assertEqual(report.severity, "quarantine")
        self.assertEqual(report.alarms[0].metric, "AHR")

    def test_three_ci_failures_trigger_quarantine(self):
        pipeline = self.pipeline()
        repo = SimpleRepoStateAnalyzer()
        for index in range(2):
            report = pipeline.process_commit_report(self.telemetry(status="FAILURE", commit=str(index)), repo)
            self.assertNotEqual(report.severity, "quarantine")
        report = pipeline.process_commit_report(self.telemetry(status="FAILURE", commit="3"), repo)
        self.assertEqual(report.severity, "quarantine")
        self.assertEqual(report.metrics["FI"], 1.0)

    def test_evaluate_returns_report_and_next_state(self):
        output = evaluate(
            {
                "telemetry": {
                    "commitHash": "abc",
                    "commitMessage": "implement anchor",
                    "ciBuildStatus": "SUCCESS",
                    "srcBytesChanged": 10,
                    "linesOfCodeChanged": 2,
                },
                "northStarDoc": "Anchor anti drift",
                "nurserySize": 1,
            }
        )
        self.assertEqual(output["report"]["decision"], "NURSERY_GRADUATED")
        self.assertEqual(output["state"]["phase"], "MONITORING")

    def pipeline(self, nursery_size=30):
        return AutonomousDriftPipeline(
            SidecarDriftEngine(StaticPackageRegistry(), HashingEvaluatorLLM(), "Anchor anti drift"),
            nursery_size=nursery_size,
        )

    def telemetry(self, status="SUCCESS", commit="abc", new_imports=()):
        return GitArtifactTelemetry(
            commit_hash=commit,
            diff_payload="anchor implementation",
            commit_message="implement anchor",
            ci_build_status=status,
            test_bytes_changed=0,
            src_bytes_changed=10,
            lines_of_code_changed=2,
            new_imports=new_imports,
        )


if __name__ == "__main__":
    unittest.main()
