#!/bin/sh
exec node "$(dirname "$0")/../hooks/after-file-edit.mjs" "$@"