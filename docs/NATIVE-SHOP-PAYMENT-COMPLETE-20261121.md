# Native payment-completion DB state

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed [FL fixture](../tests/native-shop-payment-complete.fls) passes 1/1
on product HEAD `b19e7434`. In fresh isolated storage it creates and seeds the
agreed product (id 1, price 1500), cart (id 1, product_id 1, qty 2) and order
(id 1, product_id 1, qty 2, total 3000). The order is inserted using PREPARE
and four integer bindings, then the same session executes:

```sql
DELETE FROM shop_cart WHERE id=?
SELECT id FROM shop_cart WHERE id=?
SELECT id, product_id, qty, total FROM shop_orders WHERE id=?
```

All three statements use PREPARE and bind integer 1 once each. The cart SELECT
must return zero rows without ERR; the order SELECT must return exactly one
row `1,1,2,3000` with the four requested column names in order. All values are
checked in FreeLang. This proves the agreed cart/order DB state after payment
completion; it does not invoke a payment provider or charge funds.

Two earlier separately authorized cohorts failed fixture response assumptions.
The first expected an OK packet for DELETE, whose actual response was an
ERR-free one-column empty resultset. The second required column `id` for an
empty cart result, whose actual column was `result`. Their original source
snapshots and FAIL receipts are retained and were not committed. After explicit
scope agreements, only the test parses the observed DELETE resultset through
both EOFs and drops the empty-cart column-name requirement. The cart zero-row,
ERR, exact order row, original SQL/binds and timeout checks remain in force.
No server behavior or protocol was changed.

The accepted single trial takes 6.451074 seconds including fresh fixture AOT;
its runtime/process host takes 0.600989 seconds. It reuses the cart commit's
Native daemon ELF after verifying its SHA256, all five source dependencies and
the SDK bytes against the producer receipt. Daemon AOT time is excluded. The
existing compiler/link flags, 120s/2GiB bounds and shared heavy flock apply.
Each cohort ran once under its own authorization; no automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. Framing, authentication, all SQL/binds
and result assertions are FreeLang. Two private Python controllers outside the
product only qualify the execution and manage owned processes/files. The traced
process host makes no protocol or network requests. All owned children are
reaped; Node-family attempts and executions are zero.

The same trace independently verifies five setup ACKs, four prepared statements
with IDs 1/2/3/4 and one execution each, all binds, spaced SQL, DELETE/cart empty
responses and the exact preserved order row. Both empty responses have header
`01`, column `result`, zero rows and EOF `fe00000200` (status `0x0002`); no ERR
packet occurs. All 36 existing SQL startup assertions and projection/aggregate
checks pass. The [scoped receipt](evidence/native-shop-payment-complete-20261121.json)
records source, toolchain, binary, trace and retained failure hashes. Auditing
starts no additional Native run.

Only the new FL fixture and evidence are added. Existing SQL core, daemon,
FreeLang parser/compiler, protocol, original gate mapping and prior fixtures
remain unchanged. WAL and historical 349/349 evidence are retained; neither
the full regression suite nor the original 71 gate is rerun or promoted. This
isolated DB state contract does not qualify the whole shop or deployment.
