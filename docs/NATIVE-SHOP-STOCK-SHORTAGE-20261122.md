# Native stock shortage fixture readback

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL shortage fixture](../tests/native-shop-stock-shortage.fls) passes 1/1
using the existing Native MariaDB PREPARE path. Fresh storage is seeded with
product `(1, SKU-1, Demo Widget, 1500, stock=1)`, cart `(1,1,qty=2)` and an
empty `shop_orders` table with the existing id/product_id/qty/total schema.
Stock is less than cart quantity. After setup the fixture issues only these
three prepared SELECTs, once each, in order:

```sql
SELECT id, stock FROM shop_products WHERE id=?
SELECT id FROM shop_orders ORDER BY id
SELECT qty FROM shop_cart WHERE id=?
```

Bindings are `[1]`, `[]`, `[1]`. The server returns exactly stock row
`id=1, stock=1`, zero order rows without ERR, then exactly cart row `qty=2`.
The zero-row order response may use its existing `result` column label; the
fixture requires zero rows and no ERR without demanding `id` metadata.
The fixture issues no stock UPDATE and no order INSERT. This is the agreed
shortage-state readback contract; it makes no checkout or concurrent-order
request. SQL commas and spaces remain as agreed.

No implementation file changes. The existing daemon AOT from commit
`1414d4dd` is reused after matching all five daemon dependency hashes and the
entire fixed SDK against its accepted producer receipt. The new FL fixture
is freshly parsed, generated, syntax-checked and linked, then runs once with
that daemon and installed Native socat as an opaque byte relay. All framing,
authentication, setup, bindings and assertions are FreeLang. Two private
Python controllers outside the product only qualify the trial and manage
owned process/file lifetimes. All owned children are reaped.

Elapsed time is 5.295260 seconds for fresh client AOT and runtime, with cached
daemon AOT excluded. Runtime host time is 0.544952 seconds. The unchanged
limits are 120 seconds and 2GiB, with the existing shared heavy flock. A single
waiter acquires the lock naturally after the prior code-generation job ends;
there is no force release, duplicate execution or automatic retry.

An offline audit of the same trace verifies five setup ACKs, all three exact
prepared SQL strings, parameter counts `1,0,1`, statement IDs `1,2,3`, EXECUTE
bindings and exact server rows. It also confirms zero ERR, stock UPDATE and
order INSERT commands. Existing 36 SQL assertions, JOIN/multiply/ORDER/SUM
scope checks and grouped COUNT/COUNT(*) engine checks pass in daemon startup.
Node-family attempts/executions are zero. The
[scoped receipt](evidence/native-shop-stock-shortage-20261122.json) records
source, SDK, binary, trace and audit hashes. No extra Native run is used for
the audit.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun or
promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and original25
remain unchanged.
