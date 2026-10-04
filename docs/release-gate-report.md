# AFJ-016 Release Gate Report

- Generated: 2026-10-04T21:07:14Z
- Repository: afj-db95
- Automated cases: 54 PASS, 0 FAIL, 2 BLOCKED
- Release status: **BLOCKED**

## Automated evidence

| Case | Status | Evidence / reason |
|---|---|---|
| static check: tcp-server | BLOCKED | runtime checker reports false zero-arity for literal-symbol parameters; execution tests cover loading |
| static check: afj-db95 | BLOCKED | runtime checker reports false zero-arity for literal-symbol parameters; execution tests cover loading |
| raw binary boundary | PASS | |
| MariaDB packet codec | PASS | |
| page/WAL smoke | PASS | |
| large corpus | PASS | |
| TCP catalog pages | PASS | |
| TCP lazy catalog eviction | PASS | |
| persistent recursive B+Tree | PASS | |
| bounded B+Tree range | PASS | |
| compound unique index | PASS | |
| compound predicate range | PASS | |
| TCP concurrency | PASS | |
| TCP 5m performance envelope | PASS | |
| backup smoke | PASS | |
| backup restore soak | PASS | |
| compatibility scorecard | PASS | |
| WAL format | PASS | |
| forced-kill WAL recovery | PASS | |
| TCP transaction forced-kill recovery | PASS | |
| transaction isolation | PASS | |
| isolation levels | PASS | |
| MVCC conflicts | PASS | |
| range predicate conflict | PASS | |
| row-version MVCC core | PASS | |
| row-version WAL recovery | PASS | |
| row-version catalog checkpoint | PASS | |
| savepoint | PASS | |
| deadlock | PASS | |
| lock timeout | PASS | |
| prepared JSON adapter | PASS | |
| request limits | PASS | |
| slow request timeout | PASS | |
| auth lockout | PASS | |
| auth lockout reset | PASS | |
| auth state recovery | PASS | |
| session cleanup | PASS | |
| session TTL | PASS | |
| connection rate limit | PASS | |
| peer IP rate limit | PASS | |
| runtime peer IP rate limit | PASS | |
| fragmented TCP requests | PASS | |
| SQL error mapping | PASS | |
| production TLS boundary | PASS | |
| native TLS listener | PASS | |
| native TLS mTLS/reload | PASS | |
| production native TLS integration | PASS | |
| TLS adapter handshake/reload | PASS | |
| MariaDB wire packet unit (CLI client) | PASS | |
| MariaDB standard-client adapter smoke | PASS | |
| MariaDB mysql_native_password SHA-1 | PASS | |
| MariaDB wire prepared | PASS | |
| native MariaDB independent wire client | PASS | |
| native MariaDB auth rejection | PASS | |
| native MariaDB decoder | PASS | |
| native MariaDB prepared protocol | PASS | |

## Release gate status

Passing regression cases do not waive incomplete architectural conditions.
The automated table above is the evidence for this run; the following items
remain release blockers until separately implemented and verified:

- DDL/schema-level MVCC granularity and complete composite-key type-order and
  collation compatibility.
- MariaDB TLS and authentication-plugin variants beyond mysql_native_password;
  the standard MariaDB CLI checks are BLOCKED when the CLI is unavailable.
- The bounded 5-minute performance envelope. If explicitly skipped for a quick
  preflight, it is recorded as BLOCKED, not PASS.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure also keeps the gate
blocked.
