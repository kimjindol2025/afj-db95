# AFJ-016 Release Gate Report

- Generated: 2026-10-04T15:37:28Z
- Repository: afj-db95
- FreeLang runtime bootstrap: /tmp/gh-passfix.Uf7hVz/freelang-afj-runtime-candidate/bootstrap.js
- Runtime native TCP/TLS patch: isolated test source; not yet committed to the original runtime worktree
- TCP soak duration in this run: 1000 ms (default: 300000 ms)
- Automated cases: 56 PASS, 0 FAIL, 0 BLOCKED
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
| bounded B+Tree range | PASS |
| compound unique index | PASS |
| compound predicate range | PASS |
| TCP concurrency | PASS |
| TCP performance envelope | PASS |
| backup smoke | PASS |
| backup restore soak | PASS |
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
| row-version catalog checkpoint | PASS |
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

- Native raw TCP callbacks now provide peerAddress as a backward-compatible fourth argument. Native TLS/mTLS and certificate reload are exercised by the loopback cases above.
- MariaDB 10.11 standard-client interoperability passed using an extracted temporary client package; no system package was installed.
- DDL/schema-level MVCC granularity and full composite-key encoding/type-order
  compatibility are not complete; row-version WAL replay, row-level DML merge,
  compound predicate candidate validation, composite page-range recheck,
  multi-index intersection, range predicate conflict, and TCP transaction
  process-kill recovery cases are covered above.
  - TCP table-page manifest, page-backed B+Tree leaf-index persistence/reopen,
    bounded pin/flush pool, lazy table eviction, lazy transaction snapshot and
    durable row-version checkpoint recovery pass; page-level row execution and
    multi-index/compound range validation pass; DDL/schema MVCC granularity
    remains incomplete.
- Large-corpus and concurrency regressions pass. A standalone 300-second TCP soak passed with `writes=1408`, `throughput=4.69/s`, `p95=1962ms`, and `max=2415ms` (limits: p95 15000ms, max 20000ms). This report's matrix soak duration is listed above and may be shortened only for the rest of the matrix.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure or any BLOCKED case
keeps the gate blocked.
