# Native compatibility scorecard: current feature evidence

Case 28 now prints `afj-db95 compatibility target PASS=100%` and passes the
original Native worker. Only the MVCC and B+Tree `passed` literals changed,
after all eight designated original feature contracts passed on the current
product core. Weights, score arithmetic, the 95% target, existing output text,
eight feature-test inputs and original runners remain unchanged.

## Fresh feature contracts

The product core is commit `1e55d06`; base `adbe97e` adds diagnosis documents
only. Each case below runs its original input through the unchanged
`tests/native-release-gate.sh --worker`, including AOT generation, compilation
of the original 20 runtime C sources, linking and actual Native execution.
Each retains the original 120-second and 2GiB address-space limits. Runs are
serialized with `/tmp/fl-heavy.lock` in private PID/network/tmp namespaces.

| Feature | Case | Original input | Result | Seconds |
|---|---:|---|---|---:|
| B+Tree | 13 | `tests/persistent-btree.fls` | PASS | 24.296 |
| B+Tree | 14 | `tests/btree-range.fls` | PASS | 43.777 |
| MVCC | 17 | `tests/tcp-schema-mvcc.fls` | PASS | 80.952 |
| MVCC | 38 | `tests/tcp-mvcc-conflicts.fls` | PASS | 92.365 |
| MVCC | 39 | `tests/tcp-range-predicate.fls` | PASS | 87.041 |
| MVCC | 40 | `tests/mvcc-row-version.fls` | PASS | 19.060 |
| MVCC | 41 | `tests/tcp-row-version-recovery.fls` | PASS | 84.834 |
| MVCC | 42 | `tests/tcp-row-version-checkpoint.fls` | PASS | 82.718 |

B+Tree evidence covers recursive page persistence/reopen and bounded range
traversal. MVCC evidence covers schema merge, write conflicts, range predicate
conflicts, row-version core, WAL recovery and durable checkpoint recovery.
All eight original input hashes match the previously recorded original inputs;
their assertions and environment assignments are preserved. Each fresh trace
records zero Node-family execution/attempt and zero Python execution. The
private test controller outside those traces is recorded separately.

## Score transition and original case 28

The first fresh case-28 run retains the original scorecard SHA-256
`dd3fef7b37ac23ff843753fa0b7677350af1de346286111179763a9663caf078`:
baseline 88%, worker exit 1, `NATIVE_PASS_MARKER_MISSING`, 18.755 seconds.
It remains retained as a failure. The matrix had 17 literal entries; MVCC and
B+Tree were its only false entries, each weighted 6. There is no runtime
feature probe in that scorecard, so changes to unrelated core code cannot
update its literal flags.

After the eight current-source passes, the authorized edit sets only those two
flags true. The source SHA-256 is now
`19b87d622e3252ba723db20c31ed4b42a675ea403e1988652b91b91836b79b42`.
The unchanged formula gives `(88 + 6 + 6) / 100 * 100 = 100%`, above the unchanged
95% threshold. Original worker 28 then passes in 19.058 seconds under the same
120-second/2GiB bounds. No marker, compiler exception or weight change is added.

The complete 18,088-row WAL recovery 2/2 and earlier 349/349 regressions remain
archived; their product source hashes are unchanged. Those regressions were
not rerun for this metadata-only edit. Case 24 diagnosis remains preserved.
The entire 71-case gate was not rerun, so its historical 52/19 summary is not
updated from these scoped checks. The internal feature score does not establish
comprehensive external MariaDB compatibility; commercial HOLD and deployment
NO remain unchanged.

[Machine-readable results, original input hashes and trace/log hashes](evidence/native-compatibility-scorecard-20261121.json)
record the failed baseline, eight fresh feature passes, exact two-literal edit,
and actual case-28 PASS.
