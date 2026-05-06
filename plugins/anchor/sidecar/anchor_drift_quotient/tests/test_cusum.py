import unittest

from anchor_drift_quotient.cusum import CUSUMTracker


class CUSUMTrackerTest(unittest.TestCase):
    def test_accumulates_positive_degradation_only(self):
        tracker = CUSUMTracker("SDI", drift_tolerance_std_devs=1.0, alarm_threshold=3.0)
        self.assertFalse(tracker.update_and_check(1.0, mean=0.0, std_dev=1.0))
        self.assertGreater(tracker.cumulative_sum, 0)
        tracker.update_and_check(-10.0, mean=0.0, std_dev=1.0)
        self.assertEqual(tracker.cumulative_sum, 0.0)

    def test_alarm_threshold(self):
        tracker = CUSUMTracker("AHR", drift_tolerance_std_devs=0.1, alarm_threshold=0.5)
        self.assertTrue(tracker.update_and_check(1.0, mean=0.0, std_dev=0.001))


if __name__ == "__main__":
    unittest.main()
