# Native WAL safety (developing)

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Host paths/owners: <가림>. Only private synthetic storage was used.

Recovery previously returned success with an empty catalog if an existing
checkpoint's WAL disappeared. A truncated prefix silently lost the last
acknowledged row; replacing the WAL with another valid database history was
also accepted. Repeated write/fsync errors leaked an OS descriptor per failed
append. Native before/after execution now demonstrates rejection, recovery
rollback and descriptor cleanup.

## Changes

- New WAL files use exclusive fd_create (mode 0600). Existing WAL files use
  fd_open_with_parent in append mode; their permissions are not rewritten.
  A synchronous append completes file fsync and parent-directory fsync before
  returning. Preparing a transaction remains explicitly unsynced; the commit
  append syncs the whole preceding sequence and its directory entry.
- Append errors close the descriptor and preserve the first error even when
  close also fails. Close errors on an otherwise successful path propagate.
- Optional storage reads distinguish actual NOT_FOUND from access/policy/I/O
  errors. WAL, manifest and referenced page reads no longer treat a rejected
  symlink as an absent file through file_exists=false. Manifest absence is
  handled separately from a referenced table's missing/corrupt page.
- A checkpoint's WAL position must be a nonnegative integer within the WAL,
  end at a record boundary and match the prefix hash. A missing, short,
  replaced or invalid prefix raises the existing WAL_CORRUPT error; it cannot
  discard that checkpoint and become a fresh database. There is no WAL
  truncation/rotation protocol authorizing a prefix mismatch here.
- Recovery snapshots thirteen logical state/cache domains and restores them
  on failure, including after a valid WAL tail was partly applied. It then
  rethrows the error. This requires serialized access; it does not create a
  multi-process or arbitrary-concurrent-caller isolation mechanism.

The v1 WAL and v2 checkpoint formats, intentional torn-final-record handling,
SQL assertions and existing test/runner limits are unchanged. Missing both
files still permits a fresh development store; production root identity and
explicit initialization remain separate work.

## Native evidence

Private receipt: native-db-wal.nrizo_40. The same private Native driver and
contract expectations are used before and after the edit. Baseline v2 is
3 PASS / 22 FAIL; the final implementation is 25/25 PASS.

| Contract | Before | After |
|---|---|---|
| Missing/empty WAL beside checkpoint | Exit 0, success with revision 0 | Exit 1, WAL_CORRUPT |
| WAL shorter than acknowledged checkpoint | Exit 0, revision 1 instead of 2 | Exit 1, WAL_CORRUPT |
| Valid foreign WAL / invalid checkpoint position/hash | Accepted | Rejected |
| WAL/manifest symlink | Ignored as absent | PATH_OR_ACCESS_DENIED |
| Failed live recovery | Reset or partially changed state | Error and exact pre-call state/cache digest retained |
| 96 repeated write/write-zero/file-sync failures | Descriptor delta +96 | Delta 0; all errors propagated |
| Parent sync failure | Operation not attempted; success returned | All 96 errors propagated; delta 0 |
| Close failure / combined write+close failure | Close error propagated / write-path leak | Errors propagated, first write cause retained, delta 0 |
| Normal/EINTR/partial append; new-file mode | Payload valid but mode 0644 in this environment | Payload valid, mode 0600 |
| Fresh empty store / ordinary checkpoint recovery | PASS | PASS |

The first diagnostic used a startswith test that rejected Native diagnostic
frame prefixes such as [fd_close]. It initially counted 23 failures, including
a correct close-error result. Before editing the product, the classifier was
corrected to extract the same exact failing fd operation; all resource,
success/error and data expectations stayed unchanged. Both logs/controllers
are preserved. Baseline v2 and the final run use that same corrected
controller. Existing repository tests and expectations were never edited.

The repeated-error probes pause only their owned process while an external
observer counts OS descriptors. Controlled EIO/zero-write/close faults are
isolated to the fixture WAL; they are not a claim about a physical device
failure. New files measured mode 0600 in the tested environment; existing
file permissions are not rewritten.

Scoped results and a separately identified latest whole diagnostic:

| Check | Result |
|---|---|
| Unicode checkpoint/WAL tail | 4 contracts; quotes, backslash, LF, <>&, Korean and emoji; value UTF-8 differences 0 |
| UTF-16 WAL positions versus physical UTF-8 bytes | Correct replay through checkpoint revision 2 plus durable tail 3; repeated data digest equal, WAL unchanged |
| Previous checkpoint fault/regression cohort | Same unmodified private fixtures: 15 same-state + 13 WAL-tail contracts PASS |
| Original protected Native workers | Cases 11/12/41/42 exit 0; unchanged 120-second bound |
| Existing independent checkpoint writer/reader | Both exit 0; old=10, current=20, history chain=2 |
| Existing silent TCP 3,200-record fixture | Exit 0; five original PASS markers, count/hash unchanged; 360-second original diagnostic bound |
| Node executions / outbound connect calls in collected traces | 0 / 0 |
| Existing tests/protected gate/seed / authored JS | Unchanged / 0 new JS |
| Latest full Native 71-case diagnostic (separate SDK/profile) | 52 PASS / 19 FAIL; [source/profile and all failures](NATIVE-RELEASE-20261120.md) |
| Real service sustained-load acceptance | Separate prebuilt Native 8-client five-minute runtime passes; actual14,664-row cold recovery FAIL; originalCase25 unchangedFAIL; [scope](NATIVE-SERVICE-LOAD.md) |

The 3,200-record fixture initially failed on the existing Native runtime's
missing str_join_lines function. That language operation is now implemented
from its inspected reference and passes 24 public contracts. The old fixture
was not rewritten around it. FX source commit:
4dee8bca2430846e6cc524ff56f9bc237be9cfbc. Current compiler ELF SHA-256:
eb23e2039163794c641d2f3f3f076ddf5cd3e3d6bff5800216ab638e39d2361b.
Fresh Stage2=3=4 and the core suites pass; the generation-time observation
in that receipt had a 42.36-second miss. Later FX SDK evidence in NATIVE-SSE.md
passes both generations at 29.51/29.40 seconds. This historical timing is not the
current whole DB release result; see NATIVE-RELEASE-20261120.md.

## Remaining commercial gates

This does not provide a process ownership lock, safe generation collection,
WAL rotation, a production storage-root identity/initialization protocol,
automatic repair of already-corrupt legacy storage, full backup/restore or
power-loss certification. Generations and failed candidates are retained;
disk usage remains unbounded. Concurrency, sustained service load, production
security/operations and the full Native suite remain unaccepted.

The subsequent [Native commit-health change](NATIVE-COMMIT-HEALTH.md) now
quarantines the TCP SQL process after uncertain commit/publication failures,
reports COMMIT_OUTCOME_UNKNOWN and rejects later access until fresh-process
recovery. It passes 292 new scoped controls plus 57 unchanged WAL, Unicode and
checkpoint regression controls. This original low-level receipt alone did not
establish that behavior; the follow-up records its own source and before/after
evidence. An uncertain write must still be reconciled rather than blindly
retried. Other standalone storage/WAL modules are outside this TCP-WAL edit
and need their own audit. No customer DB,
service/deployment, package install, seed regeneration or global configuration
change was performed.
