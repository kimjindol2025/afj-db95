# Case 24: original TCP concurrency gate diagnosis

Case 24 fails before server startup because the Native gate passes the original
JavaScript file to the FreeLang compiler. This is a gate input/runner boundary;
it is not evidence that a live store cannot accept concurrent connections.

This diagnosis reads existing sources, logs, traces and results only. It makes
no implementation, port, JS parser extension or gate mapping change, and runs
no new tests. Original case 24 remains 0 PASS / 1 FAIL in the retained 71-case
run (52 PASS / 19 FAIL / 0 TIMEOUT / 0 SKIP), performed before the WAL fix.

## Actual first failure

- Fixed input: `tests/tcp-concurrency-smoke.js`, SHA-256
  `02bf99199924891f3b669d84f1d6668a05fc158b0a6d9dae11e1b896dffae74a`.
- The source uses Node.js `require`, `net`, child process spawning and async
  functions. The original release gate selects Node for this input.
- `tests/native-release-gate.sh` selects its `*.js` branch, invokes
  `flc original.js case.c`, then emits `NATIVE_JS_SOURCE_NOT_PORTED` and exits 1.
- The recorded first error is `E_PARSE_UNEXPECTED_TOKEN: expected ) before
  RBrace at line 92, col 3`. The unported marker is printed afterwards.
- The exec trace contains the case-24 worker invocation and the matching
  `flc` argv. This branch never links or launches a test daemon/client.

One first-failure cause is established. It does not establish a missing
FreeLang language feature or authorize compiling JavaScript as FreeLang.

## Existing separate FreeLang coverage

| Original requirement | Existing Native test path |
|---|---|
| Choose an unused loopback port | `control.fls` port action and fixed Bash host |
| Start `tcp-daemon.fls` | `run-case.sh` compiles and starts that unchanged fixture |
| Startup marker and TCP readiness, 30 seconds each | `control.fls` readiness policy |
| Eight sockets and successful logins | `tcp-concurrency-client.fls` eight-client loop |
| Same schema and eight simultaneous INSERT requests | Same client, `run-parallel` tasks |
| SELECT succeeds with exactly eight rows | Same client, typed row-count assertion |
| Clean up owned clients/processes | Client `finally` and host PID/network namespace cleanup |

All three Native files are in `tests/native-service/`. The Native client also
checks each INSERT response; its host retains artifacts rather than deleting
them. Its 120-second runtime envelope records AOT preparation separately.
Neither difference changes the protected original case's FAIL status.

Previously completed service artifacts verify concurrency 1/1 PASS with eight
clients/eight rows, and a separate five-minute load 1/1 PASS with eight clients,
18,088 writes, 300,190 ms elapsed, p95 143 ms and maximum 236 ms. Both traces
record zero Node-family or Python execution in the product build/runtime path.
The original input, gate runners, daemon and FL test bodies still match their
recorded hashes.

Those service observations used the separate private UTF-8 wire candidate,
module SHA-256 `1ee0c94b8476aacdec27b447ada43509348c1481678e29bb719ee94e972cf8b4`.
They are not fresh concurrency/soak runs of WAL fix commit `1e55d06`. Earlier
accepted public concurrency evidence is separately retained in
`docs/evidence/native-service-load-20261120.json`. The newly qualified complete
WAL recovery and 349 regressions are documented in
[NATIVE-WAL-BULK-RECOVERY-20261121.md](NATIVE-WAL-BULK-RECOVERY-20261121.md).

Assessment: case 24 exposes the Native gate path, with no demonstrated live
store concurrency gap. Whole-mall completion remains a separate objective.
Machine-readable provenance and artifact hashes are in
[evidence/native-case24-diagnosis-20261121.json](evidence/native-case24-diagnosis-20261121.json).
