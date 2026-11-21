# Native sufficient-stock checkout DB contract

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL stock-checkout fixture](../tests/native-shop-stock-checkout.fls)
passes 1/1 using the existing Native MariaDB PREPARE path. Fresh storage is
seeded with product `(1, SKU-1, Demo Widget, 1500, stock=10)`, cart
`(1,1,qty=2)` and an empty `shop_orders` table. It prepares and executes each
of these statements once, sequentially, with the agreed bindings:

```sql
INSERT INTO shop_orders (id, product_id, qty, total) VALUES (?, ?, ?, ?)
UPDATE shop_products SET stock=? WHERE id=?
DELETE FROM shop_cart WHERE id=?
SELECT id, stock FROM shop_products WHERE id=?
SELECT id, product_id, qty, total FROM shop_orders WHERE id=?
SELECT id FROM shop_cart WHERE id=?
```

Bindings are `[1,1,2,3000]`, `[8,1]`, then `[1]` for each remaining statement.
The three final server readbacks are exactly one stock row `id=1, stock=8`,
exactly one order row `id=1, product_id=1, qty=2, total=3000`, and zero cart
rows without ERR. The fixture consumes the existing UPDATE resultset and
empty DELETE resultset before querying final state. Empty-result metadata
may use `result`; zero rows and absence of ERR remain mandatory. SQL commas
and spaces are preserved. This proof covers the agreed sequential DB
contract; no transaction-boundary or external payment request is exercised.

No implementation file changes. The accepted daemon AOT from `1414d4dd`
is reused after all five dependency hashes and the entire fixed SDK match
its producer receipt. The new FL client is freshly parsed, generated,
syntax-checked and linked, then runs once with that daemon and installed
Native socat relaying opaque bytes. Framing, authentication, setup, binds
and all result checks are FreeLang. Two private Python controllers outside
the product only qualify the trial and manage owned processes/files.
All owned children are reaped; Node-family attempts/executions are zero.

Elapsed time is 5.752914 seconds for fresh client AOT and runtime, with
cached daemon AOT excluded. Runtime host time is 0.693137 seconds.
The unchanged limits are 120 seconds and 2GiB, using one waiter on the
shared heavy flock. There is no forced release or automatic retry.

An offline audit of the same trace verifies five setup ACKs, six exact
prepared SQL strings, parameter counts `4,2,1,1,1,1`, statement IDs 1 through
6 and their raw INT32 bindings. It independently verifies the INSERT OK,
UPDATE/DELETE responses and three exact final server readbacks, with zero
ERR across 18 client frames and 45 daemon frames. Existing 36 SQL assertions,
JOIN/multiply/ORDER/SUM scope guards and grouped COUNT/COUNT(*) engine checks
pass during daemon startup. No extra Native run is used for this audit.
The [scoped receipt](evidence/native-shop-stock-checkout-20261122.json)
records source, SDK, binary, trace and audit hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and
original25 remain unchanged.
