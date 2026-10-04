#!/usr/bin/env bash
set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${FREELANG_BOOTSTRAP:-}"
if [ -z "$bootstrap" ] || [ ! -f "$bootstrap" ]; then echo "Set FREELANG_BOOTSTRAP to the FreeLang runtime bootstrap.js path" >&2; exit 2; fi
temp_dir="$(mktemp -d /var/tmp/afj-db95-production-tls-boundary.XXXXXX)"
log_file="$temp_dir/server.log"
trap 'rm -rf "$temp_dir"' EXIT

if env AFJ_DB_MODE=production \
  AFJ_DB_ROOT_PASSWORD=release-test-password \
  AFJ_DB_WAL="$temp_dir/server.wal" \
  AFJ_DB_AUDIT_LOG="$temp_dir/server.audit.jsonl" \
  AFJ_DB_AUTH_STATE="$temp_dir/server.state.jsonl" \
  AFJ_DB_BIND_HOST=0.0.0.0 \
  node "$bootstrap" run "$repo_root/src/tcp-server.fls" >"$log_file" 2>&1; then
  echo "production external bind was accepted without TLS"
  exit 1
fi

if grep -q "AFJ_DB_TLS_REQUIRED" "$log_file"; then
  echo "afj-db95 production TLS boundary PASS"
  exit 0
fi

echo "production TLS boundary returned an unexpected error"
sed -n '1,80p' "$log_file"
exit 1
