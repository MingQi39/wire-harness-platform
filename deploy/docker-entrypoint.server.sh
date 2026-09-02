#!/bin/sh
set -eu

export MIGRATIONS_PATH="${MIGRATIONS_PATH:-/app/migrations}"

if [ "${SKIP_MIGRATE:-0}" != "1" ]; then
  /app/wire-harness-server migrate up
fi

exec "$@"
