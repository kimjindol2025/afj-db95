# Native MariaDB PREPARE, bound EXECUTE and exact SELECT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The independent [FreeLang fixture](../tests/native-mariadb-bound-execute.fls)
passes 1/1 on product HEAD `018a80ad419b4ddfc720f0545e684a203a7adc20`.
It authenticates to the existing Native MariaDB daemon, creates a synthetic
product table, prepares `INSERT INTO native_bound_products (id,sku) VALUES (?,?)`,
checks the two-parameter acknowledgement and executes with integer `1042` and
string `native-bound`. A final SELECT must return exactly one row with those
id/sku values. The fixture checks frame sequence, decoded column names, both
values, the row terminator and absence of trailing bytes.

Protocol framing, challenge-response authentication, commands, parameter types
and result assertions are FL. The unchanged SDK has an outbound line reader;
the fixture uses its existing binary raw TCP callback instead. Installed Native
`socat` joins that callback's loopback socket to the existing daemon's loopback
socket as an opaque byte relay. It adds no packet, binding or result policy.
The private host starts/reaps those three owned Native processes and handles
configuration files; it makes no socket requests. No new runtime API was added.

The fixture publishes `ports.json` with `bridge` and `daemon` numbers, followed
by `ports.ready`, in a fresh `AFJ_NATIVE_PREPARED_CONTROL` directory. Its raw
listener is ready before publication. The host starts the existing
`tests/native-mariadb-daemon.fls` ELF on the daemon port and starts installed
socat between the two ports. Existing SHA-1 helpers are loaded by the fixture;
buffer operations use the current Native builtins. All data is synthetic and
all sockets remain inside a private network/PID namespace.

The accepted single cohort takes 4.570000 seconds including new-fixture AOT;
its process/runtime part takes 0.337890 seconds. The existing current-source
daemon ELF was hash-verified and reused, so daemon AOT is outside that timing.
The 120-second envelope, 2GiB per process and shared heavy flock remain. All 17
exec records have terminal statuses: fixture 1, daemon 1 and Native socat 1;
Node attempts and executions are zero. The traced private Python process host
and outer qualifier are counted as two controllers outside the product.

The existing trace independently contains command bytes 3,22,23,3 and the
actual binary EXECUTE types 3/253 and values 1042/native-bound. No extra run
was made for that audit. See the
[scoped receipt](evidence/native-mariadb-bound-execute-20261121.json).

Two earlier single cohorts failed in the new fixture before login completed:
an unimported UTF-8 helper, then an accept-only condition while the SDK emits
connect. Their exact inputs and FAIL receipts are retained. Explicitly agreed
corrections touched only four helper calls, then one connect/accept condition;
the accepted cohort ran once after those corrections. No failure was committed.

Original JavaScript case 71 and both protected gate runners remain unchanged;
original 71 FAIL is preserved. This independent two-parameter wire contract
does not relabel that original gate or its additional scenarios. Cases 66,68,69
were not run. Existing standard-client, peer-budget, kill/re-login, WAL and
349/349 regression evidence is preserved; the old suite was not rerun for this
new test. Parser, compiler, runtime, daemon and TLS code were unchanged.
