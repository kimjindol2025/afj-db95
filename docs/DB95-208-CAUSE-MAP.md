# DB95-208 — Gate Failure Cause Map (Static Evidence)

## Baseline

- Branch `fix/db95-208-causes` starts at DB95-207 commit `da89c1da33080f2d43a93e3142eb9a5ccc8676fe`.
- Existing preserved gate result: 45 PASS, 26 FAIL, 1 timeout, 71 total.
- Failed case IDs: 7, 9, 12, 13, 24, 25, 28, 30, 34, 35, 38, 39, 41, 42, 56, 59, 60, 61, 62, 63, 64, 66, 67, 68, 69, 71.
- Classification: 16 JS/Node cases excluded; case 25 is the separately excluded soak timeout; 9 remaining cases are grouped below.
- No test, source, runner, timeout, or Stage0 artifact was changed or run in this analysis.

## Per-case first error and group

| Case | Name | First error line | Group |
|---:|---|---|---|
| 7 | page/WAL smoke | `oversized WAL was accepted` | G3 — oversized-WAL fixture input is not oversized |
| 9 | local canary rollback | `node: command not found` | EX-JS — excluded JS/Node (1/16) |
| 12 | TCP lazy catalog eviction | `lazy transaction snapshot changed` | G4 — lazy transaction snapshot mismatch |
| 13 | persistent recursive B+Tree | `oversized WAL was accepted` | G3 — oversized-WAL fixture input is not oversized |
| 24 | TCP concurrency | `literal bad type=unknown; kind=literal line=138` | EX-JS — excluded JS/Node (2/16) |
| 25 | TCP 5m performance envelope | `TIMEOUT; exit 124` | EX-25 — excluded case 25 timeout |
| 28 | compatibility scorecard | `NATIVE_PASS_MARKER_MISSING` | G5 — scorecard output lacks required PASS marker |
| 30 | MariaDB remediation regression | `file_write failed: PATH_OR_ACCESS_DENIED` | G6 — regression fixture write denied |
| 34 | forced-kill WAL recovery | `node: command not found` | EX-JS — excluded JS/Node (3/16) |
| 35 | TCP transaction forced-kill recovery | `unsupported literal type=unknown line=12` | EX-JS — excluded JS/Node (4/16) |
| 38 | MVCC conflicts | `TCP row-version chain integration failed` | G7 — row-version chain integration mismatch |
| 39 | range predicate conflict | `range delete conflict was not detected` | G8 — range delete conflict not detected |
| 41 | row-version WAL recovery | `TCP row-version WAL recovery failed` | G9 — row-version WAL recovery mismatch |
| 42 | row-version catalog checkpoint | `durable row-version checkpoint was not written` | G10 — row-version checkpoint missing |
| 56 | runtime peer IP rate limit | `unsupported literal type=unknown line=12` | EX-JS — excluded JS/Node (5/16) |
| 59 | production TLS boundary | `production TLS boundary returned an unexpected error; env reports node missing` | EX-JS — excluded JS/Node (6/16) |
| 60 | native TLS listener | `unsupported literal type=unknown line=9` | EX-JS — excluded JS/Node (7/16) |
| 61 | native TLS mTLS/reload | `unsupported literal type=unknown line=9` | EX-JS — excluded JS/Node (8/16) |
| 62 | production native TLS integration | `unsupported literal type=unknown line=9` | EX-JS — excluded JS/Node (9/16) |
| 63 | TLS adapter handshake/reload | `unsupported literal type=unknown line=8` | EX-JS — excluded JS/Node (10/16) |
| 64 | MariaDB wire packet unit | `unsupported literal type=unknown line=9` | EX-JS — excluded JS/Node (11/16) |
| 66 | MariaDB wire prepared | `literal bad type=unknown; kind=literal line=122` | EX-JS — excluded JS/Node (12/16) |
| 67 | MariaDB standard-client smoke | `unsupported literal type=unknown line=15` | EX-JS — excluded JS/Node (13/16) |
| 68 | native MariaDB wire | `unsupported literal type=unknown line=9` | EX-JS — excluded JS/Node (14/16) |
| 69 | native MariaDB auth rejection | `unsupported literal type=unknown line=11` | EX-JS — excluded JS/Node (15/16) |
| 71 | native MariaDB prepared | `literal bad type=unknown; kind=literal line=83` | EX-JS — excluded JS/Node (16/16) |

## Cause groups

| Group | Cases | Count | Location | Difficulty / disposition |
|---|---|---:|---|---|
| EX-JS — JS/Node execution or source not supported by this native gate | 9, 24, 34, 35, 56, 59–64, 66–69, 71 | 16 | `tests/release-gate.sh` corresponding cases; `.js` inputs or shell wrappers | Excluded by instruction; no changes |
| EX-25 — fixed soak timeout | 25 | 1 | `tests/release-gate.sh` case 25; existing 360s gate limit | Excluded by instruction; no changes |
| G3 — oversized-WAL fixture input is not oversized | 7, 13 | 2 | `src/afj-db95.fls:440`, `src/afj-db95.fls:438-455`; Native runtime `runtime/io.c:365-366` | Small correction, but the faulty expression is inside the frozen original test; no safe product-only fix identified |
| G4 — lazy transaction snapshot mismatch | 12 | 1 | `tests/tcp-lazy-catalog.fls:101` | Medium; requires transaction/catalog trace |
| G5 — scorecard output lacks required PASS marker | 28 | 1 | `src/compatibility.fls:40`; gate marker check in `tests/native-release-gate.sh` | Low; runner change is prohibited; product semantics need review |
| G6 — regression fixture write denied | 30 | 1 | `tests/mariadb-remediation-regression.fls:130` | Medium; fixture path/access semantics need review |
| G7 — row-version chain integration mismatch | 38 | 1 | `tests/tcp-mvcc-conflicts.fls:58` | High; requires MVCC chain trace |
| G8 — range delete conflict not detected | 39 | 1 | `tests/tcp-range-predicate.fls:136` | High; requires predicate conflict trace |
| G9 — row-version WAL recovery mismatch | 41 | 1 | `tests/tcp-row-version-recovery.fls:43` | High; requires recovery trace |
| G10 — row-version checkpoint missing | 42 | 1 | `tests/tcp-row-version-checkpoint.fls:40` | High; requires checkpoint trace |
| **Total** |  | **26** |  |  |

## Selected group and blocker

**Selected largest non-excluded group: G3 (2 cases).** Both cases execute the same `oversized-wal-smoke-test` and fail at the same assertion. The existing case-7 output artifact was only 138 bytes. Generated C shows the source expression passes the repeated vector as argument 1 and the empty separator as argument 2; the Native `str_join` implementation in `runtime/io.c` expects `(separator, vector)` and returns an empty string when argument 2 is not a vector. Thus the fixture wrote a small valid WAL record rather than an oversized record. This is a test-input/API-order defect, not evidence that `load-wal-events` accepts an oversized record.

A valid fix would correct the fixture's call order (or change the FX runtime compatibility behavior). The task expressly forbids changing the original test source and scopes the branch to DB95; no genuine DB95 product-code change can make the existing 138-byte record represent the intended oversized input without changing semantics or weakening validation. Therefore no code was changed, no post-fix gate was run, and this task is **BLOCKED pending authorization** to correct that one fixture expression or a revised group-selection instruction.

## Fixed-point evidence

The preserved Stage2, Stage3, and Stage4 C files all hash to:

`e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487`

No Stage0 source or artifact was used, generated, built, or replaced. This hash check does not constitute a post-fix gate run.
