# Native standard MariaDB client diagnostic

SCOPED=PASS; WHOLE_GATE=52 PASS / 19 FAIL; COMMERCIAL_READINESS=HOLD;
DEPLOYMENT=NO. Host paths and owners: <가림>.

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
counted private Python diagnostic controller. This receipt does not qualify a
public Python-free test host. The first private cohort also returned the exact
SQL result, but its compiler-error scanner was absent from its restricted PATH.
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
