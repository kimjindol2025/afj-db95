# Latest whole Native release diagnostic — 2026-11-20

STATUS=FAIL; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Paths/owners: <가림>. Only isolated source copies and synthetic storage were used.

The unchanged original Native diagnostic completed all 71 release cases:
**52 PASS / 19 FAIL / 0 TIMEOUT / 0 SKIP**, process exit 1. This is the latest
whole diagnostic on the commit-uncertainty change below. All nineteen failures
remain failures. Scoped safety controls do not waive them.

This diagnostic rejects unported JS clients and requires PASS text from
executable cases, so it is not equivalent to the historical Node exit-only
gate. Original case lists, fixture bytes, assertions, targets and 120/360-second
bounds were preserved. There were no skipped cases or added PASS markers.

## Exact source and execution profile

- DB base: `6fbd2f0208baf114349036a0ee5d94903ff41296`, plus only
  `src/tcp-server.fls`, SHA-256
  `e153fb7f21830a69975bb177929cd28ea30f2b0cb5e0c99dd6fab3bb937a742c`.
- FX: `d8dc4c63adcfe2ac3f7d7edf69f890407c2dd4da`.
- Accepted relocated compiler ELF SHA-256:
  `42fc8355bf76b8e3087d05bc1b9a63c0c3f0e102ed5331bea11bb86aae0b08aa`.
- SDK manifest SHA-256:
  `e1f22e75e3a25b662411dc42d23e47049c31c0f5b80a75e4d3b4d75ee8708181`.
- SDK runtime archive SHA-256:
  `053971a3403cfdf0b1c15a0efa8e76a9eb5e5325df0fb4955279abe1bb6c6be4`.
  The unchanged whole-gate worker links its original twenty current FX C
  runtime sources directly. It does **not** link that SDK archive; separate
  commit-health probes do. Matching curl headers/library were supplied.
- [All 71 cases, protected hashes and execution evidence](evidence/native-release-current-20261120/results.json).
- [Unmodified diagnostic stdout](evidence/native-release-current-20261120/gate.txt).

Both frozen tracked source inventories were checked unchanged after execution;
SDK verification passed before and after. Compiler/runtime bytes were reused
from the accepted SDK. This DB run is not a new compiler bootstrap claim.
No seed generation, install or source/test replacement was performed.

The full run held the shared heavy-work lock with the unchanged 2 GiB address
space cap. Existing bwrap supplied private PID and loopback network namespaces
and a private /tmp. Host files were read-only except owned run artifacts.
The outer Native compile PATH included `ln`, and all 33 original worker-safe
commands were confirmed available (32 external symlinks plus Bash builtin
`pwd`). Shell cases 9/34/59 actually reached unavailable
Node, rather than failing PATH initialization.

The collected gate and separate traversal traces contain 3387 decoded execve
calls; all terminal statuses were parsed, including 2 resumed execs.
Successful Node-family/Python/alternate-runner executions in those traces are
zero. This does not describe private Python diagnostic orchestration outside
the product traces or prove arbitrary external-process behavior.

## Every failing case

| Case | Original label | Observed classification |
|---|---|---|
| 9 | local canary rollback | Original shell reaches unavailable Node |
| 24 | TCP concurrency | Original JS client not ported |
| 25 | TCP 5m performance envelope | Protected unclosed delimiter rejected before workload |
| 28 | compatibility scorecard | Unchanged static compatibility baseline88%; target95% not established |
| 30 | MariaDB remediation regression | C10 parent-path restriction after preceding SQL checks passed |
| 34 | forced-kill WAL recovery | Original shell reaches unavailable Node |
| 35 | TCP transaction forced-kill recovery | Original JS client not ported |
| 56 | runtime peer IP rate limit | Original JS client not ported |
| 59 | production TLS boundary | Original shell reaches unavailable Node |
| 60 | native TLS listener | Original JS client not ported |
| 61 | native TLS mTLS/reload | Original JS client not ported |
| 62 | production native TLS integration | Original JS client not ported |
| 63 | TLS adapter handshake/reload | Original JS client not ported |
| 64 | MariaDB wire packet unit | Original JS client not ported |
| 66 | MariaDB wire prepared | Original JS client not ported |
| 67 | MariaDB standard-client smoke | Original JS client not ported |
| 68 | native MariaDB wire | Original JS client not ported |
| 69 | native MariaDB auth rejection | Original JS client not ported |
| 71 | native MariaDB prepared | Original JS client not ported |

The nineteen rows comprise thirteen unported JS clients, three original shell
paths still requiring Node and three different limitations:

- Case 25 has an unclosed delimiter beginning at line 29 and reaching EOF at
  line 168. The accepted strict compiler rejects it before the five-minute
  workload. Its protected source hash and runner limits are unchanged. Earlier
  permissive-compiler/path controls are historical failures, not load acceptance.
  No raw retry or repaired copy is counted as a pass of this protected fixture.
- Case 28 exits zero and prints a static legacy compatibility baseline of 88%.
  Its existing metadata marks MVCC and B+Tree false; target PASS prints only
  at 95% or above. Flags, weights, target and PASS-marker policy were not changed.
  This observation does not measure current comprehensive SQL compatibility or
  establish the target. A zero process exit does not pass this diagnostic.
- Case 30 passes preceding SQL semantic checks, then writes
  `../docs/remediation-recovery-path.txt`. C10 rejects every `..` component
  with `PATH_OR_ACCESS_DENIED`. Its file-policy boundary and original artifact
  assertion remain intact; the integration path still needs resolution.

## Separate safety evidence

[Commit health](NATIVE-COMMIT-HEALTH.md) records the one-source-file correction:
initial persistence/publication uncertainty returns `COMMIT_OUTCOME_UNKNOWN`,
health becomes unready and later DB operations require fresh-process recovery.
Before/after natural I/O, precise write/sync/close, validation and real TCP
controls pass 292/292 after; the same historical WAL/Unicode/checkpoint/tail
fixtures pass another 57/57. These 349 grouped controls are not 349 independent
production scenarios. Same-OS recovery is not physical power-loss certification.

A separate unchanged 3,200-record WAL traversal/corruption fixture completed
its five original PASS markers within its 360-second bound, with the before/
after row count and hash equal. It pads prepare records and commits two ASTs;
it is not a throughput test or five minutes of service load.

## Retained history and profile limitation

The earlier [historical whole result](evidence/native-release-20261120/results.json)
was 52/19 on DB ed908d2 / FX 085c8c2 and an older SDK. Its earlier path-only
soak control timed out and does not establish sustained load. Accepted compiler
delimiter checking now rejects the malformed source before code generation.

The immediate pre-change run on DB 6fbd2f0 / FX d8dc4c6 also recorded raw 52/19,
but its private outer compile PATH accidentally omitted `ln`. Worker-safe PATH
symlinks were not created, so three shell workers failed setup before reaching
Node. That raw run and the separate corrected three-worker controls are
[preserved as distinct evidence](evidence/native-release-baseline-20261120.json).
They are not merged into a fictitious single-profile qualification. The latest
after-change run above fixes that private setup and executes all 71 cases.
Equal totals across these profiles are not an identical-environment before/
after improvement claim.

## Collector-only recovery

The original whole run finished52/19 and verified source/SDK preservation,
then its private collector failed because it expected33 external symlinks.
The unchanged original runner intentionally resolves `pwd` as a Bash builtin;
its worker PATH has32 external tools plus that builtin. All33commands were
independently confirmed available. The collector was corrected to verify
that exact contract; no running profile or original case was changed or
rerun. Its first failure/status and corrected receipt are retained. Two
additional private Native client probes stopped at their prerequisite guard
before any build/workload began; their first setup failures are separate.

## Remaining commercial gates

Subsequent [separate Native service cases](NATIVE-SERVICE-LOAD.md) establish
eight-client plaintext concurrency and a prebuilt five-minute runtime cohort.
The first fresh-build-plus-load360 attempt timed out. Two fresh Native
recoveries of the actual 14,664-row WAL fail allocation at the unchanged2GiB
cap while an independent disk oracle validates all committed rows/checksums.
This is an additional release blocker, not a changed row or pass in the
original71 diagnostic above.

Native equivalents of every original real protocol/TLS/auth/client scenario,
complete service-load/recovery qualification, writer ownership, production storage-root
identity, safe generation reclamation, bounded disk usage and WAL rotation,
consistent backup/restore and deployment rehearsals, observability and
independent review remain required. Other standalone storage engines/modules
are outside the TCP SQL commit-health change. Successful language/SQL/storage
assertions and low-level backup fixtures do not substitute for those service
and operational gates. No production approval is implied.
