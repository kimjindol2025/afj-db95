#!/usr/bin/env bash
set -u

# The recovery logic remains FreeLang Script in fault-injection-restart.fls.
# This wrapper supplies the one capability that the script cannot model by
# itself: terminating the real runtime process between WAL writes and replay.
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source "$repo_root/tests/bootstrap-path.sh"
bootstrap="$(resolve_afj_bootstrap)" || exit 2
wal="/tmp/afj-db95-fault-injection.wal"
log_file="$(mktemp /tmp/afj-db95-fault-injection.XXXXXX.log)"
writer_pid=""

cleanup() {
  if [ -n "$writer_pid" ] && kill -0 "$writer_pid" 2>/dev/null; then
    kill -KILL "$writer_pid" 2>/dev/null || true
    wait "$writer_pid" 2>/dev/null || true
  fi
  rm -f "$wal" "$log_file"
}
trap cleanup EXIT

rm -f "$wal"
node "$bootstrap" run "$repo_root/tests/fault-injection-restart.fls" >"$log_file" 2>&1 &
writer_pid="$!"

ready=""
for _ in $(seq 1 100); do
  if grep -q "afj-db95 forced-kill WAL writer READY" "$log_file"; then
    ready="yes"
    break
  fi
  if ! kill -0 "$writer_pid" 2>/dev/null; then
    break
  fi
  sleep 0.1
done

if [ "$ready" != "yes" ]; then
  cat "$log_file"
  exit 1
fi

# Kill after the committed transaction and prepare-only transaction have been
# flushed. Recovery must retain only the committed row.
kill -KILL "$writer_pid"
wait "$writer_pid" 2>/dev/null || true
writer_pid=""

if timeout 20s node "$bootstrap" run "$repo_root/tests/fault-injection-restart.fls" \
    | grep -q "afj-db95 forced-kill WAL recovery PASS"; then
  echo "afj-db95 forced-kill process recovery PASS"
else
  exit 1
fi
