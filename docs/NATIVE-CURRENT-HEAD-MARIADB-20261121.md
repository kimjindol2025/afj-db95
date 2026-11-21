# Current-head Native standard MariaDB client

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

One unchanged execution of the existing
[FreeLang controller](../tests/native-mariadb/control.fls) and
[fixed process host](../tests/native-mariadb/run-case.sh) passes 1/1 on product
HEAD `8f82b8f8ce96244f3ae856679316d5feacf426a9`.
No new test or product implementation was written for this observation.

The installed standard `mariadb` ELF connects over isolated loopback TCP using
the fixture's synthetic account. Its three processes authenticate and execute
CREATE TABLE, INSERT `(1,'Kim')`, then SELECT. Each exits zero; SELECT returns
exactly `1\tKim\n` (hex `31094b696d0a`). The captured NUL argv records retain
the original SQL, `--no-defaults`, five-second connect limit and `--skip-ssl`.
This is the existing plaintext standard-client contract.

Both daemon and control binaries were freshly generated and linked with the
unchanged matching SDK. The existing 120-second envelope and 2GiB limit remain;
startup's 60-second deadline still begins before AOT. The outer observation,
including any lock queue and before/after SDK checks, took 36.005957 seconds.
The existing shared flock serialized the single trial. No retry was made.

Readiness, protocol argv and exact output/status checks remain in FreeLang;
the unchanged Bash host manages fixed argv, files and owned process lifetimes.
All 150 exec attempts have decoded terminal statuses, with 63 successful
executions, including four compiler, two GCC, one daemon, six control and three
standard-client executions. Node-family attempts/executions and product-trace
Python executions are zero. One private Python qualifier is outside that trace.
All 417 frozen source files and SDK bytes remained unchanged.

The [scoped receipt](evidence/native-current-head-mariadb-20261121.json) records
source, toolchain, binary and trace hashes. Original 67 JavaScript and the
protected 71-case runners remain unchanged; original 67 FAIL is preserved.
The shared-peer and kill/re-login commits, WAL recovery and 349/349 regression
evidence are retained. The old regression suite and whole gate were not rerun
for this evidence-only archive.
