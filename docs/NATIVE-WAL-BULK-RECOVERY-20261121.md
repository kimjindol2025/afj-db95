# Complete 18,088-row Native WAL recovery

The observed full-WAL reader exceeded its unchanged 120-second bound twice.
Timestamp-only diagnosis reached the final index rebuild about 101.5 seconds
after recovery began. Replay maintained every derived INSERT index, then
recovery rebuilt all indexes again.

Full recovery now uses an internal append path that retains the original row,
schema, uniqueness and foreign-key validation. It defers derived INSERT index
maintenance across contiguous inserts. Before any other AST it flushes pending
indexes, and it still performs the complete canonical index rebuild at the end.
The ordinary INSERT executor and direct replay functions remain byte-identical.
Record order, checksums, commit revisions, row-version history and rollback on
recovery error retain their existing paths.

The change is limited to `src/engine.fls` and `src/tcp-server.fls`. It is based
on accepted commit 55a3a006 and excludes the unrelated private UTF-8 wire patch.
No original fixture, runner, expected value, data count or runtime bound changes.

## Verification

- Two fresh Native processes recover all 18,088 rows in 100.663s and 95.144s.
- Each keeps the original 120-second and 2GiB address-space limits. AOT is a
  separate preparation step, as in the original cold-reader profile.
- Every stored string ID and name, revision 18,089, the complete raw-pairs
  digest and the complete numeric-canonical digest match an independent WAL
  oracle. Loss and duplicate counts are both zero. WAL bytes remain unchanged.
- Existing WAL/Unicode/checkpoint/tail regressions: 57/57.
- Existing natural/validation/fault/socket health regressions: 292/292.
- Existing original fixture bodies, controllers, assertions and bounds remain
  byte-identical. Eight private Python controllers are explicitly accounted for;
  product compiler/runtime traces contain no Node-family execution or attempt.

`tests/native-load-recovery-range.fls` is a byte-identical public copy of the
frozen schema 2 reader used for both runs. It retains `(range 0 expected-count)`
and every original all-row assertion. Activate the matching Native SDK, compile
this source with its static runtime archive, then supply `AFJ_DB_WAL`,
`AFJ_EXPECTED_ROWS`, `AFJ_EXPECTED_RAW_DIGEST` and `AFJ_EXPECTED_DIGEST` from an
independent complete-record oracle. Run each fresh reader under
`ulimit -v 2097152` and `timeout --foreground 120s`. Serialize heavy preparation
and runs with the existing `flock -o /tmp/fl-heavy.lock`; do not regenerate or
truncate the input WAL.

The observed prior timeout profile, failed first refactor and timestamp-only
diagnostic remain retained as failures. The prior profile carried an unrelated
private wire change, so these timings are observations, not a controlled speed
ratio. Full manifests, hashes and scoped results are in
`docs/evidence/native-wal-bulk-recovery-20261121.json`.
