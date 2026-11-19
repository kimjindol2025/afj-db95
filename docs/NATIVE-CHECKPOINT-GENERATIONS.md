# Native checkpoint generations (developing)

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Host paths/owners: <가림>. No customer database or service was connected.

This change removes the known in-place checkpoint truncation window. Table
pages are written into new exclusive generation files; the active manifest
is published only after all referenced pages and their directory entries
have been synced. Existing tests and corruption rejection remain intact.
It does not make the whole database commercially ready or repair existing
corrupt legacy checkpoints automatically.

## Storage protocol

1. Generate a 96-bit random checkpoint identifier. Each materialized table
   receives a new hashed-table/generation filename. fd_create uses O_EXCL,
   so a collision fails instead of overwriting a live generation. Existing
   lazy placeholders continue referencing their already-persisted pages.
2. Write the unchanged checksummed page-set format through one descriptor,
   fsync the file, sync its retained parent, then close. Propagate the first
   I/O error, also closing the descriptor on failure. Previously published
   table files are never rewritten by this checkpoint protocol.
3. If a previously accepted manifest exists, atomically publish its metadata
   into the previous-manifest file in the catalog directory. Its name is
   .afj-previous-<SHA256 of configured catalog path>.pages. Referenced old
   table generations remain present.
4. Write the new version-2 manifest into a private same-directory candidate.
   Publish it using fd_publish: candidate fsync, renameat, directory fsync.
   Only then update the in-memory checkpoint path/manifest bookkeeping.
   An after-rename sync error is reported as an uncertain publication;
   it is not converted to success or rolled back by overwriting the target.

Candidate names use .afj-checkpoint-<identifier>.new in the target directory,
independent of the destination basename length. Completed manifests retain
the existing version-2 tables/index/WAL-prefix/revision fields and add the
checkpoint identifier. The page resolver returns current generation paths,
including for an independent reader before full recovery. Legacy path and
version-1 reading behavior remains available. The strict recovery function
continues rejecting corrupt manifests/pages; no catch-all reset or silent
WAL fallback was introduced.

The host boundary is fd-publish in FX commit
4fa975b2390db7773997b1853f225f8de6085d37. Use its matching Native compiler and
runtime, not an older runtime that lacks the operation. The compiler ELF SHA
used here is e28b5062811fe1d65125e4d37f77b3f791fca85586fd2985c84d5ef1ceb39c5c.
No JS/Node build stage or authored JS is added.

## Evidence

Private receipt: native-db-generation.7e2bwpjn. Base DB HEAD:
1b208c8e8bf400ac7ee24e80d3c217f715ea707f, isolated branch
codex/native-db-commercial. The original dirty checkout and its reports/
tests are preserved. The existing checkpoint fault fixture was copied
byte-identically into the private diagnostic directory; repository tests,
expected values, protected runners and their limits were not edited.

| Verification | Result |
|---|---|
| Strict Native source parse / C generation / link | Exit 0 |
| Same-state checkpoint contracts | 15 PASS: normal publication, 12 injected faults, 2 deliberate corruptions |
| New durable WAL-tail contracts | 13 PASS: normal update plus the same 12 checkpoint fault points |
| Existing Native gate worker Case 11 | Catalog/page-pool/index/WAL-tail/corruption contract, exit 0 |
| Existing Native gate worker Case 12 | Lazy catalog/eviction contract, exit 0 |
| Existing Native gate worker Case 42 | Durable row-version checkpoint contract, exit 0 |
| Existing db95-191-checkpoint.fls | Separate write/read processes exit 0; old=10, current=20, chain=2 |
| Protected worker timeout | Unchanged 120 seconds per case |
| Old generation and WAL during same-state checkpoint faults | Byte-identical; acknowledged revision 2 preserved |
| Current versus previous manifest | Previous bytes match the formerly active manifest |
| Collected boundary/checkpoint/public/worker traces | Node executions 0; outbound connect calls 0 |
| New authored JS / JS line growth | 0 / 0 |
| Full Native 71-case gate / production-mode service acceptance | NOT_RUN |

The 12 checkpoint fault points are successful table creation, real partial
table write, completed table write, write ENOSPC, table fsync EIO, completed
table fsync, table-parent sync EIO, completed previous-manifest rename,
real partial active-manifest candidate write, active rename EACCES,
completed active rename, and active-directory fsync EIO. SIGKILL is sent
only to the owned fixture process after the actual marked operation.
Controlled I/O injection returns -1 with ENOSPC/EIO/EACCES. It does not
fabricate success or claim a physical disk-full/device failure.

In the same-state matrix, each fixture first commits and logs ACK revision 2.
Every faulted writer exits 137 (SIGKILL) or 1 (I/O error), prints no completion
marker, and retains that committed row. Each result is recovered in two
separate new processes. An independent byte/page-envelope/checksum/manifest
oracle checks the stored files in addition to FreeLang assertions.

The WAL-tail matrix commits an actual update through the database API before
injecting the checkpoint fault. Its commit record is fsynced before that
fault; no revision-3 ACK is claimed on error. Recovery must restore revision 3
exactly once, preserve the revision-2 historical value, retain a history chain
of two and leave the WAL unchanged across two new-process recoveries. Before
active rename, the disk checkpoint remains revision 2 and valid WAL replay
supplies revision 3. After active rename it is a complete revision-3 snapshot.
Independent checks validate actual prepare/commit checksums and continuity
with the prior acknowledged WAL bytes. The original protected corruption
expectation is preserved: explicit manifest/page damage still exits 1 with
CATALOG_PAGE_CORRUPT, even if a previous manifest exists.

## Limits and next work

This is a single-writer, development-mode synthetic storage result. Current
Native raw TCP callbacks run on their caller event loop, and these checkpoint
calls do not dispatch another callback; that is not a multi-process ownership
lock or a proof for arbitrary concurrent callers. Production authentication,
TLS, backup/restore policy, concurrent/long service load and operational
procedures are outside this receipt. SIGKILL is not power-loss certification.

Old generations and failed candidates are deliberately retained. Safe
collection must account for current/previous manifests and live lazy/MVCC
readers before deleting anything. Disk usage is not bounded by this change;
there is no automatic GC, WAL truncation or rotation. This must be resolved
before deployment.

The follow-up in NATIVE-WAL-SAFETY.md now verifies WAL parent-directory sync,
error-path closing, rejection of a missing/replaced WAL beside a checkpoint,
and preservation of pre-recovery state on failure. Explicit safe recovery of
already-corrupt legacy data and process ownership remain open. A checkpoint error can occur
after the WAL transaction is durable but before a client ACK; the protocol
must report/handle that uncertainty rather than encourage blind retries.

The historical full Native gate was 51 PASS / 20 FAIL at the original source.
The latest whole Native diagnostic is 52 PASS / 19 FAIL against DB ed908d2;
see NATIVE-RELEASE-20261120.md for the different SDK/environment and all failures.
These totals are not an identical-environment before/after comparison. Unported JS/shell scenarios remain
failures, not accepted omissions. No actual service was started, and no
commercial readiness, complete recovery matrix or whole-language completion
is claimed. Download/install/sudo, seed changes, global configuration,
deployment and other-server work were not performed.
