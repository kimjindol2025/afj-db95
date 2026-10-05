#!/usr/bin/env bash
set -u

project="$(cd "$(dirname "$0")/.." && pwd)"
source "$project/tests/bootstrap-path.sh"
bootstrap="$(resolve_afj_bootstrap)" || exit 2
corpus="$project/tests/mariadb-compatibility-expanded.sql"
client="$project/tests/mariadb-afj-differential-client.fls"
report="$project/docs/mariadb-afj-differential-report.md"
data_dir="/tmp/afj-db95-differential-mariadb"
socket="/tmp/afj-db95-differential.sock"
pid_file="/tmp/afj-db95-differential.pid"
log_file="/tmp/afj-db95-differential-mariadb.log"
afj_log="/tmp/afj-db95-differential-afj.log"
maria_result="/tmp/afj-db95-differential-mariadb.tsv"
afj_result="/tmp/afj-db95-differential-afj.log"
tcp_wal="/tmp/afj-db95-tcp-catalog.wal"
error_result="/tmp/afj-db95-differential-errors.log"
isolation_result="/tmp/afj-db95-differential-isolation.log"

cleanup() {
  mariadb-admin --no-defaults --socket="$socket" -uroot shutdown >/dev/null 2>&1 || true
  if [ -n "${maria_pid:-}" ]; then kill "$maria_pid" 2>/dev/null || true; fi
  if [ -n "${afj_pid:-}" ]; then kill "$afj_pid" 2>/dev/null || true; fi
  wait "${maria_pid:-}" 2>/dev/null || true
  wait "${afj_pid:-}" 2>/dev/null || true
  rm -rf "$data_dir" "$socket" "$pid_file" "$log_file" "$afj_log" "$maria_result" "$afj_result" "$tcp_wal" "$error_result" "$isolation_result"
}
trap cleanup EXIT

rm -rf "$data_dir" "$socket" "$pid_file" "$log_file" "$afj_log" "$maria_result" "$afj_result" "$tcp_wal" "$error_result" "$isolation_result"
mariadb-install-db --no-defaults --auth-root-authentication-method=normal \
  --datadir="$data_dir" >/tmp/afj-db95-differential-install.log 2>&1
mariadbd --no-defaults --datadir="$data_dir" --socket="$socket" \
  --pid-file="$pid_file" --log-error="$log_file" --skip-networking --user=root \
  >/tmp/afj-db95-differential-mariadbd.out 2>&1 &
maria_pid=$!

ready=0
for _ in $(seq 1 30); do
  if mariadb-admin --no-defaults --socket="$socket" -uroot ping >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.2
done
if [ "$ready" -ne 1 ]; then
  echo "RUNNER FAIL MariaDB did not start"
  exit 1
fi

node "$bootstrap" run "$project/tests/tcp-daemon.fls" >"$afj_log" 2>&1 &
afj_pid=$!
sleep 2

mariadb --no-defaults --batch --raw --socket="$socket" -uroot \
  <"$corpus" >"$maria_result" 2>&1
maria_rc=$?
timeout 30s node "$bootstrap" run "$client" >"$afj_result" 2>&1
afj_rc=$?
node "$bootstrap" run "$project/src/engine.fls" >"$error_result" 2>&1
error_rc=$?
node "$bootstrap" run "$project/src/transaction-engine.fls" >"$isolation_result" 2>&1
isolation_rc=$?

statement_count=$(grep -o ';' "$corpus" | wc -l | tr -d ' ')
afj_total=$(grep '"type":"summary"' "$afj_result" | tail -1 | sed -n 's/.*"total":\([0-9]*\).*/\1/p')
afj_passed=$(grep '"type":"summary"' "$afj_result" | tail -1 | sed -n 's/.*"passed":\([0-9]*\).*/\1/p')
afj_unsupported=$(grep '"type":"summary"' "$afj_result" | tail -1 | sed -n 's/.*"unsupported":\([0-9]*\).*/\1/p')
afj_failed=$(grep '"type":"summary"' "$afj_result" | tail -1 | sed -n 's/.*"failed":\([0-9]*\).*/\1/p')

if grep -q $'core\t2' "$maria_result" && grep -q $'ops\t1' "$maria_result" \
   && grep -q $'remaining\n3' "$maria_result" \
   && grep -q $'remaining\n2' "$maria_result" \
   && grep -q '"name":"Kim"' "$afj_result" \
   && grep -q '"name":"Lee"' "$afj_result" \
   && grep -q '"n":2' "$afj_result" \
   && grep -q '"n":1' "$afj_result"; then
  result_check="PASS"
else
  result_check="FAIL"
fi

if [ "$error_rc" -eq 0 ] && grep -q 'foreign-key/check engine PASS' "$error_result"; then
  error_test="RECORDED/PASS: engine constraint and FK/CHECK error contracts"
else
  error_test="RECORDED/FAIL: engine constraint and FK/CHECK error contracts"
fi
if [ "$isolation_rc" -eq 0 ] && grep -q 'transaction engine COMMIT/ROLLBACK PASS' "$isolation_result" \
   && grep -q 'transaction engine SAVEPOINT PASS' "$isolation_result"; then
  isolation_test="RECORDED/PASS: COMMIT, ROLLBACK and SAVEPOINT contracts"
else
  isolation_test="RECORDED/FAIL: COMMIT, ROLLBACK and SAVEPOINT contracts"
fi

{
  echo "# MariaDB/AFJ-DB Differential Report"
  echo
  echo "- Date: $(date -u +%F)"
  echo "- MariaDB: $(mariadbd --version | head -1)"
  echo "- Corpus: mariadb-compatibility-expanded.sql"
  echo "- Same input statement count: MariaDB=$statement_count, AFJ=$afj_total"
  echo "- Runner execution: $([ "$maria_rc" -eq 0 ] && [ "$afj_rc" -eq 0 ] && echo PASS || echo FAIL)"
  echo "- Same input both databases: $([ "$statement_count" = "$afj_total" ] && echo PASS || echo FAIL)"
  echo "- Result comparison: $result_check"
  echo "- AFJ cases: PASS=$afj_passed UNSUPPORTED=$afj_unsupported FAIL=$afj_failed"
  echo "- Error code tests: $error_test"
  echo "- Isolation tests: $isolation_test"
  echo
  echo "## Explicit differences"
  grep '"status":"UNSUPPORTED"\|"status":"FAIL"' "$afj_result" || echo "- None"
  echo
  echo "## MariaDB normalized checkpoints"
  sed -n '1,80p' "$maria_result"
} >"$report"

cat "$report"

if [ "$maria_rc" -eq 0 ] && [ "$afj_rc" -eq 0 ] \
   && [ "$statement_count" = "$afj_total" ] && [ "$result_check" = "PASS" ] \
   && [ "${afj_failed:-1}" = "0" ]; then
  echo "DIFFERENTIAL_RUNNER PASS"
  exit 0
fi
echo "DIFFERENTIAL_RUNNER FAIL"
exit 1
