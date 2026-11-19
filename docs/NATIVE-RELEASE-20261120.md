# Latest whole Native release diagnostic — 2026-11-20

STATUS=FAIL; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Paths/owners: <가림>. Only isolated source copies and synthetic storage were used.

The unchanged native-release-gate.sh completed all 71 original release cases:
**52 PASS / 19 FAIL / 0 TIMEOUT / 0 SKIP**, process exit 1. This replaces the
older 51/20 observation as the latest whole Native diagnostic for the source
pair below. It is not a claim of improvement under an identical environment.
The old AFJ/Node 71/0 result belongs to a different execution profile.

The diagnostic is deliberately not an equivalent replacement for the original
Node gate. It rejects unported JS cases and additionally requires PASS text
from executable cases. A zero exit by itself cannot pass this diagnostic.
The exact original case list, tests, thresholds, runner bytes and 120/360-second
bounds were retained. No failed row was deleted or converted into a skip.

## Source and runtime

- DB source: ed908d2c461f39c4bfc554783975f9f8bcc6fb2e.
- FX source: 085c8c221567c4821073a2889a90bd5d22e89298.
- Relinked, relocated SDK compiler SHA-256:
  170aa919713a8cbdfa8bfea1fdad47ae839ce40162643120fb291c3f480cbcbd.
- Matching runtime archive SHA-256:
  2f0e0810da55436401fc5bd732b06a135c6bbd033695134ad082de15da35897e.
- Native and original gate hashes and all case results:
  [machine-readable evidence](evidence/native-release-20261120/results.json).
- [Unmodified gate stdout](evidence/native-release-20261120/gate.txt).

The accepted compiler was built from the unchanged seed through Stage4;
Stage2/3/4 generated C is identical. Packaging relinks that exact C with a
relative library RUNPATH. FX NATIVE-SSE.md and frontend NATIVE-COMMON-SDK.md
record those SDK checks. Later unaccepted browser changes are outside this
frozen DB run. DB/FX source bytes were checked unchanged before and after it.
The process cap remained 2 GiB. No dependency installation or seed generation
was performed. Successful Node/Python/alternate-runner executions in the
collected product trace are zero; missing Node attempts remain failures.

An existing bwrap installation supplied a private tmpfs for /tmp and isolated
loopback networking. Host files were mounted read-only except the owned run
artifact directory. Original worktrees, global temporary files, existing
services and customer data were not modified. This is a local qualification
run, not a production or other-server deployment.

## Every failing case

| Case | Original label | Observed classification |
|---|---|---|
| 9 | local canary rollback | Shell path still requires Node |
| 24 | TCP concurrency | JS test not ported |
| 25 | TCP 5m performance envelope | Fixture shell quoting / compiler path |
| 28 | compatibility scorecard | Native diagnostic PASS-marker mismatch |
| 30 | MariaDB remediation regression | Approved C10 parent-path restriction |
| 34 | forced-kill WAL recovery | Shell path still requires Node |
| 35 | TCP transaction forced-kill recovery | JS test not ported |
| 56 | runtime peer IP rate limit | JS test not ported |
| 59 | production TLS boundary | Shell path still requires Node |
| 60 | native TLS listener | JS test not ported |
| 61 | native TLS mTLS/reload | JS test not ported |
| 62 | production native TLS integration | JS test not ported |
| 63 | TLS adapter handshake/reload | JS test not ported |
| 64 | MariaDB wire packet unit | JS test not ported |
| 66 | MariaDB wire prepared | JS test not ported |
| 67 | MariaDB standard-client smoke | JS test not ported |
| 68 | native MariaDB wire | JS test not ported |
| 69 | native MariaDB auth rejection | JS test not ported |
| 71 | native MariaDB prepared | JS test not ported |

The 19 rows comprise 13 unported JS test clients, 3 shell paths that still call
Node and the following 3 distinct limitations. Their raw FAIL status is retained.

- Case 25 did not reach its 5-minute workload. The protected .fls fixture builds
  a shell command by surrounding AFJ_BOOTSTRAP with single quotes. The SDK's
  relocation-test path contains an apostrophe and LF, so daemon compilation
  failed at shell parsing. A separate control uses the same compiler bytes
  through a simple symlink path, preserving the 360-second limit and
  300000/15000/20000 duration/p95/max values. That control ended with timeout
  exit 124. Intermediate PASS lines were followed by an uncaught `finally`
  lookup error; they do not establish acceptance. The raw whole-gate result
  remains unchanged. See the [separate control receipt](evidence/native-release-20261120/soak-path-control.json).
- Case 28's Native program exited 0 and printed compatibility baseline=88%.
  Its source only prints target PASS at 95% or higher. The original process-exit
  gate permits a positive baseline, whereas this diagnostic also requires PASS
  text. No fake PASS, score change or expectation change was added. This does
  not establish the 95% compatibility target.
- Case 30 passed the preceding SQL semantic checks, then attempted to write
  ../docs/remediation-recovery-path.txt. The approved C10 text-file contract
  rejects every .. path component; Native raised PATH_OR_ACCESS_DENIED. The
  boundary was preserved. The original artifact-path assumption and the Native
  execution profile still need a faithful integration path; weakening file
  policy or removing the artifact assertion is not an accepted fix.

## Follow-up source audit

Strict, non-executing parsing of all 55 selected FreeLang sources yielded
54 PASS / 1 FAIL / 0 observation timeouts. The sole failure is the existing
Case 25 source: an opening parenthesis at line 29 remains unclosed at EOF,
reported as FL1001 at line 168. All 52 successful whole-gate cases have valid
source structure in this audit. The [source audit](evidence/native-release-20261120/strict-source-audit.json)
records exact source hashes and separate results; it is not another runtime gate.

The accepted positional compiler nevertheless generated C for Case 25. Its
permissive delimiter parser allowed later forms to enter the wrong scope. The
path-only control consequently printed intermediate PASS lines and ultimately
raised `Function not found: finally`; its protected 360-second wrapper returned
124. A scoped compiler correction is prepared to reject unclosed, mismatched
and unexpected closing delimiters before writing generated output. That change
is awaiting execution checks and a fresh canonical bootstrap. The protected
fixture, runner, timeout and assertions were not edited, and there is no sustained
load PASS from this control.

## What is established and what remains

The exact successful case labels are in the evidence. They cover the recorded
Native language/storage/SQL/MVCC/index/auth/session/decoder assertions. They do
not establish the real socket, TLS, client concurrency, backup operations or
rollback scenarios whose wrappers did not run. Earlier scoped checkpoint/WAL
receipts remain useful, but do not waive an incomplete whole-service gate.

Commercial acceptance still requires Native equivalents of every original
scenario, complete protocol/TLS/auth client execution, real sustained load,
commit-I/O uncertainty handling, writer ownership, safe generation reclamation
and disk bounds, recovery/backup rehearsals, reproducible artifact deployment,
observability, independent review and consistent supported-feature documents.
No production approval or commercial PASS is implied by 52 successful cases.
