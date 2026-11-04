# DB95-22 — gate after lexer speedup

RUN-ID: `RUN-20261104-27`

## Setup and preserved evidence

- FX branch: `fix/db95-21-lexer`, HEAD `24101fdc1969eaa7f758a5e2e06aa5bc0fbbbc7b`.
- afj-db95 branch: `native-run`; starting HEAD `d02503d1c8cbeb977769a2abf1f7a77e2ddd043f`.
- Compiler: DB95-21 Stage3 at `<가림>`.
- Compiler SHA-256 before gate: `bb6b1a355e4e47360607a648b9d13ab24f43d056d5f58d87ec78fa8f657510f3`.
- Compiler SHA-256 after GDB sampling: `bb6b1a355e4e47360607a648b9d13ab24f43d056d5f58d87ec78fa8f657510f3`.
- Gate ran once with `tests/native-release-gate.sh`; it used the supplied Stage3 compiler and did not build Stage0. GDB input was the preserved DB95-20 25% `tcp-server.fls`.
- Gate output and per-case artifacts: `<가림>`. GDB command, console and 120 sampled stacks: `<가림>`. The `ps`/uptime records made before both heavy runs are in the corresponding `preflight.txt` files. No evidence was deleted.

## 1. One gate run

Original gate summary line:

```text
NATIVE_GATE_PASS=2 FAIL=69 TIMEOUT=0 SKIP=0 TOTAL=71
```

The gate command exited `1`, as expected with failures. The summary was captured in `<가림>`.

## 2. Comparison with V-18

| Metric | V-18 | DB95-22 | Change |
|---|---:|---:|---:|
| PASS | 4 | 2 | -2 |
| FAIL | 67 | 69 | +2 |
| TIMEOUT (subset of FAIL) | 39 | 0 | -39 observed |
| TOTAL | 71 | 71 | 0 |

The timeout count fell by 39 in this run, but this does **not** establish that 39 tests recovered after the speedup. A common build-environment error stopped 53 cases before their native binaries could run: GCC reported `fatal error: curl/curl.h: No such file or directory`. The attempted `CPATH` did not provide that header. Per the one-run limit, the gate was not repeated. Treat the observed zero timeouts as early failures, not recovered tests.

## 3. Failure groups and GDB sample ratio

Groups below are mutually exclusive and sum to all 69 failures. Paths in diagnostic text are redacted.

| Count | First-error group | Representative case | Original diagnostic line |
|---:|---|---|---|
| 53 | Native C build environment: curl header unavailable | Case 3, `raw binary boundary` | `<가림>/freelang-v11-fx/runtime/http_client.c:16:10: fatal error: curl/curl.h: No such file or directory` |
| 13 | `.js` input not ported | Case 24, `TCP concurrency` | `NATIVE_JS_SOURCE_NOT_PORTED` |
| 3 | Node unavailable in shell runner | Case 9, `local canary rollback` | `<가림>/.freelang/smoke.sh: line 11: node: command not found` |

The TLS boundary case is included in the Node-unavailable group: its output ends with `env: ‘node’: No such file or directory`. No source, runtime, runner, or expected value was changed.

GDB used the DB95-20 sampling script method: break at `t_units.isra` and `t_unit`, stop every 1,000 hits, and capture `bt 20` at 60 stops per breakpoint. It captured `120` stacks, all from the 25% input; each breakpoint reported `60000` hits at the sampling cap. `t_unit` was the top frame in `60/120` stacks (50%); `t_units` was the top frame in `60/120` (50%). DB95-20 has the same `60/120` top-frame split, so this bounded, evenly split sample does not establish a reduced `t_unit` share. It also does not measure total function calls because both breakpoints stop at the fixed 60-sample cap. GDB emitted missing embedded Python-module/unwinder warnings, but still exited `0` and saved the requested stacks; no Python command or script was run.

## Result

| Item | Result |
|---|---|
| 1/4: one gate run and original summary | PASS — one run; original summary line is recorded above |
| 2/4: V-18 comparison and timeout delta | PASS — table records the observed `-39`; the shared header failure limits interpretation |
| 3/4: failure groups and `t_unit` ratio | PASS — 69 failures grouped; `t_unit` top-frame share is 50%, unchanged in the capped DB95-20 comparison |
| 4/4: Forgejo commit and ref verification | PASS — report pushed to Forgejo; the `native-run` ref matched the report commit `57e4be3d56f18a561005ab495d8e6e7ebba20ca8` |

## Language result

With the DB95-21 Stage3 compiler, the one-run native gate recorded `2/71` PASS. This run does not show that the 39 V-18 timeouts were fixed: 53 cases stopped at the missing `curl/curl.h` build dependency before execution.

DB95_SUMMARY=4/4
