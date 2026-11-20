#!/usr/bin/env bash
# DB95 persistent launcher — bounded restarts with backoff, no hardcoded Node.
set -u

DB95_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# .fls harnesses need the Node interpreter; a C stage0 binary is a compiler only.
DB95_BOOTSTRAP="${AFJ_DB_BOOTSTRAP:-/home/kim/kim/platform/freelang-afj/bootstrap.js}"
DB95_PORT="${AFJ_DB_PORT:-43995}"
DB95_BIND="${AFJ_DB_BIND_HOST:-127.0.0.1}"
DB95_WAL="${AFJ_DB_WAL:-${DB95_ROOT}/var/db95.wal}"
DB95_RESTART_DELAY="${AFJ_DB_RESTART_DELAY:-2}"
DB95_MAX_RESTARTS="${AFJ_DB95_MAX_RESTARTS:-5}"
DB95_STOP_FILE="${AFJ_DB95_STOP_FILE:-}"

mkdir -p "$(dirname "$DB95_WAL")"

echo "DB95 persistent launcher"
echo "  bind=${DB95_BIND}:${DB95_PORT}"
echo "  wal=${DB95_WAL}"
echo "  max_restarts=${DB95_MAX_RESTARTS} base_delay=${DB95_RESTART_DELAY}s"

run_daemon() {
  if [[ "$DB95_BOOTSTRAP" == *.js ]]; then
    node "$DB95_BOOTSTRAP" run "$DB95_ROOT/tests/tcp-daemon.fls"
  else
    "$DB95_BOOTSTRAP" "$DB95_ROOT/tests/tcp-daemon.fls"
  fi
}

restarts=0
while true; do
  if [[ -n "$DB95_STOP_FILE" && -f "$DB95_STOP_FILE" ]]; then
    echo "DB95 daemon stop file present; exiting"
    exit 0
  fi

  run_daemon
  status=$?
  restarts=$((restarts + 1))
  echo "DB95 daemon exited status=${status} (restart ${restarts}/${DB95_MAX_RESTARTS})"

  if [[ "$restarts" -ge "$DB95_MAX_RESTARTS" ]]; then
    echo "DB95 restart limit reached; giving up"
    exit "$status"
  fi

  delay=$((DB95_RESTART_DELAY * (1 << (restarts - 1))))
  ((delay > 60)) && delay=60
  echo "restarting in ${delay}s"
  sleep "$delay"
done
