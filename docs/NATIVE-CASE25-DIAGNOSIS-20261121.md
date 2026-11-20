# Case 25: protected FL parser failure and workload coverage

Original case 25 fails while parsing the protected FreeLang fixture, before
its daemon or workload can execute. The source has one unmatched opening
parenthesis. This is an input-structure failure, with no demonstrated missing
FreeLang runtime feature and no measured live-store load failure in this run.

This diagnosis preserves the original source, all assertions/expected values,
300,000 ms duration, latency thresholds and gate mapping. No implementation or
parser change is made.

## Actual Native path and fresh first failure

The release gate maps case 25 to `tests/tcp-long-soak.js`. Its unchanged Native
worker first substitutes `tests/tcp-long-soak.fls` when that file exists. The
fresh exec trace confirms that FL file is passed to `flc`; the JS-unported
branch is not reached and no `NATIVE_JS_SOURCE_NOT_PORTED` marker is printed.

The protected FL SHA-256 remains
`5990030fce1a718bc37828f0a5f625e45cba4b86e2d3ba66a4acbf4b199d079a`.
Current base `1fd5e4c` reproduces 0 PASS / 1 FAIL, exit 1, in 0.430 seconds,
under the unchanged 360-second/2GiB original worker envelope. The first error is
`E_PARSE_UNEXPECTED_TOKEN: expected ) before EOF at line 167, col 31`.
A separate static delimiter scan respecting comments, strings and escapes
leaves one `(` opened at line 29, column 1, the outer `try` form; it finds no
mismatched closer or unterminated string. This is structural evidence of the
same input failure, without an edited or repaired copy.

The trace records zero GCC execution, zero workload ELF execution and zero
Node-family/Python execution or attempt. The load has not been reached.
The private Python diagnostic controller is outside that Native trace and is
explicitly counted. The original case's FAIL is retained.

## Existing separate five-minute Native evidence

The previously completed service cohort reports 1/1 PASS: eight clients,
300,190 ms elapsed for a 300,000 ms workload, 18,088 successful writes, p95
143 ms and maximum 236 ms. Its existing client/daemon/host bytes still match
the current files. The comparison is:

| Requirement | Protected case-25 body | Existing separate Native workload |
|---|---|---|
| Connections/login | Eight independent clients and successful login | Same |
| Writes/schema | Same `soak_users` schema; eight parallel INSERTs per batch | Same; 18,088 acknowledged writes |
| Read checks | Last-ID SELECT after ten batches and at end, exactly one row | Same |
| Duration/minimum | 300,000 ms, at least eight writes | Same bounds |
| Request/max/p95 | 20,000 / 20,000 / 15,000 ms | Same bounds |
| Percentile | All observations, `floor((N-1)*0.95)` | Exact-multiplicity histogram, same statistic; eight reference controls |
| Readiness | Marker 60 seconds, port 30 seconds | Same |
| Rate configuration | 10,000 requests per 60,000 ms window | Same |
| Build/envelope | Original 360 seconds includes outer and child-daemon AOT | Build recorded separately; 360-second runtime |
| Cleanup | Close sockets/process and delete synthetic directory | Close owned sockets/process; retain artifacts/WAL |

That workload cohort used the earlier private UTF-8 wire candidate, module
SHA-256 `1ee0c94b8476aacdec27b447ada43509348c1481678e29bb719ee94e972cf8b4`.
It is not a fresh five-minute qualification of current base `1fd5e4c`.
The actual 18,088-row result comes from the later retained
`native-db-wire-utf8-20261121/current-service-v1` cohort. The earlier public
`native-service-load-20261120.json` retains distinct 14,664/13,424-row cohorts;
these observations must not be combined into one run.

Assessment: case 25 currently exposes a malformed gate fixture before load;
separate evidence covers the five-minute workload behavior, while the original
360-second envelope including AOT remains unverified. Case 25 alone does not
establish a live-store five-minute load gap, and the separate PASS does not
promote original case 25 to PASS.

[Machine-readable input, trace/log hashes and comparison](evidence/native-case25-diagnosis-20261121.json)
retain the exact first error and provenance. WAL fix `1e55d06`, scorecard
`51e80d82`, remediation recovery `1fd5e4c` and the prior 349/349 results remain
preserved. The full 71-case gate was not rerun; commercial HOLD remains.
