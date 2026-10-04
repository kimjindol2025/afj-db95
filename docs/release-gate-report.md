# AFJ-016 Release Gate Report

- Generated: 2026-10-04T23:32:26Z
- Repository: afj-db95
- FreeLang runtime revision: c783288e
- MariaDB CLI version: 10.11.14
- Automated cases: 61 PASS, 0 FAIL, 0 BLOCKED
- Release status: **BLOCKED**

## Automated evidence

| Case | Status | Evidence / reason |
|---|---|---|
| static check: tcp-server | PASS | |
| static check: afj-db95 | PASS | |
| static check: server entrypoint | PASS | |
| MariaDB listener configuration fails closed | PASS | |
| unsupported SQL collation rejected | PASS | |
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
| TCP entrypoint concurrency, DDL MVCC and WAL restart | PASS | |
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
| integrated MariaDB independent wire client/auth/prepared/WAL | PASS | |
| integrated MariaDB auth rejection | PASS | |
| integrated MariaDB standard client | PASS | |
| integrated MariaDB prepared protocol and standard client | PASS | |
| native MariaDB decoder | PASS | |
| native MariaDB prepared protocol | PASS | |

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
