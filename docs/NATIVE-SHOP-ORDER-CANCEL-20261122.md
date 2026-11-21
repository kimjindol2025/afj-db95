# Native order cancellation DB contract

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL order-cancel fixture](../tests/native-shop-order-cancel.fls) passes
1/1 through the existing Native MariaDB PREPARE path. Fresh storage starts
with product `(1, SKU-1, Demo Widget, 1500, stock=8)` and order
`(1,1,2,3000,status=placed)`. The fixture executes these statements once each,
sequentially:

```sql
UPDATE shop_orders SET status=? WHERE id=?
UPDATE shop_products SET stock=? WHERE id=?
SELECT id, status FROM shop_orders WHERE id=?
SELECT id, stock FROM shop_products WHERE id=?
```

Bindings are `['cancelled',1]`, `[10,1]`, `[1]`, `[1]`. The final server
readbacks are exactly one order row `id=1, status=cancelled` and exactly one
product row `id=1, stock=10`, with no ERR. Both preceding UPDATE resultsets
are fully consumed and checked. The text bind uses the existing VAR_STRING
parameter type 253 and short length-encoded bytes; integer binds use INT32
type 3. SQL spaces and commas are preserved. This proof covers the agreed
sequential DB contract, without transaction-boundary or refund requests.

No implementation file changes. The accepted daemon AOT from `1414d4dd`
is reused after all five dependency hashes and the entire fixed SDK match
its producer receipt. The new FL fixture is freshly parsed, generated,
syntax-checked and linked, then runs once with that daemon and installed
Native socat relaying opaque bytes. Framing, authentication, setup, bindings
and assertions are FreeLang. Two private Python controllers outside the
product only qualify the trial and manage owned process/file lifetimes.
All owned children are reaped; Node-family attempts/executions are zero.

Elapsed time is 5.820193 seconds for fresh client AOT and runtime, excluding
cached daemon AOT. Runtime host time is 0.629430 seconds. The unchanged
limits are 120 seconds and 2GiB with one shared heavy flock acquisition and
no automatic retry or forced release.

An offline audit of the same trace verifies four setup ACKs, exact prepared
SQL and bindings, parameter counts `2,2,1,1`, statement IDs 1 through 4,
the `cancelled` text payload and both final server rows. There are 13 client
frames, 40 daemon frames and zero ERR. Existing 36 SQL assertions,
JOIN/multiply/ORDER/SUM guards and grouped COUNT/COUNT(*) engine checks pass
at daemon startup. No extra Native run is used for the audit. The
[scoped receipt](evidence/native-shop-order-cancel-20261122.json) records
source, SDK, binary, trace and audit hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and
original25 remain unchanged.
