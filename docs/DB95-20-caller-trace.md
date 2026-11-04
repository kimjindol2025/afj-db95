# DB95-20 — `t_units` / `t_unit` caller trace

RUN-ID: `RUN-20261104-23`

## Scope and compiler

- afj-db95 start HEAD: `c29afc06782df892bdc03432c3df7d65849b6fce` (`native-run`).
- FX source used to map the generated bindings: `11ac0991e2827fe7c05f3160688eeedffb676de0` (`perf/ir-chk-tag`).
- Compiler executable SHA-256 before and after: `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864`.
- The generated C from the matching FX source has SHA-256 `6a0d4e384a18834d4f0cb03c10460aade5bf05f999f5db981dd5dc275d313e7d`.
- Input: 25% `tcp-server.fls` from DB95-17. GDB run elapsed: `GDB_ELAPSED_SECONDS=168.67 MAX_RSS_KIB=878652 EXIT=0`.
- No source or compiler was changed. No 71-case gate was run. All task artifacts are under `tmp/RUN-20261104-23/`.

## 1. Stack samples

The original compiler was run under interactive GDB. Breakpoints were placed on `t_units.isra` and `t_unit`; GDB stopped every 1,000 entries and saved `bt 20`, up to 60 stops per breakpoint. The preserved transcript contains 120 stacks, and all 120 have at least 15 frames (`STACK_SAMPLES=120 STACKS_GE15=120`). Raw transcript: `tmp/RUN-20261104-23/gdb-full-stacks.log`; GDB commands and console: `capture.gdb`, `gdb-console.log`.

Generated C binding frames counted across the 120 stacks, descending; the fifth position is tied at 42, so both tied callers are listed:

| Count | Generated frame | FreeLang function | `self/cgc-main.fl` line |
|---:|---|---|---:|
| 94 | `__fl_binding_401` | `lex-loop` | 215 |
| 77 | `__fl_binding_405` | `lex` | 222 |
| 76 | `__fl_binding_324` | `skip-ws` | 100 |
| 76 | `__fl_binding_320` | `skip-ws-loop` | 91 |
| 42 | `__fl_binding_368` | `read-symbol-iter` | 158 |
| 42 | `__fl_binding_377` | `read-symbol-body-kind` | 166 |

The C-to-FreeLang mapping comes from the generated registration code: for example, `fl_register_named_fn(fl_str_val("lex-loop"), __fl_binding_401)` and equivalent entries for the other four names. `cgc-main.fl` line numbers are from the exact source revision above. The mapping source is retained at `tmp/RUN-20261104-23/original-source/cgc-main.c`; its hash matches the DB95-15 Stage2 source hash stated above.

## 2. Repeated conversion and timing estimate

GDB reports 60,000 hits for each breakpoint after the 60 evenly spaced stops. Thus the run observed approximately 60,000 `t_units` entries and 60,000 `t_unit` entries over the 25% compile. Each `t_unit` entry is nested under `t_units`; stacks repeatedly place these calls beneath `fl_v11_text_get`, the builtin dispatcher, and the lexer (`peek-at`/`peek`, `skip-ws-loop`, `lex-loop`). Source lines 39–45 show `peek-at` doing `char-at` for the current source string; lines 91–101 and 215–223 show repeated scanning through the same source buffer.

The trace did not record runtime argument identities. The source mapping shows the same `$src` value stored in lexer state (`make-state`, lines 36–37) and repeatedly passed to `char-at` via `peek-at` (`:src` read at line 40, access at line 42), so the sampled loop repeatedly converts/accesses that same source string. The run recorded about 60,000 `t_unit` entries (and 60,000 `t_units` entries), roughly one access per source-character lookup; exact per-string pointer reuse is inferred from the source flow, not directly logged by GDB. Using the non-GDB 25% baseline `ELAPSED_SECONDS=140.22` from DB95-19 and 60,000 `t_unit` entries gives a coarse whole-run average of about `0.002337` seconds (2.337 ms) per sampled `t_unit` entry. This is an amortized estimate, not isolated function latency; it includes all compiler work and does not attribute all elapsed time to `t_unit`.

## 3. Case 3 historical PASS comparison

- Historical report: `docs/release-gate-report.md`, generated `2026-10-06T16:24:11Z`, recorded `raw binary boundary | PASS`.
- Report reconciliation commit: `043bea20d71b5c40033e8376908a3a22c4c0d620` (commit date `Wed Oct 7 08:06:31 2026 +0900`).
- At that commit, `tests/release-gate.sh` ran case 3 with `node "$bootstrap" run "$repo_root/tests/binary-raw.fls"`; `tests/bootstrap-path.sh` resolves the JavaScript bootstrap. It was the interpreter/bootstrap execution path, not the native compiler, so no native compiler SHA applies to that PASS.
- Current and historical case input SHA-256: `2c355414b8ae508a803ce37e4fa692caa1f0bcb738fa00ef82defbce13bbc0bc`.
- Native evidence differs: DB95-7 recorded `missing-native:buf_to_binary` with `<fl>:2:14: error: implicit declaration of function ‘buf_to_binary’ [-Wimplicit-function-declaration]`; DB95-19 reproduced the runtime error `Uncaught error: [buf-to-binary] Function not found: buf-to-binary (at line 2, col 0)` with both original and Stage3 executables.

**Finding: (라) 기타 — execution path differs.** The recorded PASS used the Node bootstrap/interpreter path, while the later native gate uses the native compiler/runtime where this function is unavailable. The input hash is unchanged, so there is no evidence of an input change or an erroneous historical PASS. This evidence dates the native failure to DB95-7's recorded run; it does not establish the first date on which the native API was absent.

## Result

| Item | Result |
|---|---|
| 1/4: 100 stacks, each at least 15 frames | PASS — `120` stacks; all `120` have at least 15 frames |
| 2/4: top five mapped to FreeLang source | PASS — binding registration plus exact source revision and lines recorded |
| 3/4: repetition and timing | PASS — about 60,000 nested conversion entries; same source value follows the repeated lexer access path; amortized estimate recorded |
| 4/4: case 3 verdict and synchronized pushes | PENDING until report commit and remote verification |

## Language result

예 — `lex-loop`, `skip-ws-loop`, `skip-ws`, `read-symbol-iter`, and `lex` locate the repeated text-access path; this trace does not prove one of them alone accounts for most total compile time.

DB95_SUMMARY=3/4
