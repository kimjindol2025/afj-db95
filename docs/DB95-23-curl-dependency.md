# DB95-23 — curl dependency removal

RUN-ID: `RUN-20261104-28`

## 1. Dependency locations and history

Before the WIP change, the curl dependency was in the FreeLang runtime, not generated test C:

| File and lines at FX `24101fdc1969eaa7f758a5e2e06aa5bc0fbbbc7b` | Use |
|---|---|
| `runtime/http_client.c:16` | Unconditional `#include <curl/curl.h>` |
| `runtime/http_client.c:30-32` | Global curl state and `curl_global_init` |
| `runtime/http_client.c:105,107-108` | Request header `curl_slist` allocation, append and free |
| `runtime/http_client.c:117,124,127-143` | Easy handle creation, URL/options, TLS and redirects |
| `runtime/http_client.c:147-171,180-185` | Method/body/header configuration and `curl_easy_perform` |
| `runtime/http_client.c:188-199` | Status, cleanup and curl error handling |
| `runtime/http_client.c:325-327` | `CURLU` URL parsing for the v11 request path |

The implementation entered at `b0c2420a0cb8c1f6c0ae87b2b3605af8949c8fca` (`2026-06-15T17:32:30+09:00`, `feat: HTTP 클라이언트 + 정규식 — fx 독립 언어 완성 1단계`). `git merge-base --is-ancestor` confirmed it predates DB95-21 commit `24101fdc1969eaa7f758a5e2e06aa5bc0fbbbc7b`.

The curl-backed client is genuinely used when FreeLang calls its outbound HTTP functions. Its header is nevertheless included for every native test build: `tests/native-release-gate.sh:14` unconditionally lists `http_client.c`; line 65 also unconditionally passes `-lcurl`. The prior gate stopped compiling at the header before it could report test behavior. The existing HTTPS socket transport was available in a separate local checkout as `runtime/http_transport.inc` at commit `3169ce6193b2146970e51b525cee13a11d5ade92`; it was not present in the DB95-21 FX tree.

## 2. WIP transport change

WIP commit `c0fab4efb13f96c8c68674bda6812101a79f2323` on `fix/db95-23-nocurl` changes only:

- `runtime/http_client.c`
- `runtime/http_transport.inc` (new in this branch, adapted from the existing local HTTPS transport)

The HTTP client now uses the native socket transport. TLS calls `SSL_CTX_set_verify(..., SSL_VERIFY_PEER, ...)`, loads default trust paths, and verifies either the IP address or host name. Certificate verification was not disabled. No runner, expected value, timeout, or test source was changed.

The compiler source was not changed, so the DB95-21 generated-source hash `7b119bfd435ee5979edf48b1ec75c0c50c3803b527fcae907e484460807509d2` is the prior reference; no new bootstrap or fixed-point run was made. This hash is not presented as a fresh DB95-23 measurement.

The test runner still passes `-lcurl`. To let its unchanged linker command run without installing development files, the local run used a temporary linker-name symlink to the already installed `/lib64/libcurl.so.4`. `readelf` on a representative binary showed `NEEDED libcurl.so.4`; therefore the runtime source no longer calls or includes curl, but this gate binary still has a libcurl runtime dependency from the runner's hard-coded link flag. The runner was not edited.

## 3. Corrected invocation and five representative cases

The earlier command assigned `case_root` in the parent shell and then used it inside a single-quoted `bash -c` body. The value was neither exported nor passed as an argument, so the child saw it as empty. This was a missing variable handoff, not a quoting change to the repository runner.

The corrected command assigned and used the paths in the same shell, with no nested `bash -c`. Exact command pattern used for case 3:

```bash
case_root="$PWD/tmp/RUN-20261104-28/cases"
case_dir="$case_root/case-3"
mkdir -p "$case_dir"
FX_ROOT=<가림>/freelang-v11-fx \
FX_NATIVE_STAGE0="$PWD/tmp/RUN-20261104-25/fixpoint-final/stage3-bin" \
LIBRARY_PATH="$PWD/tmp/RUN-20261104-28/linker" \
flock -o /tmp/fl-heavy.lock timeout --foreground 120s \
  /bin/bash tests/native-release-gate.sh --worker 3 \
  "raw binary boundary" tests/binary-raw.fls "$case_dir" "" \
  >"$case_dir/output.log" 2>&1
```

The same pattern was run individually for cases 4, 5, 8, and 10. The compiler was the DB95-21 Stage3 binary, SHA-256 `bb6b1a355e4e47360607a648b9d13ab24f43d056d5f58d87ec78fa8f657510f3`. Each worker kept the existing 120-second timeout. No `.js` case or Node process was run.

| Case | Result | Curl diagnostic | Original first runtime/output error |
|---:|---|---|---|
| 3 `raw binary boundary` | FAIL | absent | `Uncaught error: [buf-to-binary] Function not found: buf-to-binary (at line 2, col 0)` |
| 4 `MariaDB packet codec` | FAIL | absent | `Uncaught error: [buf-str] Function not found: buf-str (at line 116, col 0)` |
| 5 `MariaDB charset contract` | FAIL | absent | `Uncaught error: [buf-str] Function not found: buf-str (at line 116, col 0)` |
| 8 `metrics contract` | PASS | absent | `afj-db95 executor PASS` |
| 10 `large corpus` | FAIL | absent | `Uncaught error (line 3051): [make-rows] [rem] Function not found: rem (at line 11, col 0)` |

The five output logs and preflight `ps` records are preserved under `tmp/RUN-20261104-28/` in afj-db95. The local linker-name alias is also in that run directory; no package was installed.

## 4. One interrupted full gate attempt

All five representative outputs lacked the curl header/call diagnostic, so the full gate was started once. The gate `/tmp` was redirected into `tmp/RUN-20261104-28/root-tmp` without editing the runner. That namespace setup also made `/dev/null` unwritable. The repeated first error was:

```text
cc1: fatal error: cannot open ‘/dev/null’ for writing: Permission denied
```

The same environment cause appeared in multiple consecutive cases, so the gate was stopped under the three-failure rule. Its log ends after case 11 and contains no `NATIVE_GATE_PASS=...` aggregate line; it is not a completed 71-case result. The native safe-path setup also could not create command links because its `2>/dev/null` redirections failed; case 9 then reported `dirname: command not found` and `mktemp: command not found`.

| Metric | V-18 baseline | RUN-20261104-28 full gate |
|---|---:|---|
| PASS | 4 | No aggregate; stopped after case 11 |
| FAIL | 67 | No aggregate; the 11 emitted case records failed in the `/dev/null`-broken environment |
| TIMEOUT | 39 | No aggregate; timeout reduction cannot be inferred |
| TOTAL | 71 | Not completed |

The single gate attempt is preserved under `tmp/RUN-20261104-28/gate/`. It was not rerun. Its partial case records must not be used as native test results or as evidence that timeouts were resolved.

## Push status

- WIP FX commit `c0fab4efb13f96c8c68674bda6812101a79f2323` was pushed to Forgejo `fix/db95-23-nocurl`; the remote ref matched.
- This report is committed and pushed to Forgejo `native-run`; its final ref is checked after push.
- GitHub was not pushed; no GitHub-authentication-complete notice was received. No main branch was changed.

## Result

| Item | Result |
|---|---|
| 1/4: curl locations and introduction commit | PASS |
| 2/4: curl-path-only WIP diff and fixed point | PARTIAL — runtime-only scope is limited to the client transport; no fresh fixed-point run |
| 3/4: representative cases and V-18 gate comparison | PARTIAL — five representatives have no curl diagnostic; the single gate attempt stopped without an aggregate |
| 4/4: Forgejo refs verified | PASS — WIP FX and this afj-db95 report commit are on Forgejo |

## Supplement 1 result

| Item | Result |
|---|---|
| 1/3: WIP commit pushed and ref verified | PASS |
| 2/3: five representatives actually ran; curl diagnostic absent | PASS |
| 3/3: completed gate aggregate and V-18 comparison | INCOMPLETE — stopped after repeated `/dev/null` permission failures; no 71-case totals |

## Language result

The five representative DB95 cases recorded `1/5` PASS after the source-level curl transport removal; the full native 71-case pass count remains unmeasured. The unchanged gate linker command still attaches the host's `libcurl.so.4` runtime to case binaries, as disclosed above.

DB95_SUMMARY=2/4, 보충 1: 2/3

## DB95-24 — `/dev/null` diagnosis and full gate

### Cause

Host `ls -l /dev/null` output (owner/group redacted as required):

```text
crw-rw-rw-. 1 <가림> <가림> 1, 3 Nov  3 22:41 /dev/null
```

The device node itself is healthy. The prior failed run used a bwrap mount namespace that rebound the root and `/tmp` but did not explicitly bind the device filesystem. In that namespace `/dev/null` could not be opened, which caused the line 98 link redirections and compiler `/dev/null` writes to fail. The gate script only has `/dev/null` redirections at `tests/native-release-gate.sh:98,101-102`; inspection found no command that removes, truncates, or overwrites `/dev/null`. No runner file was changed.

With the device bind corrected, the namespace sees:

```text
crw-rw-rw-. 1 <가림> <가림> 1, 3 Nov  3 22:41 /dev/null
```

The one complete gate invocation was:

```bash
flock -o /tmp/fl-heavy.lock bwrap --bind / / --dev-bind /dev /dev --proc /proc \
  --bind <가림>/root-tmp /tmp --chdir <가림>/afj-db95 \
  env FX_ROOT=<가림>/freelang-v11-fx \
  FX_NATIVE_STAGE0=<가림>/afj-db95/tmp/RUN-20261104-25/fixpoint-final/stage3-bin \
  LIBRARY_PATH=<가림>/afj-db95/tmp/RUN-20261104-28/linker \
  NATIVE_GATE_LOG_DIR=<가림>/afj-db95/tmp/RUN-20261104-28/gate-fixed/log \
  /bin/bash tests/native-release-gate.sh
```

A preliminary setup command pointed at a non-existent compiler path; it was interrupted before any case output or Stage0 build log was produced. The completed run below used the existing compiler after its executable bit and SHA-256 were verified.
The compiler SHA-256 at start and end was `bb6b1a355e4e47360607a648b9d13ab24f43d056d5f58d87ec78fa8f657510f3` in both checks. The complete gate output is preserved under `<가림>/tmp/RUN-20261104-28/gate-fixed/gate.log`.

### Full-gate result

Original summary line:

```text
NATIVE_GATE_PASS=34 FAIL=37 TIMEOUT=0 SKIP=0 TOTAL=71
```

| Metric | V-18 | DB95-24 |
|---|---:|---:|
| PASS | 4 | 34 |
| FAIL | 67 | 37 |
| TIMEOUT | 39 | 0 |
| TOTAL | 71 | 71 |

TIMEOUT is reported as the gate's timeout count (a subset of FAIL), not an additional case category. The curl-related compiler diagnostic occurred in 0 case logs. The source transport change therefore has a first measured native gate result of 34/71 passing; `tests/native-release-gate.sh` still links `-lcurl`, so this result does not claim the produced executables have no libcurl shared-library dependency.

### Largest first-error groups

| First-error group | Cases | Count | Representative original line |
|---|---|---:|---|
| `NATIVE_JS_SOURCE_NOT_PORTED` | 24, 35, 56, 60–64, 66–69, 71 | 13 | `NATIVE_JS_SOURCE_NOT_PORTED` |
| `missing-native:buf_str` | 4, 5, 65, 70 | 4 | `Uncaught error: [buf-str] Function not found: buf-str (at line 116, col 0)` |
| `missing-native:sleep_ms` | 25, 45, 50, 53 | 4 | `Uncaught error: [sleep_ms] Function not found: sleep_ms (at line 75, col 0)` |

The next groups each have 2 cases: `oversized WAL was accepted` (7, 13), and `missing-native:file_mtime` (26, 27). Case 9 and case 34 also fail because the shell scripts require `node`, which is absent from the restricted path; no JS test was run. Case 45 has the `sleep_ms` first error even though later checks print PASS markers.

### DB95-24 score

| Criterion | Result |
|---|---|
| 1/4: `/dev/null` cause confirmed | PASS — host device is normal; namespace omitted explicit device bind |
| 2/4: 71-case gate completed | PASS — exact summary line above |
| 3/4: top three failure groups | PASS — 13, 4, and 4 cases |
| 4/4: report commit and Forgejo HEAD match | PASS — committed and pushed; local and Forgejo HEAD were equal |

GitHub remains untouched pending the user's authentication-complete notice. No source, runner, test expectation, timeout, compiler, or runtime file was changed in DB95-24.

Language result: FreeLang-native DB95 currently passes 34 of 71 cases with the curl source dependency removed; the fixed gate linker flag still adds the system libcurl runtime dependency.

DB95_SUMMARY=4/4, PASS=34 FAIL=37 TIMEOUT=0
