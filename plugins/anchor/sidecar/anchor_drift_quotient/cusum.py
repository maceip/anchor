"""Page CUSUM tracker used for sustained drift detection."""

from __future__ import annotations


class CUSUMTracker:
    def __init__(
        self,
        metric_name: str,
        drift_tolerance_std_devs: float = 2.0,
        alarm_threshold: float = 4.0,
    ) -> None:
        self.metric_name = metric_name
        self.k = drift_tolerance_std_devs / 2.0
        self.h = alarm_threshold
        self.cumulative_sum = 0.0

    def update_and_check(self, current_value: float, mean: float, std_dev: float) -> bool:
        safe_std_dev = max(std_dev, 0.001)
        z_score = (current_value - mean) / safe_std_dev
        self.cumulative_sum = max(0.0, self.cumulative_sum + z_score - self.k)
        return self.cumulative_sum > self.h

    def reset(self) -> None:
        self.cumulative_sum = 0.0
