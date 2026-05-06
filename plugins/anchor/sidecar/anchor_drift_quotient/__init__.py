"""Anchor Drift Quotient sidecar package.

Phase 2 provides the importable package shape. Phase 3 fills in the full
statistical pipeline.
"""

from .pipeline import evaluate

__all__ = ["evaluate"]
