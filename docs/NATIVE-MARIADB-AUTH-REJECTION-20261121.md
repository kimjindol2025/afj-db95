# Native MariaDB wrong-authentication rejection

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The independent [FreeLang fixture](../tests/native-mariadb-reject-login.fls)
passes 1/1 on product HEAD `28d41e38efe6b5d3eb0e6f4dda952bfa57860e6c`.
It reads the existing Native daemon's handshake, constructs a valid protocol
header for the synthetic root account and computes a full 20-byte
mysql_native_password response using a deliberately incorrect fixture password.
The token must differ from the correct fixture token. Only an ERR packet with
code 1045 and `ACCESS_DENIED` completes the test; an OK packet, another error,
an unavailable daemon or a timeout fails.

Challenge-response construction, frame sequence and exact rejection checks are
FL. The current Native raw TCP callback carries the bytes through installed
Native socat to the existing daemon, using the same opaque transport as the
[prepared contract](NATIVE-MARIADB-BOUND-EXECUTE-20261121.md). The private host
handles only fresh configuration files and owned process lifetimes. Its control
directory is supplied as `AFJ_NATIVE_MARIADB_REJECT_CONTROL`; the FL fixture
publishes `ports.json` followed by `ports.ready` after opening its listener.
No new parser, compiler, runtime, daemon or TLS API was added.

One authorized trial takes 3.633589 seconds including fresh fixture AOT;
its process/runtime part takes 0.284194 seconds. The verified current-source
daemon ELF is reused and its AOT is outside this timing. Bounds remain 120s,
2GiB per process and the shared heavy flock. Fixture 1, daemon 1 and Native
socat 1 execute, all owned children are reaped, and all 17 exec records have
terminal statuses. Node attempts/executions are zero. One traced private Python
process host and one outer trial qualifier are outside the product.

An offline audit of that same trace independently recomputes the captured token
from the captured handshake: it matches the incorrect fixture password and
differs from the correct password's token. The actual server response is ERR
1045 `ACCESS_DENIED`. This audit starts no new Native process or network flow.
The [scoped receipt](evidence/native-mariadb-auth-rejection-20261121.json)
records the source, binary, toolchain and trace hashes.

Original JS case 69 and both protected release-gate runners remain unchanged;
original 69 FAIL is preserved. This independent negative-login contract does
not relabel that original gate. Cases 64,66,68 were not run. Existing prepared,
standard-client, peer-budget, kill/re-login, WAL and 349/349 regression evidence
is preserved; the old suite was not rerun for this new independent test.
