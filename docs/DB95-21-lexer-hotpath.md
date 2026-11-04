# DB95-21 — lexer character access hot path

RUN-ID: `RUN-20261104-25`

## Baseline and preservation

- FX start HEAD: `2bf14b3055b0ec8ee89a957a045d79b7b9b9be3d` (`perf/ir-chk-tag`).
- FX work branch: `fix/db95-21-lexer`.
- afj-db95 start HEAD: `cbb223ac58da7a03506cfbdd23e07ddd5a1831f8` (`native-run`).
- Stage2 input compiler SHA-256: `c4bb4153fd8f1ff230c17ffb49d1d29f976b15d478cd3ebaa3569235fcf9d64e`.
- Original compiler `9e08f102a579aed6ad77edac06997637e9f7b05dbe7197de1002107a6e905864` was not replaced or deleted. Stage0 was not used.
- Evidence is preserved under `tmp/RUN-20261104-25/` in afj-db95. The full 71-case gate was not run; its latest recorded result remains `NATIVE_GATE_PASS=34 FAIL=37 TOTAL=71` from DB95-10/12.

## 1. Calls repeated while scanning characters

At the starting FX revision, `self/cgc-main.fl` had this path:

| Function and baseline lines | Per-character work | Cost path |
|---|---|---|
| `peek-at` 39–42 | `(char-at $src $i)` | `char-at` calls `fl_v11_text_get`, which calls `t_units` and allocates UTF-16 units for the entire source string before returning one unit. |
| `at-end?` 47–48 | `(length (get $st :src))` | String `length` also calls `t_units` and converts the entire source to count its units. |
| `advance` 50–58 | Calls `peek` before each state advance | Repeats `peek-at` for every character. |
| `skip-ws-loop` 91–98 / `skip-ws` 100–101 | Calls `at-end?` and `peek` on every loop iteration | Repeats both whole-string conversions while skipping spaces and comments. |
| `read-symbol-iter` 158–164 / `read-symbol-body-kind` 166–167 / `read-symbol` 169–170 | Calls `at-end?`, `peek`, and `(str $res_acc $c)` per character | Repeats whole-string conversions and grows the token string one character at a time. |
| `lex-loop` 215–220 / `lex` 222–223 | Calls `skip-ws`, then `read-token`, repeatedly | Drives the repeated lexer path for the input. |

The two full-source conversions are the relevant hot path: one `length` plus one `char-at` lookup can each traverse the complete source for a single character. Token string concatenation remains unchanged.

## 2. Minimal change and fixed point

Only `self/cgc-main.fl` changed. `make-state` now stores lines containing UTF-16 character vectors, constructed once with `str-lines` and one `str-split` per line. `peek-at` indexes the current line vector using the existing line/column position; it synthesizes the newline at the line boundary and supports the existing one-character lookahead. `at-end?` compares `:idx` with a cached `:src-len`. `advance` and `emit` preserve those cached state fields. The scanner and token-building behavior was otherwise retained.

One attempted whole-file character vector reduced time but reached `MAX_RSS_KIB=106976708` on the 100% input, so it was discarded. The per-line representation avoids that allocation peak. A first nested-vector attempt exposed that `append` concatenates vector operands; that invalid Stage3 C and its logs remain preserved. The final representation wraps each line vector in a map before appending.

The final Stage2, Stage3, and Stage4 generated C SHA-256 values are identical:

```text
7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2  Stage2 source
7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2  Stage3 source
7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2  Stage4 source
```

New generated C was byte-for-byte equal to the DB95-19 baseline for all three inputs: case 3 `CASE3_C_CMP=0`, 25% `CASE25_C_CMP=0`, and 100% `CASE100_C_CMP=0`. Their SHA-256 values stayed `c88274d2ad9a6dc8d94fb050d9b7590b9b0fecaba528ed7a80f83d85d88a1779`, `eda76996efde7ebfb43b8de95ee8632e6acee35455c9bc6f82c7dad502ef7d4c`, and `7bf45e803f514f38f7a723cfb0546d0fbb312f914b714204f06c36c288efacd8`, respectively.

## 3. Compile time and GDB samples

Each row uses the exact DB95-19 input and compiler timing basis. Each compile ran once.

| Input | Before | After | Reduction | Generated C |
|---|---|---|---:|---|
| 25% `tcp-server.fls` | `ELAPSED_SECONDS=140.22 MAX_RSS_KIB=880184 EXIT=0` | `ELAPSED_SECONDS=12.58 MAX_RSS_KIB=1086016 EXIT=0` | 91.0% | identical, `CASE25_C_CMP=0` |
| 100% `tcp-server.fls` | `ELAPSED_SECONDS=285.31 MAX_RSS_KIB=1321172 EXIT=0` | `ELAPSED_SECONDS=21.44 MAX_RSS_KIB=1651832 EXIT=0` | 92.5% | identical, `CASE100_C_CMP=0` |
| case 3 `binary-raw.fls` | `ELAPSED_SECONDS=0.02 MAX_RSS_KIB=5348 EXIT=0` | `ELAPSED_SECONDS=0.02 MAX_RSS_KIB=7816 EXIT=0` | — | identical, `CASE3_C_CMP=0` |

GDB breakpoint sampling saved 103 stacks (`t_units`: 51, `t_unit`: 52). The run was interrupted after 612.88 seconds so it would not continue spending time in per-hit breakpoint accounting. At interruption, GDB reported `t_units` hits `1185747` and `t_unit` hits `2090854`; within those partial counts, `t_unit/(t_units+t_unit)=63.81%` and `t_unit/t_units=1.763`. This is a partial run, not a complete-compile count.

DB95-20's earlier asynchronous sample contained `t_unit` in 48/100 stacks. The current 103 stacks were gathered by two targeted breakpoints, so their 52/103 `t_unit` breakpoint share is not comparable with that asynchronous sample. A separate asynchronous attempt yielded only two stacks before the compiler finished. Therefore a decrease in a directly comparable GDB `t_unit` sample ratio is **not established**, even though compile time fell by more than 20% and the source no longer calls string `length`/`char-at` per character. GDB logs and the interrupted-run counter output are preserved under `tmp/RUN-20261104-25/gdb/` and `gdb-async/`.

## 4. Case 3 and case 25 runs

Both cases were run once with the final Stage3 compiler, without Stage0 or Node:

| Case | Result |
|---|---|
| 3 `raw binary boundary` | C compilation succeeded; native binary exit `1`: `Uncaught error: [buf-to-binary] Function not found: buf-to-binary (at line 2, col 0)` |
| 25 `TCP 5m performance envelope` via existing `.fls` port | Build succeeded; actual native exit `1`, with `Command exited with non-zero status 1` and time output `ELAPSED_SECONDS=58.93 MAX_RSS_KIB=1654772 EXIT=0`. The time command used a literal `EXIT=0` format field, so `CASE25_NATIVE_EXIT=1` is authoritative. Error: `Uncaught error: [sleep_ms] Function not found: sleep_ms (at line 75, col 0)`. The full 300-second soak did not complete. |

The latest recorded complete 71-case gate remains 34/71; this run did not re-run the full gate. The case 3 and case 25 results above are the only gate-related cases re-run here.

## Commit and remote status

- FX source commit: `24101fdc1969eaa7f758a5e2e06aa5bc0fbbbc7b` on `fix/db95-21-lexer`. Forgejo accepted the branch push.
- GitHub push was attempted and failed with `fatal: could not read Username for 'https://github.com': No such device or address`. Read-only `gh auth status` reports the configured `kimjindol2025` account failed to log in. No credential, URL, or repository setting was changed.
- The afj-db95 report commit and its Forgejo push are recorded after they complete. GitHub synchronization remains blocked by the same authentication state.

## Result

| Item | Result |
|---|---|
| 1/4: repeated character work and source lines | PASS — baseline calls and conversion path are listed above |
| 2/4: fixed point and generated output | PASS — Stage2=3=4 source hash; all three generated C outputs identical |
| 3/4: 20% speed reduction and lower GDB `t_unit` ratio | PARTIAL — compile time fell by 91.0%/92.5%; a comparable completed GDB ratio decrease was not established |
| 4/4: push and matching remote HEADs | INCOMPLETE — FX is on Forgejo; GitHub authentication failed, and afj-db95 still needs its report commit and Forgejo push |

## Language result

FreeLang 25% compile time fell from `140.22` to `12.58` seconds and 100% from `285.31` to `21.44` seconds. The latest full db95 result is `34/71`; case 3 still fails on missing `buf-to-binary`, and case 25 stopped on missing `sleep_ms`.

DB95_SUMMARY=2/4
