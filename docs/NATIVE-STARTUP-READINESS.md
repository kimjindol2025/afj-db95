# Native startup-log readiness

SCOPED=PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The separate Native TCP service host now tolerates an append during its owned
startup-log read. The earlier host could fail with `file_read IO_ERROR` before
starting any workload: the runtime rejects a read whose file grew beyond the
initial snapshot size. That failure and its artifacts are retained.

`tests/native-service/log-readiness.fls` uses `file-read-result` and discards a
`FILE_CHANGED` snapshot, including any marker in its returned data. It retries
within the existing readiness deadline. Every other read error fails, and a
successful result must contain a string. The ready child receives the explicit
output directory as `FL_FILE_BASE`; path validation remains enabled. The policy
latches a marker only from a successful snapshot and checks the deadline.

The 50 ms polling interval, 30/60-second marker waits, 30-second port wait,
120/360-second runtime envelopes, eight clients, 300,000 ms load and latency
limits remain unchanged. This change is confined to the new Native test host;
the original 129 test files, runners, assertions and limits are preserved.

## Qualification

- The portable `log-readiness-policy.fls` passes all nine cases with both the
  accepted R25 SDK and the separate R34 candidate SDK. It covers stable and
  empty data, discarding a changed snapshot, four fatal read errors, invalid
  data and an invalid success flag.
- A separate 12-case Native fixture includes those policies and real stable,
  missing and outside-base reads. All pass; outside-base access still fails.
- The modified public service host, freshly built with the accepted R25 SDK
  and unchanged accepted DB core, passes eight concurrent inserts and selects
  exactly eight rows. All insert responses succeed. Its 69 decoded execve
  records contain zero Node-family or Python executions.

Each SDK passed integrity checks before and after. Source bytes and identities
are recorded in [the evidence](evidence/native-startup-readiness-20261121.json).
Private Python qualification controllers run outside the product traces.
The portable policy file uses a relative load and no private fixture paths;
compile and run it using the matching SDK's normal Native AOT path.

The full original gate remains 52 PASS / 19 FAIL. The separate recovery
candidate's newest 16,224-row cold process failed with exit 139 and is excluded
from this commit. Its core/runtime edits remain private. This startup fix does
not qualify large-store recovery, MariaDB readiness, TLS, operational safety or
production deployment. See [the service-load record](NATIVE-SERVICE-LOAD.md).
