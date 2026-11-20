# Native complete WAL replay qualification

SCOPED_REPLAY=PASS; ORIGINAL_DIAGNOSTIC=52_PASS_19_FAIL;
COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The qualified change replaces the replay cursor and single-column index
construction loops with direct conditional self tail calls. The Native
trampoline releases each step's temporary arena. Record validation, ordering,
torn-final-record rules and ordered index buckets stay unchanged. Generated C
contains real `fl_v11_tail_call` sites for both functions. Unique and primary
key checks use an optional generic scalar field predicate; a real runtime
probe and `nil` result retain the original callback fallback. No SQL policy,
constraint bypass or capability flag is added to the C runtime.

Six fresh Native processes recover all rows of three unchanged real load WALs:
16,224 rows twice, the original 14,664 rows twice, and the retained 13,424 rows
twice. Each process retains the 120-second runtime and 2 GiB address-space
limits. Every raw string ID and name, row count, commit revision, raw pair
digest and separately normalized numeric pair digest matches an independent
disk-record oracle. Stored SQL IDs remain strings. WALs, source and SDK remain
unchanged; the six runtime traces contain zero Node-family/Python executions.
Queue-inclusive observation time is separate from the Native runtime limit.

The current eight-client concurrency case also passes. A separate full
300,000 ms load writes 16,224 rows in 300,195 ms, with p95 167 ms and maximum
273 ms, retaining the original 15,000/20,000 ms thresholds. Each public service
host trace contains 69 fully decoded execve calls and zero Node-family/Python
executions. Different recorded throughput cohorts are not a controlled speedup
comparison. Fresh AOT preparation and runtime remain separate stages.

The same candidate passes 57 existing WAL/Unicode/checkpoint regressions,
292 existing commit-health checks, and the original 3,200-record traversal's
five assertions. The unchanged original 71-case diagnostic still reports
52 PASS / 19 FAIL, with zero timeouts/skips. Those failures, original test
files/runners/expected outputs/bounds and earlier setup failures are retained.

The first current 16,224-row verifier exited 139 after recovery while building
a quadratic immutable `range`. Its 2,105,875,200-byte vector-prefix lower bound
alone exceeds the process cap. The exact fault stack was not measured. The
qualified reader changes only iteration to a numeric loop over every index;
it retains all raw type/value/name checks and both full-data digests. The
runtime's general `range` implementation is unchanged by this commit. The
first verifier failure is retained, rather than relabeled as a pass.

`tests/native-service-cold-reader.fls` is the byte-identical qualified reader.
Use an already installed matching Native SDK to compile it through the normal
parse, Native C generation and runtime-link steps. It reads `AFJ_DB_WAL`,
`AFJ_EXPECTED_ROWS`, `AFJ_EXPECTED_RAW_DIGEST` and `AFJ_EXPECTED_DIGEST`; configure
the normal synthetic development/bind/file permissions for an isolated run.
Expected values must come from an independent complete WAL oracle. Run each
fresh executable under the existing 120-second/2 GiB limits and host heavy
lock; do not regenerate or truncate a WAL to fit the test.

The matched SDK also passes 11 original FX goldens, the 24 predicate cases,
80 tracked frontend/common checks and 89 checks including preserved foreign
frontend files. The independent accepted SDK produces exactly the same 4,381
warning bytes. All 46 original default development/literal-path/guard controls
pass at unchanged limits. Fresh standard MariaDB SQL requests return exact
`1\tKim\n`. A fresh actual app release builds within 300 seconds, verifies
after relocation, and passes 20 desktop DOM/console/real local Git controls
at 1280x900, including actual Stage and Commit. Screenshots, mobile viewports,
physical-pointer interaction, remote providers and production activation were
not exercised. The separate repository-basename-LF API failures remain open.

Detailed source/runtime/SDK identities, complete-data digests, per-cohort
receipts and execution audits are in
[`evidence/native-replay-tail-20261121.json`](evidence/native-replay-tail-20261121.json).
Writer ownership, storage-root identity, safe generation collection, disk
bounds and WAL rotation, complete Native protocol/TLS/auth clients, operational
backup/restore, deployment rehearsal and independent review remain open. These
synthetic loopback proofs establish no physical power-loss or whole-commercial
acceptance.
