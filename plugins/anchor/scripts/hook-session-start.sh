#!/bin/sh
exec node "$(dirname "$0")/../hooks/session-start.mjs" "$@"