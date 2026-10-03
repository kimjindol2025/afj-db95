# MariaDB difference remediation — 2026-10-02

## Baseline and permitted execution

- Branch: `main`; HEAD: `35714723ba0919efe59237f5dd91fb3597b8d6ec`.
- Initial `git status --short`: empty.
- Baseline: `node /root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js run src/mariadb-regression.fls`: exit 0, 28/28 PASS.
- Existing report: 12/21 AFJ requests accepted, 9/21 SQL_ERROR. This is not proof of 12 matching MariaDB results: the client counts `ok=true` without per-case value comparison.
- Existing differential runner is prohibited in this task: it starts MariaDB and AFJ servers and deletes fixed datadir/WAL paths. It has not been run.
- Reproduction will use isolated in-process fixtures; existing persisted data and production configuration must remain untouched. New evidence WALs may be created under this project and retained.
- TCP listener inventory via `ss` and `/proc/net/*` is denied by the environment. `/run/mysqld/mysqld.sock` exists; connectivity is still unverified.
- Plan: reproduce all nine parser failures, fix only confirmed causes in parser/executor/SQL request routing, add semantic regressions, run permitted integration checks, record unavailable live comparisons as UNVERIFIED.
- No commits, push, server creation, restart, sudo, or deletion/reset of existing data.

## Commands

Use `node /root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js run <file>` for runtime checks. Inspect syntax/type checker availability before selecting check commands. The workspace `verify-coding.sh` only accepts template paths and cannot verify this project's paths directly.

OFFICIAL_1_0=NOT_READY

## Final local official-runtime verification — 2026-10-03

The committed source at `e4af4568cc36abf0b1102e8495733e6633fc19bb` was rerun
locally with the repository's configured v11 runtime and an isolated MariaDB
11.8.3 instance. The complete differential runner finished with MariaDB=21,
AFJ=21, result comparison PASS, AFJ PASS=21, UNSUPPORTED=0, FAIL=0.

The preserved TCP JSON cases show the response boundary contains concrete JSON
values rather than runtime functions:

```text
case 7  PASS response.result={ok:true,type:"insert",count:3}
case 8  PASS rows=[{id:"2",name:"Lee"},{id:"1",name:"Kim"}]
case 9  PASS rows=[{id:"1",...,email:null},{id:"3",...,email:null}]
case 11 PASS rows=[{name:"core",n:2},{name:"ops",n:1}]
case 14 PASS {ok:true,status:"active"}
case 16 PASS {ok:true,status:"rolled-back"}
case 17 PASS rows=[{id:"2",active:true}]
summary total=21 passed=21 unsupported=0 failed=0
```

The complete runner also recorded MariaDB checkpoints for the same 21
statements, including rollback active=1 and final remaining=2. No function
object or `execute-ast` wrapper appeared in the preserved JSON output. The
runner's MariaDB constraint and transaction subchecks were PASS.

Additional direct regressions passed: parser 28/28; engine CRUD, constraints,
FK/CHECK, projection and aggregates; transaction COMMIT/ROLLBACK/SAVEPOINT;
indexed engine and B-tree contracts; incremental index WAL; durable store,
torn-tail recovery and middle-WAL corruption rejection.

The previous 73번 temporary run remains a separate environment limitation:
its installed runtimes either lacked `tcp-server-raw` or failed existing engine
self-tests, and the temporary TCP path exposed the unresolved case 7 scope
failure. No source was written there because the original repository path was
permission-inaccessible. This does not alter the local official-runtime result,
but cross-host runtime portability is not certified by this run.

```text
FINAL_LOCAL_STATUS=PASS
TCP_RUNNER=PASS (21/21)
SERIALIZATION=PASS (concrete JSON values; no function objects)
TCP_VALUE_COMPARISON=PASS (21/21 against isolated MariaDB checkpoints)
MARIADB_DIRECT_REGRESSION=PASS (21/21)
OTHER_REGRESSION=PASS (parser 28/28; CRUD; transactions; indexes; WAL/recovery)
OFFICIAL_1_0=NOT_READY (release criteria and 73번 runtime portability remain open)
```

## 73번 서버 격리 MariaDB 비교 — 2026-10-03

실행 호스트는 `kim-pro-73` (`kimjin`, Linux aarch64 gateway; 비교 인스턴스는
x86_64 MariaDB 10.11.13)였다. `main`의 원격 HEAD
`e4af4568cc36abf0b1102e8495733e6633fc19bb`를 `/tmp`에 depth-1 clone했고,
원격 작업 트리 `/root/kilo-freelang/projects/afj-db95`는 계정 권한상 읽을 수
없었다. 운영 MariaDB PID 3582와 `0.0.0.0:3306`은 확인만 했고 접속·쓰기·재시작은
하지 않았다.

`mariadb-install-db`가 일반 사용자에게 제공되고 `/tmp` 쓰기가 가능해
`/tmp/afj-db95-compare.*` 아래 임시 datadir/socket/pid를 만들었다.
`mariadbd --skip-networking --user=kimjin`으로 격리 인스턴스를 실행하고
기존 runner의 21개 SQL을 MariaDB에 공급했다. 설치·서비스·권한 변경은 없었다.

MariaDB 쪽은 21/21 문장을 실행했고, 기존 보고서와 동일한 정규화 체크포인트를
생성했다. AFJ 쪽은 73번 서버의 `/home/kimjin/freelang-v11-latest` runtime에서
임시 clone의 top-level self-test만 제외한 실행 경계로 직접 `mariadb-corpus-local.fls`
를 실행했으며, 엄격한 행·스키마·rollback 검증이 `LOCAL_CORPUS PASS 21/21`로
끝났다. 이 직접 경로의 두 결과를 비교한 판정은 21/21 PASS이다. 이는 운영
MariaDB가 아니라 격리 MariaDB 10.11.13과의 측정이다.

같은 환경의 TCP runner도 별도로 실행했다. 양쪽 21개 입력과 연결은 성립했지만
AFJ TCP 결과는 `PASS=19`, `FAIL=2`였다. case 7 다중행 users INSERT는 응답 단절,
case 16 SQL `ROLLBACK`은 `TX_UNKNOWN_OPERATION`이었다. 또한 일부 성공 응답이
행 결과 대신 `{"fn":"execute-ast",...}` 형태로 직렬화되어 TCP 경로의 결과값
동일성은 21건 모두 확정할 수 없다. 따라서 TCP 수치는 direct semantic 비교의
21/21 PASS에 합산하지 않는다.

실패 원인 보조 증거는 다음과 같다. 73번 기본 `/home/kimjin/freelang-v11`
runtime은 engine JOIN self-test에서 중단했고, `freelang-v11-fx`는 schema
constraint self-test에서 중단했다. MCP runtime은 JOIN self-test에서 중단했다.
이는 수정 소스의 MariaDB 결과가 아니라 73번에 설치된 runtime 호환성 차이로
분류한다. 임시 비교 datadir, socket, clone, AFJ 프로세스는 종료 후 제거했다.
운영 MariaDB PID 3582와 3306 listener만 남았다.

세부 출력은 [73번 비교 증거](remote-73-mariadb-differential-20261003.log)에
기록했다. 원격 clone과 임시 데이터는 검증 종료 후 삭제했으므로 재현 원본은
남기지 않았다.

```text
STATUS=PARTIAL_PASS_TCP_UNVERIFIED
BASELINE_COMMIT=35714723ba0919efe59237f5dd91fb3597b8d6ec (pre-push baseline); tested HEAD=e4af4568cc36abf0b1102e8495733e6633fc19bb
WORKTREE_BEFORE/AFTER=remote source path inaccessible; local working tree unchanged by 73번 verification
MARIADB_ENV=ISOLATED_TEMP
INSTALL_OR_SERVICE_CHANGE=NONE (mariadb-install-db + user-owned datadir only; no sudo/service action)
DIFFERENTIAL_PASS=21 (direct semantic comparison / 21)
DIFFERENTIAL_FAIL=0 (direct semantic comparison)
DIFFERENTIAL_UNVERIFIED=0 (direct semantic comparison); TCP value comparison remains UNVERIFIED for 21/21
TCP_RUNNER=19 accepted, 2 FAIL (case 7 response disconnect; case 16 TX_UNKNOWN_OPERATION)
COMPATIBILITY_RATE=21/21*100 for the isolated direct semantic corpus; not a global MariaDB compatibility claim. TCP result-value rate=NOT_MEASURED.
EVIDENCE_FILE=docs/remote-73-mariadb-differential-20261003.log
TEMP_PROCESS_AND_DATA_CLEANUP=PASS (temp clone/datadir/processes removed; operational PID 3582 and port 3306 preserved)
FILES_CHANGED=docs/mariadb-remediation-evidence.md; docs/remote-73-mariadb-differential-20261003.log
OFFICIAL_1_0=NOT_READY
COMMIT=NO
PUSH=NO
DEPLOY=NO
```

## Verification-only follow-up — 2026-10-02

The verification pass re-read the repository at branch `main`, HEAD
`35714723ba0919efe59237f5dd91fb3597b8d6ec`. The working tree was already dirty
from the remediation work; this pass did not modify source, configuration, or
operational data. SHA-256 evidence for the implementation and corpus files was
recorded before execution:

```text
src/sql-core.fls bb641a80a8882de9a0f639cd1702558678500099309f42940636d9617f11f516
src/engine.fls 92fbafbc203921d3bf35c113a3a6979784766b5af6120fd615193732cdc950b4
src/tcp-server.fls 7f5c0929bcc0c853cc84794e1047b13f046731962f0e1fe2f122d787125d9e27
tests/mariadb-compatibility-expanded.sql d94e83c6b7680b8d0e30bf207e3acbf3f7b040a9626cc813fa526d351f79f4c9
```

MariaDB diagnosis was read-only. `/run/mysqld/mysqld.sock` exists with mode 777,
but no `mariadbd` process was present; `mariadb --no-defaults
--connect-timeout=3 --socket=/run/mysqld/mysqld.sock -uroot --batch --raw -e
'SELECT VERSION(), @@port, @@socket;'` returned `ERROR 2002 (HY000): ... (111)`.
The socket endpoint therefore has no live address/port or authentication result
to compare. `MARIADB_CONNECTION=FAIL` means the connection attempt failed;
the 21-case comparison remains `UNVERIFIED`, not 21 failures.

TCP was tested in a short-lived isolated test process on the project's test port
43995; no existing listener was found by the permitted checks. The server log is
[tcp-validation-server.log](tcp-validation-server.log) and the client evidence
is [tcp-validation-client.log](tcp-validation-client.log). The client performed
login, `CREATE TABLE tcp_users`, one-row `INSERT`, and `SELECT`, receiving the
expected row `{id:"1",name:"Kim"}`. A request with token `bad` returned
`{"ok":false,"error":"AUTH_REQUIRED"}`. The client exit code was 0. The
daemon was killed after the check; no daemon process remained and the test-created
`/tmp/afj-db95-tcp-catalog.wal` was removed. A post-cleanup `ss` check still
cannot inspect netlink in this environment, so the no-process result is the
cleanup evidence and port inspection is environment-limited.

```text
STATUS=VERIFIED_TCP_MARIADB_BLOCKED
BASELINE_COMMIT=35714723ba0919efe59237f5dd91fb3597b8d6ec
WORKTREE=DIRTY (pre-existing remediation changes and evidence; no source changes in this pass)
MARIADB_CONNECTION=FAIL (socket exists, connection refused 111)
DIFFERENTIAL_TESTS=UNVERIFIED (0/21 confirmed comparisons; 21 UNVERIFIED)
TCP_VALID_REQUEST=PASS
TCP_INVALID_REQUEST=PASS (invalid authentication token -> AUTH_REQUIRED)
PROCESS_AND_PORT_CLEANUP=PASS process absent; test WAL removed; netlink port listing denied
FILES_CHANGED=docs/mariadb-remediation-evidence.md; docs/tcp-validation-server.log; docs/tcp-validation-client.log
COMPATIBILITY_RATE=NOT_MEASURED (MariaDB endpoint unavailable; no denominator PASS claim)
OFFICIAL_1_0=NOT_READY
COMMIT=NO
PUSH=NO
DEPLOY=NO
```

## Nine-case traceability

The baseline log is [nine-differences-baseline.log](nine-differences-baseline.log).
All nine statements failed in the real parser before implementation changes.
These are parser-level reproductions, not a rerun of the unavailable TCP/MariaDB pair.
The wire adapter maps these thrown errors to the historical `SQL_ERROR`.
After-fix ASTs are in [nine-differences-after.log](nine-differences-after.log).

| Original case | Expected behavior | Reproduced actual / cause | Implementation | Local result | Live differential |
|---:|---|---|---|---|---|
| 1 | Missing DB + IF EXISTS is a no-op | unsupported DROP form; table-only parser | `src/sql-core.fls`, `src/engine.fls`, `src/tcp-server.fls` | PASS; no existing table removed | UNVERIFIED |
| 2 | Create DB metadata | unsupported CREATE form; no DB catalog | same three files | PASS; database and WAL record created | UNVERIFIED |
| 3 | Select DB for this session | unsupported SQL statement; no USE dispatch | same three files | PASS; per-session selection and qualified table/FK/JOIN names | UNVERIFIED |
| 6 | Insert two teams in schema order | unsupported INSERT form; mandatory column list | `src/sql-core.fls`, `src/engine.fls` | PASS; two rows, arity checked | UNVERIFIED |
| 7 | Insert three users with FK/CHECK | unsupported INSERT form; then CHECK OR truncation exposed | same two files | PASS; all three rows and CHECK alternatives retained | UNVERIFIED |
| 13 | Append nullable typed phone column | unsupported ALTER form; required six tokens, no schema append | same two files | PASS; old rows retained, NULL added, schema used by later positional INSERT | UNVERIFIED |
| 14 | Begin transaction on SQL query path | unsupported SQL statement; only separate tx endpoint | `src/sql-core.fls`, `src/tcp-server.fls` | PASS; existing snapshot/lock transaction mechanism invoked | UNVERIFIED |
| 16 | Undo case 15 without committed WAL entry | unsupported SQL statement; no SQL rollback dispatch | same two files | PASS; row restored, locks released, WAL unchanged | UNVERIFIED |
| 17 | Exactly id=2, active=true, two projected columns | unsupported SELECT form; WHERE path restricted to `*` | `src/sql-core.fls` | PASS; uses existing projection executor | UNVERIFIED |

## Differences from the old report

The old `12/21 PASS` counts accepted requests, not matching results. Empty SELECT
results could count as PASS. The new local test checks all 21 statements against
their expected state changes or complete row sets, using historical MariaDB
checkpoints for result expectations. Numeric SQL literals remain AFJ strings and
BOOLEAN values remain booleans; these local assertions do not prove wire type
equivalence with MariaDB's TSV output.

[corpus-intermediate.log](corpus-intermediate.log) records the intermediate
4/21 result after parser/executor additions but before SQL session routing. Case 7
then exposed `CHECK(active = TRUE OR active = FALSE)` being truncated to the first
comparison. The parser now retains both alternatives; the executor evaluates OR.
Other CHECK expression shapes are rejected instead of partially accepted.

The intermediate WAL also contained committed records for rejected USE,
transaction and INSERT statements. The autocommit path now validates against
temporary in-memory catalog copies before appending prepare/commit records.
Rejected statements leave both catalog and WAL unchanged. WAL record format
remains unchanged; successful changes replay through the same AST executor.

[legacy-namespace-reproduction.log](legacy-namespace-reproduction.log) records
a data-preservation defect found while checking the new DB implementation:
`DROP DATABASE IF EXISTS shadow` could remove a legacy `shadow.items` table even
when no such database existed. Missing-database DROP is now a true no-op.
CREATE rejects an occupied legacy namespace with `DATABASE_NAMESPACE_CONFLICT`
rather than adopting/deleting old tables. This is an AFJ legacy-preservation
boundary, not a claimed MariaDB-compatible error code.

## Executed verification and evidence

Runtime command prefix for each `.fls` below:
`node /root/freelang-surface-v0-clean-ek3qo2/v11/bootstrap.js run`.
Syntax/type command uses the same bootstrap with `check` instead of `run`.
Run from `/root/kilo-freelang/projects/afj-db95`.

| Test | Result | Evidence |
|---|---|---|
| `check` on three changed implementation files, original regression and five new `.fls` tests | Syntax PASS; type analysis PASS for defined functions; metadata warnings remain | [check log](remediation-check-results.log) |
| `src/mariadb-regression.fls` | PASS 28/28, unchanged original cases | [existing integrations](existing-integration-results.log) |
| `tests/mariadb-corpus-local.fls` | PASS 21/21; all original SQL statements, strict row/state checks | [per-case responses](corpus-local-results.log) |
| `tests/mariadb-remediation-regression.fls` | PASS 25/25 semantic checks | [regression results](remediation-regression-results.log) |
| `src/engine.fls` | PASS CRUD, schema constraints, FK/CHECK, projection and aggregates | [existing integrations](existing-integration-results.log) |
| `src/transaction-engine.fls` | PASS COMMIT/ROLLBACK and SAVEPOINT | same log |
| `src/indexed-engine.fls` | PASS index results versus scan, existing B-tree contracts | same log |
| `tests/mariadb-recovery-reader.fls`, executed after the semantic suite in a separate process | PASS exact catalog and DB metadata equality after WAL replay | [independent recovery](independent-recovery-results.log) |
| `tests/existing-server-probe.fls` | UNVERIFIED: existing TCP endpoint returned null, no valid pong | [server probes](existing-server-probe.log) |
| `timeout 5s mariadb --no-defaults --connect-timeout=3 --socket=/run/mysqld/mysqld.sock -uroot --batch -e 'SELECT VERSION();'` | UNVERIFIED: ERROR 2002 (HY000), connection refused (111) | same log |

The added 25 checks cover legacy dotted names, DB isolation and failed USE,
duplicate DB/columns, positional INSERT arity and atomic multi-row failure,
BOOLEAN type rejection, typed ALTER, projection, SQL rollback/commit and idle
transaction commands, unchanged legacy tx errors, auth/permission enforcement,
DROP isolation and mixed old/new WAL recovery. The test log lists every check.

Unsupported `ADD COLUMN ... MYSTERY` is rejected and leaves data/WAL unchanged.
MariaDB numeric error code, SQLSTATE and message matching for this and other
negative cases is **UNVERIFIED**. No unsupported syntax is counted as compatible
merely because AFJ rejected it.

`bash /root/kilo-freelang/scripts/verify-coding.sh ../projects/afj-db95/src/mariadb-regression.fls`
was also executed; [its log](workspace-verifier.log) shows its CLI does not support
`check`, skips that stage and truncates runtime output with `head -20`. Its final
success banner is not counted as verification; direct bootstrap checks and full
runtime logs above are the evidence. Bootstrap can itself print an error while
exiting zero, so PASS markers and absence of runtime/parser errors are required.

## Preservation and boundaries

- Implementation remains FreeLang Script. Node is the existing runtime only;
  shell commands only invoke tools. No new JS/Python/shell implementation.
- Existing stored data, fixed WALs/datadirs, server settings and listener ports
  were not deleted, reset or changed. In-process test catalogs are disposable
  fixtures. Fresh UUID-named evidence WALs under `docs/` are retained, including
  intermediate failed-run evidence; `.gitignore` already ignores `*.wal`.
- The recovery pointer [remediation-recovery-path.txt](remediation-recovery-path.txt)
  selects the final generated WAL and its `.expected.json` snapshot. It must be
  regenerated by the semantic test before running the reader on another machine.
- No listening server was started. Loaded protocol self-tests update only their
  in-memory state; they do not open a socket. No process restart, sudo, commit or
  push was performed. Temporary test command processes finish normally; no new
  persistent process or bound port requires cleanup.
- Real TCP request/response, live MariaDB comparison, deployment/restart and
  Termux/mobile transport behavior remain UNVERIFIED. The direct handler test
  does not replace a TCP transport test.
- Final environment observation: `uname -sm` returned `Linux aarch64`.
  Final branch/HEAD remain `main` / `35714723ba0919efe59237f5dd91fb3597b8d6ec`;
  `git diff --check` passed. All three final verification command sessions exited;
  final PASS logs contain no runtime/parser FAIL markers.
- No global MariaDB compatibility claim follows from this small SQL corpus.
  General SQL grammar, VARCHAR length/collation behavior, numeric errors and
  multi-session isolation are not certified by these tests. The existing
  VARCHAR-to-TEXT schema mapping is retained. Existing global snapshot rollback
  behavior has not been redesigned.

## Receipt

```text
STATUS=PARTIAL_UNVERIFIED (nine failures locally fixed; live verification blocked)
BASELINE_COMMIT=35714723ba0919efe59237f5dd91fb3597b8d6ec
FILES_CHANGED=src/{sql-core,engine,tcp-server}.fls; tests/{nine-differences-reproduce,mariadb-corpus-local,mariadb-remediation-regression,mariadb-recovery-reader,existing-server-probe}.fls; docs/mariadb-afj-differential-report.md; this report and linked evidence artifacts
PARSER_REGRESSION=PASS (28/28)
LOCAL_CORPUS=PASS (21/21)
ADDED_SEMANTIC_REGRESSION=PASS (25/25)
DIFFERENTIAL_TESTS=UNVERIFIED (0 confirmed PASS/21; 21 UNVERIFIED, not 21 FAIL)
INTEGRATION_TESTS=UNVERIFIED overall (CRUD, transactions, index, WAL/recovery PASS; TCP UNVERIFIED)
COMPATIBILITY_RATE=live matching PASS/21*100; 21 UNVERIFIED => not measurable. Local historical-checkpoint corpus=21/21*100=100%, not a MariaDB compatibility measurement.
UNRESOLVED=live MariaDB 21-case and added negative-case comparison; SQLSTATE/error-code equivalence; real TCP transport; mobile verification
OFFICIAL_1_0=NOT_READY
FREELANG_AFJ=USED
FREELANG_AFJ_DB=USED
FREELANG_FRONT=NOT_APPLICABLE
OTHER_LANGUAGE=NONE
OTHER_LANGUAGE_REASON=No other implementation language; existing Node runtime and verification commands only
COMMIT=NO (NOT_COMMITTED)
PUSH=NO
```
