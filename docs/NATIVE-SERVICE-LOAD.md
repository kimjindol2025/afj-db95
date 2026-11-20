# Native service clients and sustained load

SCOPED_RUNTIME=PASS; LARGE_COLD_RECOVERY=PASS_AFTER_CORRECTION; COMMERCIAL_READINESS=HOLD;
DEPLOYMENT=NO. Host paths/owners: <가림>. All data and accounts were synthetic.

The qualified replay/index tail-call correction now recovers every row of the
original 14,664-row WAL, the retained 13,424-row WAL, and a fresh 16,224-row WAL,
each in two new Native processes under the unchanged 120-second/2 GiB limits.
Every raw ID/name, revision and both independent digests match. Details and
remaining gates are in [Native complete WAL replay](NATIVE-REPLAY-TAIL.md).
The earlier failures below remain historical cohort results.

## Runnable Native cases

The new `tests/native-service` files supply a fixed Bash process/file host and
FreeLang clients, readiness policy and typed result validation. Product paths
execute no Python or Node. Existing protected fixtures, runners, assertions,
weights and bounds remain unchanged; the original 71-case result is still
52 PASS / 19 FAIL. These additions are separate qualification cases.

The Native TCP readiness policy now retries only an explicitly changed log
snapshot within the original deadline. Its paired SDK policy checks and fresh
eight-client check on the unchanged accepted core are recorded separately in
[Native startup-log readiness](NATIVE-STARTUP-READINESS.md). That correction
does not itself qualify large-store recovery; the separate correction above does.

Use an already installed matching Native SDK on Linux with existing GCC,
bubblewrap and GNU command-line tools. Activate its `env.sh`, then provide a
new absolute output directory whose parent exists:

```bash
source "/path/to/sdk/env.sh"
tests/native-service/run-case.sh concurrency "/private/new-concurrency-output"
tests/native-service/run-case.sh soak "/private/new-soak-output"
```

The host owns `/tmp/fl-heavy.lock`; callers must not wrap it in another lock.
It refuses an existing output path and retains artifacts. Internal worker
arguments are reserved for the host. `AFJ_DB95_REPO_ROOT` can select an explicit
source copy. Physical paths travel through NUL records and literal argv.
Qualification used SDK, source and output paths with spaces, apostrophes,
Korean, percent/dollar characters and embedded/trailing LF.

AOT preparation is a separate stage: strict parse and C generation each retain
120-second limits; linking retains 180 seconds per ELF. Runtime starts before
port choice and daemon launch. Its 120/360-second bounds include readiness,
requests, result checking and cleanup. Timeout failure has a separate three-
second forced-cleanup allowance. Every child runs in an owned PID/network
namespace; host files are read-only except the new artifact directory.
No global service or production listener is changed.

| Case | Preserved checks and limits |
|---|---|
| Concurrency | Eight login successes; same table/schema; eight concurrent inserts; SELECT success and exactly eight rows; 30-second marker and port waits; 120-second runtime envelope |
| Soak | Eight clients; 300,000 ms workload; every insert succeeds; SELECT after every ten batches and at the end returns one row; at least eight writes; 20,000 ms request/max and 15,000 ms p95 limits; 60-second marker, 30-second port and 360-second runtime envelope |

The concurrency client additionally checks every insert response. The soak
client counts the exact multiplicity of integer-millisecond latencies and uses
the original `floor((N-1)*0.95)` order statistic. Eight Native comparisons
against a fully sorted reference cover its histogram calculation; no sample
is discarded. The workload duration and thresholds cannot be lowered by
changing its environment.

## Separate observed cohorts

Core source is DB `c6bd1f5e4a06cd0aec7ca24cc86a78ac66e5f411`, module SHA-256
`e153fb7f21830a69975bb177929cd28ea30f2b0cb5e0c99dd6fab3bb937a742c`.
FX is `d8dc4c63adcfe2ac3f7d7edf69f890407c2dd4da`. Compiler, SDK and runtime
archive hashes are in [the machine-readable evidence](evidence/native-service-load-20261120.json).
Both cases link the accepted SDK archive; this differs from the original
71-case worker's direct compilation of twenty runtime C sources.

| Cohort | Result | Scope |
|---|---|---|
| First private fresh AOT build + load, 360 seconds total | TIMEOUT 124 | Build consumed 61.60 s, leaving 298.18 s for a required 300 s load; no five-minute pass |
| Separate byte-identical prebuilt binaries, 360-second runtime | PASS | 300,214 ms; 14,664 writes; 48.88/s; p95 191 ms; max 340 ms |
| Private fresh-build concurrency, 120 seconds total | PASS | 59.29 s including build; all eight insert responses and selected rows correct |
| Fixed Bash/FreeLang host, build then 120-second runtime | PASS | Eight clients and eight rows; literal-path cohort; Node/Python executions 0 |
| Fixed Bash/FreeLang host, build then 360-second runtime | PASS | 300,124 ms; 13,424 writes; 44.75/s; p95 202 ms; max 441 ms; Node/Python executions 0 |
| Two fresh Native recoveries of the first actual load WAL | FAIL / FAIL | Same 14,664-row data, 120 s and 2 GiB per process; allocation failure; WAL unchanged |

Build, queue and runtime durations are recorded separately. The last two host
cohorts do not establish fresh-build-plus-five-minute acceptance within one
360-second envelope. The earlier timeout is retained. The different throughput
observations are different cohorts, not an identical-environment speedup claim.

Each fixed-host trace has 183 completely decoded execve calls and zero Node-
family/Python executions. Earlier private Python controllers perform only
diagnostic orchestration; their executions are explicitly counted in their
separate receipts. Public host/client bytes match the fully exercised candidate.
Source/SDK preservation and original failures remain recorded.

The original malformed `tests/tcp-long-soak.fls` and unported JS Case 24 remain
FAIL in the unchanged original gate. No repaired copy, fake PASS marker,
shortened load, smaller recovery data or increased limit replaces those rows.
First prerequisite/collector setup failures remain separate retained history.

## Required recovery follow-up

The actual first load WAL is 5,667,767 bytes. Its independent ordered pair
digest is `006ad83f82dab3e913175dd61eb1b30550a39cf1bb92ccc3c31a67af91b2cf8e`;
expected row count is 14,664 and commit revision is 14,665. A private marker-only
probe completed all 29,331 split lines and last reported revision 7,000 before
allocation failure during replay. That earlier failed cohort is retained; the later
full-data correction above supplies separate successful recovery evidence.

The correction above recovers the unchanged complete data in two fresh Native
processes within the same limits, verifies every ID/name, revision and independent
digest, preserves the WAL, and retains the existing corruption, checkpoint,
Unicode, commit-health and whole-service checks. The original 3,200-record
fixture pads prepares and commits only two ASTs; it does not cover this actual
large-write recovery scenario.

Writer ownership, storage-root identity, generation collection, disk bounds,
WAL rotation, all Native protocol/TLS clients, operational backup/restore,
deployment rehearsal and independent review also remain open. These synthetic
plaintext loopback tests provide neither physical power-loss certification
nor production or whole-DB acceptance.
