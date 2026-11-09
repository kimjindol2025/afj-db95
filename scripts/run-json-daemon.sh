#!/usr/bin/env bash
set -u

DB95_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB95_BOOTSTRAP="${AFJ_DB_BOOTSTRAP:-/home/kim/kim/platform/freelang-afj/bootstrap.js}"
DB95_PORT="${AFJ_DB_PORT:-43995}"
DB95_BIND="${AFJ_DB_BIND_HOST:-127.0.0.1}"
DB95_WAL="${AFJ_DB_WAL:-${DB95_ROOT}/var/db95.wal}"
DB95_RESTART_DELAY="${AFJ_DB_RESTART_DELAY:-2}"

mkdir -p "$(dirname "$DB95_WAL")"

echo "DB95 persistent launcher"
echo "  bind=${DB95_BIND}:${DB95_PORT}"
echo "  wal=${DB95_WAL}"

while true; do
  AFJ_DB_PORT="$DB95_PORT" \
  AFJ_DB_BIND_HOST="$DB95_BIND" \
  AFJ_DB_WAL="$DB95_WAL" \
  node "$DB95_BOOTSTRAP" run "$DB95_ROOT/tests/tcp-daemon.fls"
  status=$?
  echo "DB95 daemon exited status=${status}; restarting in ${DB95_RESTART_DELAY}s"
  sleep "$DB95_RESTART_DELAY"
done
