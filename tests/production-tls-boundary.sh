#!/usr/bin/env bash
set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source "$repo_root/tests/bootstrap-path.sh"
bootstrap="$(resolve_afj_bootstrap)" || exit 2
log_file="/tmp/afj-db95-production-tls-boundary.log"
trap 'rm -f "$log_file" /root/afj-db95-production-tls-boundary.wal /root/afj-db95-production-tls-boundary.audit.jsonl /root/afj-db95-production-tls-boundary.state.jsonl' EXIT

if env AFJ_DB_MODE=production \
  AFJ_DB_ROOT_PASSWORD=release-test-password \
  AFJ_DB_WAL=/root/afj-db95-production-tls-boundary.wal \
  AFJ_DB_AUDIT_LOG=/root/afj-db95-production-tls-boundary.audit.jsonl \
  AFJ_DB_AUTH_STATE=/root/afj-db95-production-tls-boundary.state.jsonl \
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
