# Native commit uncertainty and service health

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Host paths/owners: <가림>. All storage and accounts were synthetic and private.

A failed SQL commit could leave its provisional catalog visible while health
still reported success. A checkpoint error can also occur after the WAL commit
has reached the OS, so returning an ordinary rejection or silently retrying can
duplicate an operation. The TCP SQL path now reports `COMMIT_OUTCOME_UNKNOWN`
and closes access to the affected process until storage recovery in a fresh
process. This is a scoped safety change, not whole-service acceptance.

## Resulting behavior

- Autocommit and explicit transaction persistence/publication failures latch
  the first failure before attempting to restore the thirteen catalog,
  revision, row-version and cache domains and commit metrics. Restoration is
  best effort; its own failure cannot reopen access or hide the unknown outcome.
- Subsequent SQL reads, writes, prepared execution, transaction operations,
  the top-level `afj-tcp-write-catalog-pages` checkpoint operation and WAL
  append entry points reject `STORAGE_RECOVERY_REQUIRED`.
  Authentication errors retain precedence at public request boundaries.
  Calling live recovery cannot clear the latch. A fresh process must recover
  storage before serving again; this change supplies no automatic restart.
- Health becomes `ok:false`, `status:recovery-required`,
  `commit-outcome:unknown`, `retryable:false`, `restart-required:true`, with
  the failing phase. Metrics add `STORAGE_RECOVERY_REQUIRED`. Healthy response
  fields retain their existing values. Raw TCP transaction requests now catch
  these errors and return a protocol response, as query requests already did.
- Disconnect/expiry cleanup still removes sessions, transactions and local
  locks while quarantined. It does not call public rollback and imply that an
  uncertain disk commit was undone.
- Both encoded WAL records are size-checked before any append. Ordinary SQL
  validation and record-size rejection leave storage healthy. The v1 format,
  1,048,576-character record bound, 262,144-character SQL bound, unsynced
  prepare followed by synced commit, and file/parent-sync/close protocol remain
  unchanged. The exact preflight strings are persisted without re-encoding.
- Persistent in-memory snapshots retain the existing fast insert path without
  adding a whole-catalog JSON copy. No throughput improvement is claimed.

Low-level append errors still propagate directly without independently setting
the service latch. The high-level SQL commit path owns the outcome policy;
existing repeated-error descriptor contracts remain applicable.

## Before/after evidence

The DB base is `6fbd2f0208baf114349036a0ee5d94903ff41296`. The only source
edit is `src/tcp-server.fls`, SHA-256
`e153fb7f21830a69975bb177929cd28ea30f2b0cb5e0c99dd6fab3bb937a742c`.
Both sides use FX `d8dc4c63adcfe2ac3f7d7edf69f890407c2dd4da` and the accepted
relocated Native SDK: compiler `42fc8355bf76b8e3087d05bc1b9a63c0c3f0e102ed5331bea11bb86aae0b08aa`,
runtime archive `053971a3403cfdf0b1c15a0efa8e76a9eb5e5325df0fb4955279abe1bb6c6be4`.
Private diagnostic controllers use the same fixture bodies, assertions and
bounds on both sides. They do not replace protected repository tests.

| Cohort | Before | After | Observation bound |
|---|---|---|---|
| Natural WAL/checkpoint permission failures; autocommit and explicit commit | 7/28 | 28/28 | 20 s per process/control |
| SQL/duplicate/record-size negative controls and following valid commit | 10/12 | 12/12 | 20 s per process |
| 20 exact-file I/O fault scenarios | 82/220 | 220/220 | 20 s per process/control |
| Four real Native JSON TCP scenarios | 7/20 observed; all four fail | 32/32; all four finish | Startup 30 s; request/stop 3 s |
| Unchanged earlier WAL safety fixture/controller | Historical receipt | 25/25 | Original bounds retained |
| Unchanged Unicode/WAL position contracts | Historical receipt | 4/4 | Original bounds retained |
| Unchanged checkpoint generation fault/corruption contracts | Historical receipt | 15/15 | Original bounds retained |
| Unchanged durable WAL-tail checkpoint fault contracts | Historical receipt | 13/13 | Original bounds retained |

The socket baseline's two explicit-transaction flows abort on the original
uncaught error. Only twenty checks were reached; it is not a 32-check baseline
or a skipped-case PASS. The corrected service finishes all thirty-two checks.
The 349 after-controls are grouped assertions, not 349 independent deployment
scenarios or a whole DB pass. Results and source/fixture hashes are recorded in
[the scoped evidence](evidence/native-commit-health-20261120.json).

Faults cover prepare/commit write EIO, a real partial write followed by EIO,
prepare/commit close, and file/parent fsync failures before and after the actual
call, for both commit modes. The private C shim checks the exact owned WAL or
directory descriptor; its event log confirms that the requested fault occurred.
An independent WAL record-length/checksum oracle checks the acknowledged
prefix, complete commits and two fresh-process recoveries. Natural chmod
faults restore the original modes. Earlier descriptor tests retain their
96-iteration bounds and zero descriptor growth expectation.

Some before-fsync failures leave data in the running OS cache. Fresh-process
recovery in that same OS is an observation, not physical power-loss durability
certification. Restoring provisional memory also does not establish that the
failed operation is absent from disk. Clients must retain the unknown outcome
and reconcile it after recovery rather than retry it blindly.

The first new source/validation syntax attempts failed on missing delimiters;
they were corrected before product execution and retained privately. The first
old WAL-tail regression packaging omitted its imported oracle and failed
before any tail case ran. Copying that byte-identical dependency allowed the
same ELF, original controller, thirteen scenarios and bounds to run. The failed
setup and its logs remain separate; no data expectation was weakened.

## Remaining work

The latest whole diagnostic is separate from these scoped cohorts; see
[the complete Native release record](NATIVE-RELEASE-20261120.md). Its failed
legacy JS/shell/fixture cases remain failures. A full real concurrency, TLS,
standard-client and five-minute load qualification is still required.

This change does not supply a writer ownership lock, production storage-root
identity/initialization, safe generation reclamation, bounded disk usage, WAL
rotation, backup/restore operations, idempotent retry protocol or external
writer/power-loss guarantees. It covers the TCP SQL persistence path; other
storage engines/modules require their own qualification. No production
activation, customer data, seed/test replacement, dependency installation or
global service/configuration change was performed.
The guard is a TCP service/control contract, not a sandbox against trusted
FreeLang code directly calling lower-level page helpers or changing globals.
