# AFJ-016 Release Gate Report

- Generated: 2026-10-06T16:24:11Z
- Repository: afj-db95
- Automated cases: 60 PASS, 11 FAIL
- Release status: **BLOCKED**

## Automated evidence

| Case | Status |
|---|---|
| syntax: tcp-server | PASS |
| syntax: afj-db95 | PASS |
| raw binary boundary | PASS |
| MariaDB packet codec | PASS |
| MariaDB charset contract | PASS |
| COLLATE contract | PASS |
| page/WAL smoke | PASS |
| metrics contract | PASS |
| local canary rollback | FAIL |
| large corpus | PASS |
| TCP catalog pages | PASS |
| TCP lazy catalog eviction | PASS |
| persistent recursive B+Tree | PASS |
| bounded B+Tree range | PASS |
| compound unique index | PASS |
| compound predicate range | PASS |
| schema MVCC merge | PASS |
| composite type order | PASS |
| composite NULL order | PASS |
| schema-aware composite order | PASS |
| mixed declared composite types | PASS |
| composite reopen rebuild | PASS |
| schema-aware composite range | PASS |
| TCP concurrency | PASS |
| TCP 5m performance envelope | FAIL |
| backup smoke | PASS |
| backup restore soak | PASS |
| compatibility scorecard | PASS |
| AFJ error token mapping | PASS |
| MariaDB remediation regression | PASS |
| MariaDB unsupported contract | PASS |
| TCP database session scope | PASS |
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
| native TLS listener | FAIL |
| native TLS mTLS/reload | FAIL |
| production native TLS integration | FAIL |
| TLS adapter handshake/reload | FAIL |
| MariaDB wire packet unit | FAIL |
| MariaDB mysql_native_password SHA-1 | PASS |
| MariaDB wire prepared | PASS |
| MariaDB standard-client smoke | FAIL |
| native MariaDB wire | FAIL |
| native MariaDB auth rejection | FAIL |
| native MariaDB decoder | PASS |
| native MariaDB prepared | FAIL |

## Release gate status

The authoritative recorded run for this report is `60 PASS / 11 FAIL` at
`2026-10-06T16:24:11Z`; its overall result is **BLOCKED**. The case table above
remains the source for the automated count. Failures are not removed from that
count merely because an environment dependency or timeout may contribute.

### Recorded FAIL cases

- **Case 9, local canary rollback:** `tcp-daemon.fls` calls `tcp-server-tls`, which
  is undefined in the runtime (`Function not found: tcp-server-tls`). The canary
  rollback case did not pass.
- **Case 25, TCP 5m performance envelope:** failed with `soak request timeout:
  login`; the bounded five-minute envelope is not a PASS in this run.
- **Cases 60–62, native TLS listener, mTLS/reload, production integration:** FAIL;
  the handoff records the same undefined `tcp-server-tls` runtime function.
- **Case 63, TLS adapter handshake/reload:** FAIL; expected a pong response but
  received an empty response.
- **Case 64, MariaDB standard-client smoke:** FAIL because `mariadb` was absent
  (`spawn mariadb ENOENT`). This is an environment dependency failure, not
  evidence that the client smoke passed.
- **Cases 67–69, standard-client/native MariaDB smoke and auth:** FAIL with
  timeout or missing response in the recorded handoff. Product and environment
  causes are not fully separated; retain FAIL pending isolated evidence.
- **Case 71, native MariaDB prepared:** FAIL at the MariaDB client boundary.

### Environment blockers and unverified causes

The missing `mariadb` executable and sandbox/network-dependent timeouts prevent
some integration outcomes from being cleanly attributed to product behavior.
They do not convert those recorded FAIL cases to PASS. The separate post-merge
`54 PASS / 17 FAIL` run was affected by sandbox `listen EPERM` and additional
failures; it is not substituted for this report's preserved `60 PASS / 11 FAIL`
run.

### Structural work still incomplete

- `tcp-server-tls` listener registration/definition is absent for the exercised
  path. Native TLS listener, mTLS, certificate reload, and production integration
  do not have passing implementation evidence.
- MariaDB native wire handshake, standard-client and prepared paths have failing
  or environment-blocked evidence. Requirements beyond `mysql_native_password`
  are also explicitly incomplete.
- Full composite collation and every mixed SQL type remain incomplete as stated
  above, even though the listed MVCC, recovery, indexing, and composite-order
  regressions passed.

Passing regression cases remain valid and are not reopened by this correction.
The report remains **BLOCKED** while any recorded case fails or a required
structural condition lacks reproducible passing evidence. The internal deployment
contract added at `8f171b6` covers development deployment only and is not evidence
for commercial release-gate PASS.
