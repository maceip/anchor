#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
ANCHOR_HOME="$(mktemp -d)"
REPO="$(mktemp -d)"

cleanup() {
  rm -rf "$ANCHOR_HOME" "$REPO"
}
trap cleanup EXIT

cd "$REPO"
git init -q
git config user.email anchor@example.com
git config user.name Anchor
printf 'hello\n' > README.md
git add README.md
git commit -q -m init

ANCHOR_HOME="$ANCHOR_HOME" node "$ROOT/plugins/anchor/scripts/anchor-cli.mjs" status | grep -q "not opted in"
ANCHOR_HOME="$ANCHOR_HOME" node "$ROOT/plugins/anchor/scripts/anchor-cli.mjs" opt-in --no-cloud --repo-url https://github.com/example/x >/dev/null
test -f "$ANCHOR_HOME/example__x/state.json"
ANCHOR_HOME="$ANCHOR_HOME" node "$ROOT/plugins/anchor/scripts/anchor-cli.mjs" status | grep -q "sidecarPhase: NURSERY"
ANCHOR_HOME="$ANCHOR_HOME" node "$ROOT/plugins/anchor/scripts/anchor-cli.mjs" opt-in --no-cloud >/dev/null

NO_STATE_HOME="$(mktemp -d)"
for hook in hook-session-start hook-after-file-edit hook-before-submit-prompt hook-session-end; do
  ANCHOR_HOME="$NO_STATE_HOME" "$ROOT/plugins/anchor/scripts/${hook}.sh" >/tmp/anchor-smoke.out 2>/tmp/anchor-smoke.err
  test ! -s /tmp/anchor-smoke.err
done
rm -rf "$NO_STATE_HOME"

for i in 1 2 3 4 5; do
  ANCHOR_HOME="$ANCHOR_HOME" "$ROOT/plugins/anchor/scripts/hook-after-file-edit.sh" ".github/workflows/ci-$i.yml" >/tmp/anchor-smoke.out 2>/tmp/anchor-smoke.err || exit 1
done
grep -q "infra rat-hole warning" /tmp/anchor-smoke.err

ANCHOR_HOME="$ANCHOR_HOME" "$ROOT/plugins/anchor/scripts/hook-session-end.sh"
HOOK_SLUG="$(basename "$REPO" | sed 's/[^a-zA-Z0-9._-]/_/g')"
grep -q "session-summary" "$ANCHOR_HOME/$HOOK_SLUG/trajectory.jsonl"

echo "Anchor smoke tests passed."
