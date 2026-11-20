# Native remediation recovery pointer follows configured storage

Case 30 previously passed 24 semantic checks, then failed while writing its
hardcoded `../docs/remediation-recovery-path.txt` artifact. The Native file API
rejects every `..` component before filesystem access. Configuring the WAL did
not change that separate hardcoded pointer path.

The two existing fixtures now select `<wal>.recovery-path.txt` when
`AFJ_DB_REMEDIATION_WAL` is set. The existing gate already provides that variable;
its runner and mapping are unchanged. The pointer still contains the actual WAL
path, and the independent reader uses the same storage configuration to locate
and read that pointer before recovering the WAL. With the variable unset, both
fixtures retain the legacy `../docs/remediation-recovery-path.txt` selection.
The Native `..` rejection remains applicable; unconfigured Native execution is
not newly qualified by this configured-storage check.

The SHA exception is explicitly limited to path selection in
`tests/mariadb-remediation-regression.fls` and
`tests/mariadb-recovery-reader.fls`. SQL inputs, all 25 assertions, expected JSON
generation/format, pointer content and the independent process's exact catalog
and database comparisons are unchanged. The complete file bytes match only the
approved substitutions.

## Actual Native verification

| Cohort | Result | Seconds | Scope |
|---|---|---:|---|
| Original input before approval | FAIL, exit 1 | 85.020 | 24/25 checks, then original line 130 path denial |
| Approved path selection, original case-30 worker | PASS, exit 0 | 84.738 | 25/25 checks and actual pointer/snapshot/WAL artifacts |
| Separate freshly compiled Native reader | PASS, exit 0 | 80.880 | `INDEPENDENT_WAL_RECOVERY PASS`, exact catalog/database equality |

Each writer/reader invocation retains a 120-second bound including AOT,
compilation/linking of the original 20 runtime C sources and Native execution,
and a 2GiB address-space limit. Work is serialized with `/tmp/fl-heavy.lock`.
The private Bash reader host contains only fixed compilation/process argv;
protocol and recovery assertions remain in the FL fixtures. Each build/runtime
trace records zero Node-family execution/attempt and zero Python execution.
Private Python test controllers outside those traces are separately counted.

The SDK and output paths include spaces, apostrophes, Korean, percent/dollar and
LF characters; artifact and reader roots end in LF. The pointer's raw bytes
exactly equal the actual WAL pathname. The reader's namespace mounts the
writer's artifact directory read-only. WAL, expected JSON and pointer hashes
remain identical before and after that independent reader.

The unchanged `runtime/v11-file.h` SHA-256 is
`cbee9d94cfbfd9059beb70e176e43cd1208093a775ecce76a61d53b0ba6ec08a`.
The runtime source tree, SDK, existing gate runners and product core remain
unchanged. The original failed input and its WAL/snapshot remain retained.

One private orchestration setup omission was corrected during the writer run:
the genuine stdout file was hard-linked at the original worker's expected log
pathname before its marker check. Its final bytes match actual stdout; the
original runner and test assertions were untouched, and no test was rerun.

[Full source, trace and artifact hashes](evidence/native-remediation-recovery-path-20261121.json)
record both original/new fixture SHAs, the retained failure and qualified runs.
WAL fix `1e55d06`, prior 349/349 regressions, case-24 diagnosis and case-28 score
100 remain preserved. Those 349 cases and the complete 71-case gate were not
rerun for this fixture path change. Commercial HOLD and deployment NO remain.
