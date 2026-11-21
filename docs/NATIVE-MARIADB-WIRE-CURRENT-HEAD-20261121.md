# Current-head Native MariaDB wire login and query

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

One unchanged execution of the existing
[FL controller](../tests/native-mariadb/control.fls) and
[fixed process host](../tests/native-mariadb/run-case.sh) passes 1/1 on HEAD
`aeacd97c4f1dd21c7f3e1e35d2717b7e5ce625e5`. No new test or product implementation was written.

The original case 68 contract uses the same Native MariaDB daemon, standard
client, CREATE TABLE, INSERT `(1,'Kim')` and SELECT. Its exact expected output
`1\tKim\n` is identical to the existing FL controller's assertion. The FL host
keeps the original protocol, account and client options plus its existing
`--no-defaults`. The captured three argv records and zero exit statuses were
checked independently; SELECT remains hex `31094b696d0a`.

Both daemon and controller were freshly parsed, generated and linked with the
unchanged matching SDK. The existing 120-second envelope includes both AOTs
and runtime under 2GiB. Startup's 60-second deadline still begins before AOT;
port retry and client connect bounds remain unchanged. The outer observation,
including any lock queue and before/after SDK checks, took 35.512636 seconds.
The public host owns the shared heavy flock. One trial ran, with no retry.

All 425 frozen files and SDK bytes remained unchanged. The 150 exec attempts
have decoded terminal statuses, with 63 successful executions including
four compiler, two GCC, six control, one daemon and three standard-client
executions. Node-family attempts/executions and product-trace Python executions
are zero. One private Python qualifier is outside the product trace.
Requests, readiness and exact result/status policy remain FreeLang.

The [scoped receipt](evidence/native-mariadb-wire-current-head-20261121.json)
records the contract comparison, source, binary, toolchain and trace hashes.
Original JS case 68 and both protected gate runners remain unchanged; original
68 FAIL is preserved. This existing Native case is not a JS port or original
gate promotion. Cases 64 and 66 were not run. Existing authentication-rejection,
prepared, standard-client, peer-budget, kill/re-login, WAL and 349/349 evidence
is preserved. The old regression suite and whole gate were not rerun for this
evidence-only archive. Parser, compiler, runtime, daemon and TLS code stayed
unchanged.
