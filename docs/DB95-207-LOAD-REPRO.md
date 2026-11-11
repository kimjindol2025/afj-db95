# DB95-207 — Existing Native Loader Probe

## Scope and baseline

- Branch: `review/db95-207-loader`, created from `1b208c8e8bf400ac7ee24e80d3c217f715ea707f`.
- The pre-existing dirty DB95 worktree was left unchanged.
- No Stage0 source was read, generated, rebuilt, or used. No seed was changed.
- No DB95 product code or existing test was changed. Only the two requested input examples, their shared fixture, and this report were added.
- Existing Native executable SHA-256: `7bca2ea4c37619bce3f6047d88e9bace717129034c92836c322d2ba845cfdb2a`.
- Its preserved fixed-point C SHA-256: `e4fb1a898828cd873989008e248cdcadeb5dc7ce72ac4b68d5f3ea1b28c6f487`.
- The executable is x86_64 ELF. Hashes matched the existing DB95-193/194 records.

## Minimal cases

A's root is `case-a-present-load.fls`; it loads `present.fls`, whose body defines `db95-207-present-marker`.

B's root is `case-b-missing-load.fls`; it loads `missing.fls`, which is absent from the disposable case directory.

The existing executable was invoked once per case as `<native-executable> <input.fls> <fresh-output.c>`, each with a 120-second timeout while holding `/tmp/fl-heavy.lock`. No generated C was compiled or run.

| Case | Exit | Output | Output C |
|---|---:|---|---|
| A — present module | 0 | `Compiled case-a-present-load.fls -> <redacted>` | Present; generated C contains `db95-207-present-marker` |
| B — missing module | 1 | `Uncaught error (line 2676): [cgc-run] [cgc-run-positional] [expand-loads] [load] 파일 없음: missing.fls (at line 2794, col 0)` | Absent |

## Existing 26 failure logs

The preserved `gate-memory-safe` result records `NATIVE_GATE_PASS=45 FAIL=26 TIMEOUT=1 SKIP=0 TOTAL=71`. All 26 case logs corresponding to `status=FAIL` were inspected for unresolved-load diagnostics (`expand-loads`, `[load]` missing/not-found/no-such-file errors, and equivalent missing-module messages).

- Failed cases present in the aggregate: 26/26.
- Failures with a missing-load diagnostic: **0/26**.
- Other observed failure modes include unavailable Node in shell wrappers, unsupported literal types, a timeout, and missing PASS markers. These are not classified as missing-load failures.

## Verdict

**틀림 — as the explanation for the existing 26 failures:** the e4fb fixed-point Native executable successfully loads the present-module control and rejects a missing module with exit 1, while 0/26 preserved failure logs contain a missing-load error. The historical Stage0 skip behavior was not re-tested because Stage0 use is explicitly forbidden; this probe therefore rejects the candidate as the cause of those 26 failures without claiming a new Stage0 comparison.

## Evidence and changes

New example inputs:

- `tests/db95-207/case-a-present-load.fls`
- `tests/db95-207/case-b-missing-load.fls`
- `tests/db95-207/present.fls`

This report records the executable/fixed-point hashes, exact case results, log-count method, and scope limits. No commit or push is represented until the Git result is recorded separately.
