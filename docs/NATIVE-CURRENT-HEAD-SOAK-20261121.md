# Current product Native five-minute workload

Current product source passes the existing Native-service five-minute workload
1/1 with eight clients: 300,136 ms elapsed, 18,032 acknowledged writes,
p95 145 ms and maximum 273 ms. The run uses base `f7f15b1`; product code is
`1fd5e4c` with diagnosis documents added. It does not reuse the earlier private
wire candidate's workload result or promote original gate case 25.

The unchanged Native host runs `--runtime soak` with verified current-source
daemon/client/control ELFs and new empty storage. Its 360-second runtime and
2GiB address-space limits, shared `/tmp/fl-heavy.lock`, 300,000 ms duration,
eight parallel requests per batch, schema, periodic/final SELECT checks,
20,000 ms request/max and 15,000 ms p95 thresholds, 60/30-second readiness,
and 10,000/60,000 request-rate configuration remain unchanged.

| Measured field | Actual fresh runtime |
|---|---:|
| Result | 1/1 PASS |
| Workload elapsed | 300,136 ms |
| Successful writes | 18,032 |
| Completed batches | 2,254 |
| p95 | 145 ms |
| Maximum | 273 ms |
| Whole runtime including readiness/cleanup | 300.519 seconds |

The client's eight percentile-reference controls and Native typed result
validation pass. Trace evidence records no Node-family/Python execution or
attempt and no compiler/GCC execution in this recovery runtime. Workload and
validation logic remain in the existing FL client/control; the host supplies
fixed process/file operations only.

## Interrupted observation and approved recovery

The preceding observation lost its process during the Orca restart and left no
final typed result or host status. It is recorded separately as 0 PASS / 0 FAIL /
1 interrupted-unverified; its 4,911,943-byte partial WAL and logs are retained.
No performance failure or successful five-minute result is inferred from it.

The completed current-source AOT files were retained. Their recorded SHA-256
values were checked before copying, after copying, before runtime and after
runtime. The explicit recovery approval permits exactly one normal runtime
observation with those files. No rebuild or automatic retry occurred. The old
partial WAL was never supplied to the recovered run and its hash is unchanged.

The recovery process was detached with a recorded PID/start identity so it
could be tracked across Orca restarts; its PID handle is now terminal. Its
source tree, SDK manifest, runtime archive and three ELF hashes remain frozen.
The SDK/output paths include literal spaces, apostrophes, Korean, percent,
dollar and LF characters. The new WAL is separately retained and hashed.

This result qualifies the current-source workload contract. AOT preparation
is outside the 360-second runtime observation. It does not qualify original
worker 25's 360-second envelope including AOT, whose protected input remains
unchanged in this run. The original interrupted observation and recovery have
separate provenance; no earlier 1ee0c94b/20261120/18,088-row result is promoted.

[Full metrics, trace and source/SDK/ELF/WAL hashes](evidence/native-current-head-soak-20261121.json)
record this observation. Existing WAL recovery, 349/349 regression evidence,
scorecard and remediation recovery remain preserved. Commercial HOLD and
deployment NO remain unchanged.
