# AFJ-016 Release Gate Report

- Generated: 2026-10-05 (KST)
- Repository: afj-db95
- Automated cases: 45 PASS, 11 FAIL
- Release status: **BLOCKED**
- This is the latest full-gate result from a path-normalized clone with
  `AFJ_BOOTSTRAP` and network listen permission. The gate exited 1.
- Executable compatibility scorecard: `88%` (`node ... run src/compatibility.fls`).

## Post-review targeted validation

- `tests/compound-range.fls`: PASS with mixed `tenant` values across two pages;
  the page-range branch now rechecks both predicates and returns only the
  matching row.
- `tests/compound-index.fls`: PASS.
- `tests/tcp-mvcc-conflicts.fls`: PASS.
- FreeLang syntax/type checks for `src/engine.fls` and `src/tcp-server.fls`: PASS.

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
| TCP 5m performance envelope | PASS |
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
| peer IP rate limit | FAIL |
| runtime peer IP rate limit | FAIL |
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

## Failure classification

상세한 1차 소유자·완료 조건·중복 방지 규칙은
[`docs/release-gate-ownership.md`](release-gate-ownership.md)에 고정했다.

The 11 failures are not one growing product-failure counter. They are grouped by
the owner of the missing contract or dependency:

| 분류 | Cases | 의미 |
|---|---|---|
| FreeLang runtime contract | 40, 41, 45, 46 | peer address와 `tcp-server-tls`가 현재 runtime 경계에 없음 |
| Test/environment contract | 47, 49, 52 | production test의 `/tmp` 상태 경로 또는 `mariadb` client 미설치 |
| Integration follow-up | 48, 53, 54, 56 | TLS adapter/native MariaDB listener·auth·prepared 경로의 별도 추적 필요 |

이번 실행에서 기존에 통과하던 AFJ-DB95 core 회귀가 새로 깨졌다는 증거는
확인되지 않았다. 따라서 다음 수정은 core 기능을 추가하는 작업이 아니라,
각 분류의 소유자인 runtime·test harness·integration environment를 나눠서
처리해야 한다.

## Release gate status

The following are the remaining release-gate conditions; passing regression cases
do not waive an incomplete architectural condition:

- Native TLS boundary case 44 passed, but native TLS listener and mTLS cases 45/46 fail
  because the current runtime does not expose `tcp-server-tls`. Production native TLS
  case 47 is also blocked by an insecure `/tmp` auth-state path in the test setup.
- MariaDB wire packet unit and standard-client cases 49/52 cannot spawn the `mariadb`
  client in this environment. Native MariaDB cases 53/54/56 fail in listener/auth/
  prepared paths and need a separate runtime/client investigation. The FreeLang
  codec, SHA-1 and prepared packet unit cases that do not require that client pass.
- DDL/schema-level MVCC granularity and full composite-key encoding/type-order
  compatibility are not complete; row-version WAL replay, row-level DML merge,
  compound predicate candidate validation, composite page-range recheck,
  multi-index intersection, range predicate conflict, and TCP transaction
  process-kill recovery cases are covered above.
  - TCP table-page manifest, page-backed B+Tree leaf-index persistence/reopen,
    bounded pin/flush pool, lazy table eviction, lazy transaction snapshot and
    durable row-version checkpoint recovery pass; page-level row execution and
    full composite-key encoding/type-order compatibility remain incomplete.
- Large-corpus, high-concurrency, and the reproducible 5-minute performance envelope pass with p95/max latency thresholds; unrestricted duration beyond the bounded envelope is not claimed as a guarantee.

The report must remain **BLOCKED** until each item has implementation evidence and a
corresponding reproducible test. A nonzero automated failure also keeps the gate
blocked.
