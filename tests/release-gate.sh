#!/usr/bin/env bash
set -u

# AFJ-016 reproducible release gate. This is intentionally a gate, not a
# promise that the current development tree is a 1.0 release.
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${FREELANG_BOOTSTRAP:-}"
if [ -z "$bootstrap" ] || [ ! -f "$bootstrap" ]; then
  echo "Set FREELANG_BOOTSTRAP to the FreeLang runtime bootstrap.js path" >&2
  exit 2
fi
report="${AFJ_RELEASE_GATE_REPORT:-$repo_root/docs/release-gate-report.md}"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

cd "$repo_root"

passed=0
failed=0
blocked=0
results=""
export FREELANG_BOOTSTRAP="$bootstrap"

run_case() {
  label="$1"
  shift
  log_file="$temp_dir/case-$((passed + failed + blocked + 1)).log"
  case_timeout="${AFJ_RELEASE_CASE_TIMEOUT_SEC:-120}"
  if [ "$label" = "TCP 5m performance envelope" ] &&
     [ -z "${AFJ_RELEASE_CASE_TIMEOUT_SEC:-}" ]; then
    case_timeout=360
  fi
  if timeout "${case_timeout}s" "$@" >"$log_file" 2>&1; then
    status="PASS"
    passed=$((passed + 1))
  else
    status="FAIL"
    failed=$((failed + 1))
  fi
  results+=$'\n| '
  results+="$label | $status |"
  if [ "$status" = "FAIL" ]; then
    results+=" $(tail -3 "$log_file" | tr '\n' ' ' | sed 's/|/\\|/g') |"
  else
    results+=" |"
  fi
}

run_blocked_case() {
  label="$1"
  reason="$2"
  blocked=$((blocked + 1))
  results+=$'\n| '
  results+="$label | BLOCKED | $reason |"
}

run_case "static check: tcp-server" node "$bootstrap" check "$repo_root/src/tcp-server.fls"
run_case "static check: afj-db95" node "$bootstrap" check "$repo_root/src/afj-db95.fls"
run_case "static check: server entrypoint" node "$bootstrap" check "$repo_root/src/server.fls"
run_case "MariaDB listener configuration fails closed" node "$repo_root/tests/mariadb-server-config.js"
run_case "unsupported SQL collation rejected" node "$bootstrap" run "$repo_root/tests/sql-collation-boundary.fls"
run_case "raw binary boundary" node "$bootstrap" run "$repo_root/tests/binary-raw.fls"
run_case "MariaDB packet codec" node "$bootstrap" run "$repo_root/tests/mariadb-wire-codec.fls"
run_case "page/WAL smoke" env AFJ_DB_PAGE_CACHE_PAGES=2 node "$bootstrap" run "$repo_root/src/afj-db95.fls"
run_case "large corpus" node "$bootstrap" run "$repo_root/tests/large-corpus-soak.fls"
run_case "TCP catalog pages" env AFJ_DB_WAL="$temp_dir/catalog-page.wal" AFJ_DB_CATALOG_PAGES="$temp_dir/catalog-page.pages" AFJ_DB_PAGE_POOL_PAGES=2 node "$bootstrap" run "$repo_root/tests/tcp-catalog-pages.fls"
run_case "TCP lazy catalog eviction" env AFJ_DB_WAL="$temp_dir/lazy-catalog.wal" AFJ_DB_CATALOG_PAGES="$temp_dir/lazy-catalog.pages" AFJ_DB_LAZY_TABLES=true AFJ_DB_LAZY_TABLE_CACHE=1 node "$bootstrap" run "$repo_root/tests/tcp-lazy-catalog.fls"
run_case "persistent recursive B+Tree" node "$bootstrap" run "$repo_root/tests/persistent-btree.fls"
run_case "bounded B+Tree range" node "$bootstrap" run "$repo_root/tests/btree-range.fls"
run_case "compound unique index" node "$bootstrap" run "$repo_root/tests/compound-index.fls"
run_case "compound predicate range" node "$bootstrap" run "$repo_root/tests/compound-range.fls"
run_case "exact INTEGER precision" node "$bootstrap" run "$repo_root/tests/integer-precision.fls"
run_case "TCP entrypoint concurrency, DDL MVCC and WAL restart" node "$repo_root/tests/tcp-concurrency-smoke.js"
if [ "${AFJ_RELEASE_GATE_SKIP_LONG_SOAK:-0}" = "1" ]; then
  run_blocked_case "TCP 5m performance envelope" "deferred by AFJ_RELEASE_GATE_SKIP_LONG_SOAK=1"
else
  run_case "TCP 5m performance envelope" env AFJ_SOAK_MS=300000 AFJ_SOAK_P95_LATENCY_MS=15000 AFJ_SOAK_MAX_LATENCY_MS=20000 node "$repo_root/tests/tcp-long-soak.js"
fi
run_case "backup smoke" node "$bootstrap" run "$repo_root/src/backup.fls"
run_case "backup restore soak" node "$bootstrap" run "$repo_root/tests/backup-soak.fls"
run_case "compatibility scorecard" node "$bootstrap" run "$repo_root/src/compatibility.fls"
run_case "WAL format" node "$bootstrap" run "$repo_root/tests/wal-format.fls"
run_case "forced-kill WAL recovery" bash "$repo_root/tests/fault-injection-restart.sh"
run_case "TCP transaction forced-kill recovery" node "$repo_root/tests/tcp-transaction-kill-recovery.js"
run_case "transaction isolation" node "$bootstrap" run "$repo_root/tests/transaction-isolation.fls"
run_case "isolation levels" node "$bootstrap" run "$repo_root/tests/tcp-isolation-levels.fls"
run_case "MVCC conflicts" node "$bootstrap" run "$repo_root/tests/tcp-mvcc-conflicts.fls"
run_case "range predicate conflict" node "$bootstrap" run "$repo_root/tests/tcp-range-predicate.fls"
run_case "row-version MVCC core" node "$bootstrap" run "$repo_root/tests/mvcc-row-version.fls"
run_case "row-version WAL recovery" env AFJ_DB_WAL="$temp_dir/row-version-recovery.wal" node "$bootstrap" run "$repo_root/tests/tcp-row-version-recovery.fls"
run_case "row-version catalog checkpoint" env AFJ_DB_WAL="$temp_dir/row-version-checkpoint.wal" AFJ_DB_CATALOG_PAGES="$temp_dir/row-version-checkpoint.pages" node "$bootstrap" run "$repo_root/tests/tcp-row-version-checkpoint.fls"
run_case "savepoint" node "$bootstrap" run "$repo_root/tests/tcp-savepoint.fls"
run_case "deadlock" node "$bootstrap" run "$repo_root/tests/tcp-deadlock.fls"
run_case "lock timeout" env AFJ_DB_LOCK_WAIT_TIMEOUT_MS=1000 node "$bootstrap" run "$repo_root/tests/tcp-lock-timeout.fls"
run_case "prepared JSON adapter" node "$bootstrap" run "$repo_root/tests/tcp-prepared.fls"
run_case "request limits" node "$bootstrap" run "$repo_root/tests/request-limits.fls"
run_case "slow request timeout" env AFJ_DB_REQUEST_TIMEOUT_MS=100 node "$bootstrap" run "$repo_root/tests/tcp-slow-timeout.fls"
run_case "auth lockout" node "$bootstrap" run "$repo_root/tests/auth-lockout.fls"
run_case "auth lockout reset" env AFJ_DB_AUTH_LOCKOUT_MS=1000 node "$bootstrap" run "$repo_root/tests/auth-lockout-reset.fls"
run_case "auth state recovery" env AFJ_DB_AUTH_STATE="$temp_dir/auth-state.jsonl" node "$bootstrap" run "$repo_root/tests/auth-state-recovery.fls"
run_case "session cleanup" node "$bootstrap" run "$repo_root/tests/session-cleanup.fls"
run_case "session TTL" env AFJ_DB_SESSION_TTL_MS=1000 node "$bootstrap" run "$repo_root/tests/session-ttl.fls"
run_case "connection rate limit" env AFJ_DB_RATE_MAX_REQUESTS=2 node "$bootstrap" run "$repo_root/tests/connection-rate-limit.fls"
run_case "peer IP rate limit" env AFJ_DB_RATE_MAX_REQUESTS=2 node "$bootstrap" run "$repo_root/tests/ip-rate-limit.fls"
run_case "runtime peer IP rate limit" node "$repo_root/tests/ip-rate-limit-runtime.js"
run_case "fragmented TCP requests" node "$bootstrap" run "$repo_root/tests/tcp-fragmented-requests.fls"
run_case "SQL error mapping" node "$bootstrap" run "$repo_root/tests/error-mapping.fls"
run_case "production TLS boundary" bash "$repo_root/tests/production-tls-boundary.sh"
run_case "native TLS listener" node "$repo_root/tests/native-tls-smoke.js"
run_case "native TLS mTLS/reload" node "$repo_root/tests/native-tls-policy-smoke.js"
run_case "production native TLS integration" node "$repo_root/tests/production-native-tls.js"
run_case "TLS adapter handshake/reload" node "$repo_root/tests/tls-proxy-smoke.js"
if command -v mariadb >/dev/null 2>&1 || [ -x "${MARIADB_CLI:-}" ]; then
  run_case "MariaDB wire packet unit (CLI client)" node "$repo_root/tests/mariadb-wire-unit.js"
  run_case "MariaDB standard-client adapter smoke" node "$repo_root/tests/mariadb-wire-smoke.js"
else
  run_blocked_case "MariaDB wire packet unit (CLI client)" "mariadb CLI is not installed"
  run_blocked_case "MariaDB standard-client adapter smoke" "mariadb CLI is not installed"
fi
run_case "MariaDB mysql_native_password SHA-1" node "$bootstrap" run "$repo_root/tests/mariadb-sha1.fls"
run_case "MariaDB wire prepared" node "$repo_root/tests/mariadb-wire-prepared.js"
run_case "integrated MariaDB independent wire client/auth/prepared/WAL" node "$repo_root/tests/native-mariadb-client.js"
run_case "integrated MariaDB auth rejection" node "$repo_root/tests/native-mariadb-auth.js"
run_case "integrated MariaDB standard client" node "$repo_root/tests/native-mariadb-smoke.js"
run_case "integrated MariaDB prepared protocol and standard client" node "$repo_root/tests/native-mariadb-prepared.js"
run_case "native MariaDB decoder" node "$bootstrap" run "$repo_root/tests/native-mariadb-decoder.fls"
run_case "native MariaDB prepared protocol" node "$repo_root/tests/native-mariadb-client.js"

cat > "$report" <<EOF
# AFJ-016 Release Gate Report

- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Repository: afj-db95
- FreeLang runtime revision: ${AFJ_RUNTIME_COMMIT:-UNRECORDED}
- MariaDB CLI version: ${MARIADB_CLI_VERSION:-not supplied}
- Automated cases: $passed PASS, $failed FAIL, $blocked BLOCKED
- Release status: **BLOCKED**

## Automated evidence

| Case | Status | Evidence / reason |
|---|---|---|$results

## Release gate status

Passing regression cases do not waive incomplete architectural conditions.
The automated table above is the evidence for this run; the following items
remain release blockers until separately implemented and verified:

- DDL/schema-level MVCC granularity and complete composite-key type-order and
  collation compatibility.
- The native MariaDB listener is now an explicit, loopback-only option on
  src/server.fls with AFJ_DB_MARIADB_PORT. Actual-service standard-client and
  independent wire-client tests cover auth, queries, prepared statements and
  WAL restart. TLS negotiation and authentication plugins beyond
  mysql_native_password remain unsupported; do not expose this listener remotely.
- Standard-client cases are recorded BLOCKED if the MariaDB CLI is unavailable.
  The 5-minute development-host soak above passed; it is not a production-scale
  capacity claim.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure also keeps the gate
blocked.
EOF

printf 'AFJ-016 report: %s PASS, %s FAIL, %s BLOCKED -> %s\n' "$passed" "$failed" "$blocked" "$report"
if [ "$failed" -ne 0 ]; then
  exit 1
fi
# Known architectural blockers deliberately keep the current development tree
# from being mistaken for a 1.0 release.
exit 2
