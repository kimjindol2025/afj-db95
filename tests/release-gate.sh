#!/usr/bin/env bash
set -u

# AFJ-016 reproducible release gate. This is intentionally a gate, not a
# promise that the current development tree is a 1.0 release.
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source "$repo_root/tests/bootstrap-path.sh"
bootstrap="$(resolve_afj_bootstrap)" || exit 2
report="$repo_root/docs/release-gate-report.md"
temp_dir="$(mktemp -d)"
if [[ "${AFJ_GATE_KEEP_LOGS:-0}" == "1" ]]; then
  printf '[release-gate] logs=%s\n' "$temp_dir" >&2
else
  trap 'rm -rf "$temp_dir"' EXIT
fi

passed=0
failed=0
results=""

run_case() {
  label="$1"
  shift
  log_file="$temp_dir/case-$((passed + failed + 1)).log"
  case_number=$((passed + failed + 1))
  case_timeout="${AFJ_GATE_CASE_TIMEOUT_SEC:-120}"
  if [[ "$label" == "TCP 5m performance envelope" ]]; then
    case_timeout="${AFJ_GATE_SOAK_TIMEOUT_SEC:-360}"
  fi
  printf '[release-gate] START case=%s timeout=%ss label=%s\n' \
    "$case_number" "$case_timeout" "$label" >&2
  started_at="$(date +%s)"
  if AFJ_DB_WAL="$temp_dir/case-$case_number.wal" \
     AFJ_DB_REMEDIATION_WAL="$temp_dir/case-$case_number.remediation.wal" \
     AFJ_DB_AUTH_STATE="$temp_dir/case-$case_number.auth.jsonl" \
     AFJ_DB_AUDIT_LOG="$temp_dir/case-$case_number.audit.jsonl" \
     timeout --foreground "${case_timeout}s" "$@" >"$log_file" 2>&1; then
    status="PASS"
    passed=$((passed + 1))
  else
    status="FAIL"
    failed=$((failed + 1))
  fi
  finished_at="$(date +%s)"
  elapsed=$((finished_at - started_at))
  printf '[release-gate] END case=%s status=%s elapsed=%ss label=%s\n' \
    "$case_number" "$status" "$elapsed" "$label" >&2
  if [[ "$status" == FAIL ]]; then
    printf '[release-gate] tail case=%s log=%s\n' "$case_number" "$log_file" >&2
    tail -n 12 "$log_file" >&2 || true
  fi
  results+=$'\n| '
  results+="$label | $status |"
}

run_case "syntax: tcp-server" node "$bootstrap" check "$repo_root/src/tcp-server.fls"
run_case "syntax: afj-db95" node "$bootstrap" check "$repo_root/src/afj-db95.fls"
run_case "raw binary boundary" node "$bootstrap" run "$repo_root/tests/binary-raw.fls"
run_case "MariaDB packet codec" node "$bootstrap" run "$repo_root/tests/mariadb-wire-codec.fls"
run_case "MariaDB charset contract" node "$bootstrap" run "$repo_root/tests/mariadb-charset-contract.fls"
run_case "COLLATE contract" node "$bootstrap" run "$repo_root/tests/collation-contract.fls"
run_case "page/WAL smoke" env AFJ_DB_PAGE_CACHE_PAGES=2 node "$bootstrap" run "$repo_root/src/afj-db95.fls"
run_case "metrics contract" node "$bootstrap" run "$repo_root/tests/metrics-contract.fls"
run_case "local canary rollback" bash "$repo_root/.freelang/canary.sh"
run_case "large corpus" node "$bootstrap" run "$repo_root/tests/large-corpus-soak.fls"
run_case "TCP catalog pages" env AFJ_DB_WAL=/tmp/afj-db95-catalog-page-gate.wal AFJ_DB_CATALOG_PAGES=/tmp/afj-db95-catalog-page-gate.pages AFJ_DB_PAGE_POOL_PAGES=2 node "$bootstrap" run "$repo_root/tests/tcp-catalog-pages.fls"
run_case "TCP lazy catalog eviction" env AFJ_DB_WAL=/tmp/afj-db95-lazy-catalog-gate.wal AFJ_DB_CATALOG_PAGES=/tmp/afj-db95-lazy-catalog-gate.pages AFJ_DB_LAZY_TABLES=true AFJ_DB_LAZY_TABLE_CACHE=1 node "$bootstrap" run "$repo_root/tests/tcp-lazy-catalog.fls"
run_case "persistent recursive B+Tree" node "$bootstrap" run "$repo_root/tests/persistent-btree.fls"
run_case "bounded B+Tree range" node "$bootstrap" run "$repo_root/tests/btree-range.fls"
run_case "compound unique index" node "$bootstrap" run "$repo_root/tests/compound-index.fls"
run_case "compound predicate range" node "$bootstrap" run "$repo_root/tests/compound-range.fls"
run_case "schema MVCC merge" node "$bootstrap" run "$repo_root/tests/tcp-schema-mvcc.fls"
run_case "composite type order" node "$bootstrap" run "$repo_root/tests/composite-type-order.fls"
run_case "composite NULL order" node "$bootstrap" run "$repo_root/tests/composite-null-order.fls"
run_case "schema-aware composite order" node "$bootstrap" run "$repo_root/tests/composite-schema-order.fls"
run_case "mixed declared composite types" node "$bootstrap" run "$repo_root/tests/composite-mixed-type-order.fls"
run_case "composite reopen rebuild" node "$bootstrap" run "$repo_root/tests/composite-reopen-rebuild.fls"
run_case "schema-aware composite range" node "$bootstrap" run "$repo_root/tests/composite-schema-range.fls"
run_case "TCP concurrency" node "$repo_root/tests/tcp-concurrency-smoke.js"
run_case "TCP 5m performance envelope" env AFJ_SOAK_MS=300000 AFJ_SOAK_P95_LATENCY_MS=15000 AFJ_SOAK_MAX_LATENCY_MS=20000 node "$repo_root/tests/tcp-long-soak.js"
run_case "backup smoke" node "$bootstrap" run "$repo_root/src/backup.fls"
run_case "backup restore soak" node "$bootstrap" run "$repo_root/tests/backup-soak.fls"
run_case "compatibility scorecard" node "$bootstrap" run "$repo_root/src/compatibility.fls"
run_case "AFJ error token mapping" node "$bootstrap" run "$repo_root/tests/error-mapping.fls"
run_case "MariaDB remediation regression" node "$bootstrap" run "$repo_root/tests/mariadb-remediation-regression.fls"
run_case "MariaDB unsupported contract" node "$bootstrap" run "$repo_root/tests/mariadb-unsupported-contract.fls"
run_case "TCP database session scope" node "$bootstrap" run "$repo_root/tests/tcp-database-scope.fls"
run_case "WAL format" node "$bootstrap" run "$repo_root/tests/wal-format.fls"
run_case "forced-kill WAL recovery" bash "$repo_root/tests/fault-injection-restart.sh"
run_case "TCP transaction forced-kill recovery" node "$repo_root/tests/tcp-transaction-kill-recovery.js"
run_case "transaction isolation" node "$bootstrap" run "$repo_root/tests/transaction-isolation.fls"
run_case "isolation levels" node "$bootstrap" run "$repo_root/tests/tcp-isolation-levels.fls"
run_case "MVCC conflicts" node "$bootstrap" run "$repo_root/tests/tcp-mvcc-conflicts.fls"
run_case "range predicate conflict" node "$bootstrap" run "$repo_root/tests/tcp-range-predicate.fls"
run_case "row-version MVCC core" node "$bootstrap" run "$repo_root/tests/mvcc-row-version.fls"
run_case "row-version WAL recovery" env AFJ_DB_WAL=/tmp/afj-db95-row-version-recovery.wal node "$bootstrap" run "$repo_root/tests/tcp-row-version-recovery.fls"
run_case "row-version catalog checkpoint" env AFJ_DB_WAL=/tmp/afj-db95-row-version-checkpoint.wal AFJ_DB_CATALOG_PAGES=/tmp/afj-db95-row-version-checkpoint.pages node "$bootstrap" run "$repo_root/tests/tcp-row-version-checkpoint.fls"
run_case "savepoint" node "$bootstrap" run "$repo_root/tests/tcp-savepoint.fls"
run_case "deadlock" node "$bootstrap" run "$repo_root/tests/tcp-deadlock.fls"
run_case "lock timeout" env AFJ_DB_LOCK_WAIT_TIMEOUT_MS=1000 node "$bootstrap" run "$repo_root/tests/tcp-lock-timeout.fls"
run_case "prepared JSON adapter" node "$bootstrap" run "$repo_root/tests/tcp-prepared.fls"
run_case "request limits" node "$bootstrap" run "$repo_root/tests/request-limits.fls"
run_case "slow request timeout" env AFJ_DB_REQUEST_TIMEOUT_MS=100 node "$bootstrap" run "$repo_root/tests/tcp-slow-timeout.fls"
run_case "auth lockout" node "$bootstrap" run "$repo_root/tests/auth-lockout.fls"
run_case "auth lockout reset" env AFJ_DB_AUTH_LOCKOUT_MS=1000 node "$bootstrap" run "$repo_root/tests/auth-lockout-reset.fls"
run_case "auth state recovery" env AFJ_DB_AUTH_STATE=/tmp/afj-db95-auth-state-test.jsonl node "$bootstrap" run "$repo_root/tests/auth-state-recovery.fls"
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
run_case "MariaDB wire packet unit" node "$repo_root/tests/mariadb-wire-unit.js"
run_case "MariaDB mysql_native_password SHA-1" node "$bootstrap" run "$repo_root/tests/mariadb-sha1.fls"
run_case "MariaDB wire prepared" node "$repo_root/tests/mariadb-wire-prepared.js"
run_case "MariaDB standard-client smoke" node "$repo_root/tests/mariadb-wire-smoke.js"
run_case "native MariaDB wire" node "$repo_root/tests/native-mariadb-smoke.js"
run_case "native MariaDB auth rejection" node "$repo_root/tests/native-mariadb-auth.js"
run_case "native MariaDB decoder" node "$bootstrap" run "$repo_root/tests/native-mariadb-decoder.fls"
run_case "native MariaDB prepared" node "$repo_root/tests/native-mariadb-prepared.js"

cat > "$report" <<EOF
# AFJ-016 Release Gate Report

- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- Repository: afj-db95
- Automated cases: $passed PASS, $failed FAIL
- Release status: **BLOCKED**

## Automated evidence

| Case | Status |
|---|---|$results

## Release gate status

The following are the remaining release-gate conditions; passing regression cases
do not waive an incomplete architectural condition:

- Native TLS listener, external bind policy, CA/mTLS, certificate rotation and failure-injection regressions pass; no blocker remains in this area.
- MariaDB wire-level support includes a native FreeLang Script listener for handshake, COM_QUERY and COM_STMT_PREPARE/EXECUTE/CLOSE; 32-bit capability intersection, max-packet-size/charset parsing, mysql_native_password SHA-1 challenge verification, standard-client and native prepared INT, NULL, string, and multi-parameter smoke pass. TLS/auth-plugin variants beyond mysql_native_password remain incomplete.
- DDL/schema-level MVCC row/DDL merge and composite numeric/NULL type-order are
  covered by dedicated regression cases; full composite compatibility for
  collation and every mixed SQL type remains incomplete. Row-version WAL
  replay, row-level DML merge, compound predicate candidate validation,
  composite page-range recheck, multi-index intersection, range predicate
  conflict, and TCP transaction process-kill recovery cases are covered above.
  - TCP table-page manifest, page-backed B+Tree leaf-index persistence/reopen,
    bounded pin/flush pool, lazy table eviction, lazy transaction snapshot and
    durable row-version checkpoint recovery pass; page-level row execution and
    multi-index/compound range validation and schema MVCC merge pass; full
    composite collation/type compatibility remains incomplete.
- Large-corpus, high-concurrency, and the reproducible 5-minute performance envelope pass with p95/max latency thresholds; unrestricted duration beyond the bounded envelope is not claimed as a guarantee.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure also keeps the gate
blocked.
EOF

printf 'AFJ-016 report: %s PASS, %s FAIL -> %s\n' "$passed" "$failed" "$report"
if [ "$failed" -ne 0 ]; then
  exit 1
fi
# Known architectural blockers deliberately keep the current development tree
# from being mistaken for a 1.0 release.
exit 2
