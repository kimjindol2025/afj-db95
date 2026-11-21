# Native per-user order listing

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL per-user order fixture](../tests/native-shop-orders-user.fls)
passes 1/1 through the existing Native MariaDB PREPARE path. Fresh storage
contains orders `(1,10,1,2,3000)` and `(2,20,2,1,2200)` in
`shop_orders(id,user_id,product_id,qty,total)`. It prepares and executes this
exact SQL once with INT32 bind `10`:

```sql
SELECT id, user_id, product_id, qty, total FROM shop_orders WHERE user_id=?
```

The server returns exactly one row `id=1, user_id=10, product_id=1, qty=2,
total=3000`, with no ERR. The seeded user-20 order `id=2` is absent. The
fixture checks every received column/value and rejects an extra row; it
does not filter rows on the client. SQL commas and spaces are preserved.
This is the prepared WHERE filtering contract; application authentication
and authorization requests are outside the exercised path.

No implementation file changes. The accepted daemon AOT from `1414d4dd`
is reused after all five dependency hashes and the entire fixed SDK match
its producer receipt. The new FL fixture is freshly parsed, generated,
syntax-checked and linked, then runs once with that daemon and installed
Native socat relaying opaque bytes. Framing, authentication, setup, binding
and assertions are FreeLang. Two private Python controllers outside the
product only qualify the trial and manage owned process/file lifetimes.
All owned children are reaped; Node-family attempts/executions are zero.

Elapsed time is 5.280250 seconds for fresh client AOT and runtime, excluding
cached daemon AOT. Runtime host time is 0.443284 seconds. The unchanged
limits are 120 seconds and 2GiB with one shared heavy flock acquisition and
no automatic retry or forced release.

An offline audit of the same trace verifies three setup ACKs for the table
and both seed rows, the exact prepared query, parameter count 1, statement
ID 1, INT32 bind 10 and exactly one server result row. There are six client
frames, 15 daemon frames and zero ERR. Existing 36 SQL assertions,
JOIN/multiply/ORDER/SUM guards and grouped COUNT/COUNT(*) engine checks pass
at daemon startup. No extra Native run is used for the audit. The
[scoped receipt](evidence/native-shop-orders-user-20261122.json) records
source, SDK, binary, trace and audit hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and
original25 remain unchanged.
