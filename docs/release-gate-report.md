# AFJ-016 Release Gate Report

- Generated: 2026-10-04T17:50:15Z
- Repository: afj-db95
- FreeLang runtime bootstrap: /tmp/gh-passfix.Uf7hVz/freelang-afj-runtime-candidate/bootstrap.js
- Runtime native TCP/TLS/peer-address patch: published on FreeLang runtime branch `codex/afj-db-tls-peeraddr-20261005` at `c8a2ca13`; runtime fast suite 63/63 suites and 1459/1459 tests PASS; native TLS, mTLS/certificate reload, and peer-IP rate-limit loopback tests PASS
- TCP soak duration in this run: 300000 ms (default: 300000 ms)
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
- MariaDB 10.11.14 standard-client and native-wire cases passed using a
  temporary extracted CLI package; no system packages were installed.
- DDL/schema-level MVCC granularity and full composite-key encoding/type-order
  compatibility are not complete; row-version WAL replay, row-level DML merge,
  compound predicate candidate validation, composite page-range recheck,
  multi-index intersection, range predicate conflict, and TCP transaction
  process-kill recovery cases are covered above.
  - Per-table schema-generation revisions now distinguish identical-schema
    DROP/CREATE from ordinary row updates. Stale row-level writers and
    predicate readers conflict after schema or generation changes. The revision
    map is persisted in the catalog checkpoint and reconstructed from WAL;
    `tests/tcp-mvcc-conflicts.fls`, `tests/tcp-row-version-checkpoint.fls`, and
    `tests/tcp-row-version-recovery.fls` cover those paths. Broader DDL batches
    and schema concurrency combinations remain incomplete.
  - TCP table-page manifest, page-backed B+Tree leaf-index persistence/reopen,
    bounded pin/flush pool, lazy table eviction, lazy transaction snapshot and
    durable row-version checkpoint recovery pass; page-level row execution and
    multi-index/compound range validation pass; DDL/schema MVCC granularity
    remains incomplete.
- Large-corpus, concurrency, and the full five-minute TCP performance envelope
  passed in this run at the documented p95/max limits. This is bounded soak
  evidence, not an unrestricted-duration guarantee.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure or any BLOCKED case
keeps the gate blocked.
