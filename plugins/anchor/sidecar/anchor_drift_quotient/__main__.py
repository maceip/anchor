"""JSON stdin/stdout entrypoint for the Node sidecar bridge."""

from __future__ import annotations

import json
import sys

from .pipeline import evaluate


def main() -> int:
    payload = json.load(sys.stdin)
    json.dump(evaluate(payload), sys.stdout, sort_keys=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
