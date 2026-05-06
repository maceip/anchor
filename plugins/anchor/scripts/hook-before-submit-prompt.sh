#!/bin/sh
exec node "$(dirname "$0")/../hooks/before-submit-prompt.mjs" "$@"