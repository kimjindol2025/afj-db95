# Native per-user cart listing

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL per-user cart fixture](../tests/native-shop-cart-user.fls) passes
1/1 through the existing Native MariaDB PREPARE path. Fresh storage contains
cart rows `(1,10,1,2)` and `(2,20,2,1)` in
`shop_cart(id,user_id,product_id,qty)`. This exact SQL is prepared and
executed once with INT32 bind `10`:

```sql
SELECT id, user_id, product_id, qty FROM shop_cart WHERE user_id=?
```

The server returns exactly one row `id=1, user_id=10, product_id=1, qty=2`,
without ERR. The seeded user-20 row `id=2` is absent. Every returned field
is checked and extra rows are rejected. The fixture does not filter rows
on the client. SQL spaces and commas are preserved. This verifies the
prepared WHERE filter; application authentication and authorization requests
are outside the exercised path.

No implementation file changes. The accepted daemon AOT from `1414d4dd`
is reused after all five dependency hashes and the entire fixed SDK match
its producer receipt. The new FL client is freshly parsed, generated,
syntax-checked and linked, then executes once with that daemon and installed
Native socat relaying opaque bytes. Framing, authentication, setup, binding
and assertions are FreeLang. Two private Python controllers outside the
product only qualify the trial and manage owned process/file lifetimes.
All owned children are reaped; Node-family attempts/executions are zero.

Elapsed time is 5.406494 seconds for fresh client AOT and runtime, excluding
cached daemon AOT. Runtime host time is 0.440712 seconds. Limits remain
120 seconds and 2GiB with the shared heavy flock, one acquisition and no
automatic retry or forced release.

An offline audit of the same trace verifies the table/two seed ACKs, exact
prepared SQL, parameter count 1, statement ID 1, INT32 bind 10 and exactly
one server row. There are six client frames, 14 daemon frames and zero ERR.
Existing 36 SQL assertions, JOIN/multiply/ORDER/SUM guards and grouped
COUNT/COUNT(*) engine checks pass at startup. No extra Native run is used
for the audit. The [scoped receipt](evidence/native-shop-cart-user-20261122.json)
records source, SDK, binary, trace and audit hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and
original25 remain unchanged.
