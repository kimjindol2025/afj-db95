# Native standard MariaDB client diagnostic

SCOPED=PASS; WHOLE_GATE=52 PASS / 19 FAIL; COMMERCIAL_READINESS=HOLD;
DEPLOYMENT=NO. Host paths and owners: <가림>.

## Runnable Native case

The qualified `tests/native-mariadb` host executes zero Node-family or Python
processes. Requests, readiness, NUL argv construction and exact output/status
checks are FreeLang; Bash handles fixed argv, files and owned process lifetimes.
The unchanged daemon serves the same original three SQL requests through the
installed standard MariaDB client. Use an already installed matching SDK, GCC,
bubblewrap, GNU tools and `mariadb`:

```bash
source "/path/to/sdk/env.sh"
tests/native-mariadb/run-case.sh "/private/new-output-directory"
```

The output must be new and absolute, with an existing parent. The host owns
`/tmp/fl-heavy.lock`; do not wrap it in another flock. Internal worker flags are
reserved for the host. `AFJ_DB95_REPO_ROOT` can select an explicit source copy.
The fresh strict parse, C generation, linking, requests and normal cleanup fit
one 120-second envelope under 2 GiB. Startup's 60-second deadline begins before
AOT preparation. Port readiness allows at most 31 attempts at 100 ms intervals,
with a 3.1-second cap; the standard client keeps its five-second connect limit.
A timeout has a separate three-second cleanup allowance. Owned PID/network
namespaces isolate the plaintext loopback fixture and its child processes.

Qualification used source, SDK and output roots with spaces, apostrophes,
Korean, percent/dollar signs and LF; source/output roots ended in LF. Physical
paths and argv use NUL records. All 385 frozen inputs and the SDK remained
unchanged. The 63 fully decoded execve records have terminal statuses and zero
Node/Python executions. The three captured argv records match the original SQL
and client options plus `--no-defaults`; SELECT is exactly `1\tKim\n`.
See [the fixed-host evidence](evidence/native-mariadb-service-20261120.json).
The private Python qualifier is outside the product trace. Queue-inclusive
observation time is recorded separately and is not runtime acceptance timing.

The first public-host prototype failed strict parsing with `PATH_OUTSIDE_BASE`
because it selected the output file base before compiling the source. That
failure is retained. The qualified version keeps the compiler's selected source
base and selects the output base only for runtime artifact reads. C10 path
validation is unchanged. Original JS Case 68 and the 71-case gate stay intact;
this new runnable case does not rewrite their recorded failures.

## Startup-log readiness follow-up

The Native MariaDB controller now uses the shared startup-log policy from
[Native startup-log readiness](NATIVE-STARTUP-READINESS.md). It discards only
`FILE_CHANGED` snapshots, keeps other read errors fatal, requires the explicit
runtime file base and latches a marker from a successful complete snapshot.
Its existing 60-second deadline still starts before AOT, with the same 25 ms
marker polling, 31 port attempts, 3.1-second port cap and five-second client
connection limit. The fixed Bash host is unchanged.

A fresh cohort on the unchanged accepted DB core and R25 SDK passes all three
standard-client SQL requests within the original 120-second envelope. SELECT
remains exactly `1\tKim\n`. All 63 execve records are decoded with terminal
statuses; Node-family and Python executions are zero. Source and SDK checks
pass before and after. See [the follow-up evidence](evidence/native-mariadb-readiness-20261121.json).
This is a plaintext readiness/client case; original JS Case 68 and TLS,
prepared-statement and authentication-rejection coverage remain separate.

## Earlier private diagnostic

An unchanged FreeLang MariaDB daemon, freshly AOT-compiled with the accepted
Native SDK, completed the original standard-client case's three SQL requests:
CREATE TABLE, INSERT `(1,'Kim')`, then SELECT. Three installed `mariadb` client
processes exited zero. SELECT returned exactly `1\tKim\n` (hex
`31094b696d0a`). Source hashes, commands and limits are recorded in
[the evidence](evidence/native-mariadb-client-20261120.json).

The 120-second envelope included fresh C generation, linking and runtime under
the unchanged 2 GiB address-space limit. The original 60-second marker wait
began after AOT preparation, followed by up to thirty refused-port retries at
100 ms and a five-second client connection timeout. Private PID/network
namespaces kept the service on synthetic loopback data. Normal owned-process
cleanup completed within three seconds. Source and SDK checks passed before
and after; all 383 frozen source files stayed unchanged.

The client kept the original protocol, SQL and exact output checks. Its extra
`--no-defaults` option prevented access to existing client configuration or
credentials. Authentication used only the fixture's synthetic development
account. `--skip-ssl` remained in place; this is a plaintext wire diagnostic.

All sixteen execve records were decoded with terminal statuses. There were
zero Node-family executions, three standard-client executions and one explicitly
counted private Python diagnostic controller. This earlier private receipt alone
did not qualify the public host; the independent fixed-host cohort above supplies
that evidence. The first private cohort also returned the exact SQL result, but
its compiler-error scanner was absent from its restricted PATH.
That incomplete guard and its artifacts are retained. The accepted fresh second
cohort used installed grep and required the exact no-match exit status; scanner
errors fail. It retained the same daemon, controller, SQL, assertions and bounds.

The protected original JS fixture and 71-case runner remain unchanged. Original
Case 68 still reports FAIL as an unported JS entry; this separate diagnostic
adds execution evidence without replacing that result. The MariaDB daemon uses
the engine, SQL parser and wire codec, rather than the TCP WAL recovery path.
The actual 14,664-row TCP WAL recovery blocker remains open; see
[the load and recovery evidence](NATIVE-SERVICE-LOAD.md).

TLS/mTLS, rejection and prepared-statement clients, full wire compatibility,
writer ownership, storage identity, backup operations and release readiness
remain separate gates. No production service or existing database was changed.
