import unittest

from anchor_drift_quotient.heuristics import flail_index


class FlailIndexTest(unittest.TestCase):
    def test_three_failures_is_hard_trigger(self):
        self.assertEqual(flail_index(0), 0.0)
        self.assertEqual(flail_index(1), 1 / 3)
        self.assertEqual(flail_index(3), 1.0)
        self.assertEqual(flail_index(99), 1.0)


if __name__ == "__main__":
    unittest.main()
