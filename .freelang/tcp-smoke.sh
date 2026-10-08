#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${AFJ_BOOTSTRAP:-}"
port="${AFJ_DB_PORT:-43995}"
wal="$(mktemp /tmp/afj-db95-tcp-smoke.XXXXXX.wal)"
log="$(mktemp /tmp/afj-db95-tcp-smoke.XXXXXX.log)"
daemon_pid=""

cleanup() {
  if [[ -n "$daemon_pid" ]] && kill -0 "$daemon_pid" 2>/dev/null; then
    kill "$daemon_pid" 2>/dev/null || true
    wait "$daemon_pid" 2>/dev/null || true
  fi
  rm -f "$wal" "$wal.pages" "$log"
}
trap cleanup EXIT

if [[ -z "$bootstrap" || ! -f "$bootstrap" ]]; then
  echo "AFJ_BOOTSTRAP_REQUIRED" >&2
  exit 2
fi

AFJ_DB_PORT="$port" AFJ_DB_WAL="$wal" \
  node "$bootstrap" run "$repo_root/tests/tcp-daemon.fls" >"$log" 2>&1 &
daemon_pid=$!

for _ in $(seq 1 60); do
  if grep -q "afj-db95 TCP server STARTED" "$log"; then
    break
  fi
  if ! kill -0 "$daemon_pid" 2>/dev/null; then
    cat "$log" >&2
    exit 1
  fi
  sleep 0.1
done

if ! grep -q "afj-db95 TCP server STARTED" "$log"; then
  cat "$log" >&2
  exit 1
fi

AFJ_DB_PORT="$port" AFJ_DB_WAL="$wal" \
  node "$bootstrap" run "$repo_root/tests/tcp-health-smoke.fls"

echo "afj-db95 external TCP smoke PASS"
