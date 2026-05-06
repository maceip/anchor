import unittest

from anchor_drift_quotient.pipeline import evaluate


class PipelineTest(unittest.TestCase):
    def test_evaluate_returns_stable_report_shape(self):
        report = evaluate({"files": [".github/workflows/ci.yml"], "ciFailures": 1})
        self.assertEqual(report.phase, "NURSERY")
        self.assertEqual(report.metrics["FI"], 0.2)
        self.assertEqual(report.metrics["infraRatio"], 1.0)


if __name__ == "__main__":
    unittest.main()
