# Native default project check

`.freelang/check.sh` uses an installed matching Native SDK instead of the
JavaScript bootstrap. Set `FREELANG_NATIVE_SDK_ROOT` to the SDK directory and
run `bash .freelang/check.sh`. A missing SDK exits 2 with
`AFJ_NATIVE_SDK_REQUIRED`. The host checks SDK integrity before and after,
serializes with `/tmp/fl-heavy.lock`, and limits address space to 2 GiB.

The existing FreeLang checker runs in text `--check` mode on the same two
targets, `src/tcp-server.fls` followed by `src/afj-db95.fls`, and retains the
final `afj-db95 project check PASS` marker. Parse and arity errors fail;
metadata and pure-effect warnings retain the reference text command's exit
policy. This is static checking: it does not execute the checked source.
The host adds no check timeout and does not use the page-DSL checker.

Seven controls pass with the accepted R25 SDK: missing SDK, the two actual
sources, launching through a symlink, malformed syntax, wrong arity,
static-only source with a forbidden write marker, and a pure-effect warning.
The controls exercise literal source, SDK and symlink paths containing
spaces, apostrophes, Korean, percent, dollar, internal and terminal LF.
All input bytes and SDK integrity remain unchanged. Each execve status was
parsed; all seven traces contain zero Node-family or Python executions.
A private Python qualifier stays outside those product traces.

The qualification used DB commit `1d196863116dbf5873947f9a53134423819a22c5`.
The two actual target files and old check host are identical at the later
readiness commit `f09ff94f54030cace119309503dd715db9177fe2`, where this change
is applied. Detailed hashes and per-case traces are recorded in
[`evidence/native-default-check-20261121.json`](evidence/native-default-check-20261121.json).

The original 129 tests, runners, assertions and bounds remain unchanged.
Original diagnostic case 9 remains failed; this scoped check does not
qualify the other smoke, canary or deployment paths. The complete Native
diagnostic remains 52 PASS / 19 FAIL. Commercial readiness is HOLD and
production deployment is NO.
