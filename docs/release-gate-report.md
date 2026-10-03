# AFJ-016 Release Gate Report

- Generated: 2026-10-03T23:47:14Z
- Repository: afj-db95
- Automated cases: 51 PASS, 0 FAIL
- Release status: **BLOCKED**

## Automated evidence

| Case | Status |
|---|---|
| syntax: tcp-server | PASS |
| syntax: afj-db95 | PASS |
| raw binary boundary | PASS |
| MariaDB packet codec | PASS |
| page/WAL smoke | PASS |
| large corpus | PASS |
| TCP catalog pages | PASS |
| TCP lazy catalog eviction | PASS |
| persistent recursive B+Tree | PASS |
| TCP concurrency | PASS |
| TCP 5m performance envelope | PASS |
| backup smoke | PASS |
| compatibility scorecard | PASS |
| WAL format | PASS |
| forced-kill WAL recovery | PASS |
| TCP transaction forced-kill recovery | PASS |
| transaction isolation | PASS |
| isolation levels | PASS |
| MVCC conflicts | PASS |
| range predicate conflict | PASS |
| row-version MVCC core | PASS |
| row-version WAL recovery | PASS |
| savepoint | PASS |
| deadlock | PASS |
| lock timeout | PASS |
| prepared JSON adapter | PASS |
| request limits | PASS |
| slow request timeout | PASS |
| auth lockout | PASS |
| auth lockout reset | PASS |
| auth state recovery | PASS |
| session cleanup | PASS |
| session TTL | PASS |
| connection rate limit | PASS |
| peer IP rate limit | PASS |
| runtime peer IP rate limit | PASS |
| fragmented TCP requests | PASS |
| SQL error mapping | PASS |
| production TLS boundary | PASS |
| native TLS listener | PASS |
| native TLS mTLS/reload | PASS |
| production native TLS integration | PASS |
| TLS adapter handshake/reload | PASS |
| MariaDB wire packet unit | PASS |
| MariaDB mysql_native_password SHA-1 | PASS |
| MariaDB wire prepared | PASS |
| MariaDB standard-client smoke | PASS |
| native MariaDB wire | PASS |
| native MariaDB auth rejection | PASS |
| native MariaDB decoder | PASS |
| native MariaDB prepared | PASS |

## Release gate status

The following are the remaining release-gate conditions; passing regression cases
do not waive an incomplete architectural condition:

- Native TLS listener, external bind policy, CA/mTLS, certificate rotation and failure-injection regressions pass; no blocker remains in this area.
- MariaDB wire-level support includes a native FreeLang Script listener for handshake, COM_QUERY and COM_STMT_PREPARE/EXECUTE/CLOSE; 32-bit capability intersection, max-packet-size/charset parsing, mysql_native_password SHA-1 challenge verification, standard-client and native prepared INT, NULL, string, and multi-parameter smoke pass. TLS/auth-plugin variants beyond mysql_native_password remain incomplete.
- Complete row-version MVCC and index-range granular validation are not complete; row-version WAL replay, range predicate conflict, and TCP transaction process-kill recovery cases are covered above.
  - TCP table-page manifest, page-backed B+Tree leaf-index persistence/reopen,
    bounded pin/flush pool, lazy table eviction and lazy transaction snapshot pass;
    page-level row execution, multi-index/compound range validation and durable
    row-version history remain incomplete.
- Large-corpus, high-concurrency, and the reproducible 5-minute performance envelope pass with p95/max latency thresholds; unrestricted duration beyond the bounded envelope is not claimed as a guarantee.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure also keeps the gate
blocked.
