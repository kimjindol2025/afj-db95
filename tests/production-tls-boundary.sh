#!/usr/bin/env bash
set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source "$repo_root/tests/bootstrap-path.sh"
bootstrap="$(resolve_afj_bootstrap)" || exit 2
runtime_dir="${AFJ_DB_TEST_TMP:-$(mktemp -d /tmp/afj-db95-tls-boundary.XXXXXX)}"
mkdir -p "$runtime_dir"
log_file="$runtime_dir/production-tls-boundary.log"
trap 'rm -f "$log_file"' EXIT

if env AFJ_DB_MODE=production \
  AFJ_DB_ROOT_PASSWORD=release-test-password \
  AFJ_DB_WAL="$runtime_dir/production-tls-boundary.wal" \
  AFJ_DB_AUDIT_LOG="$runtime_dir/production-tls-boundary.audit.jsonl" \
  AFJ_DB_AUTH_STATE="$runtime_dir/production-tls-boundary.state.jsonl" \
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
