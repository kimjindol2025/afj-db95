#!/usr/bin/env bash
set -u

# The recovery logic remains FreeLang Script in fault-injection-restart.fls.
# This wrapper supplies the one capability that the script cannot model by
# itself: terminating the real runtime process between WAL writes and replay.
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${FREELANG_BOOTSTRAP:-}"
if [ -z "$bootstrap" ] || [ ! -f "$bootstrap" ]; then echo "Set FREELANG_BOOTSTRAP to the FreeLang runtime bootstrap.js path" >&2; exit 2; fi
temp_dir="$(mktemp -d /tmp/afj-db95-fault-injection.XXXXXX)"
wal="$temp_dir/fault-injection.wal"
log_file="$temp_dir/fault-injection.log"
writer_pid=""

cleanup() {
  if [ -n "$writer_pid" ] && kill -0 "$writer_pid" 2>/dev/null; then
    kill -KILL "$writer_pid" 2>/dev/null || true
    wait "$writer_pid" 2>/dev/null || true
  fi
  rm -rf "$temp_dir"
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
