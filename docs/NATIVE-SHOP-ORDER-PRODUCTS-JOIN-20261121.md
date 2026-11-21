# Native order and product JOIN

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL order/product JOIN fixture](../tests/native-shop-order-products-join.fls)
passes 1/1 on product HEAD `fafbc55b`. It creates the agreed product
`(1, SKU-1, Demo Widget, 1500)` and order `(1,1,2,3000)` in fresh storage,
then prepares this exact SQL and executes it once with integer binding 1:

```sql
SELECT shop_orders.qty, shop_products.name, shop_products.price FROM shop_orders JOIN shop_products ON shop_orders.product_id = shop_products.id WHERE shop_orders.id=?
```

The result must be exactly one row qty `2`, name `Demo Widget`, price `1500`,
with those three column names in order. The fixture checks all values and the
exact-row EOF. The original qualified JOIN and SQL comma spaces stay intact;
it is not split into separate SELECTs.

The single authorized Native trial takes 5.021146 seconds including fresh
fixture AOT; its runtime/process host takes 0.487530 seconds. It reuses the
accepted `b2dc50a1` daemon ELF after verifying its SHA256, all five source
dependencies and every SDK file against the producer receipt. Daemon AOT time
is excluded. Existing compiler/link flags, 120s/2GiB bounds and the shared heavy
flock apply. No automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. Framing, authentication, setup, binding
and exact-row assertions are FreeLang. The fixed private Python process host
only manages owned processes/files and makes no protocol/network requests.
It and the outer qualifier are two controllers outside the product. All owned
children are reaped; Node-family attempts and executions are zero.

The same trace independently verifies four setup ACKs, command bytes
`3,3,3,3,22,23`, the original JOIN query, statement ID 1, bound integer 1,
three column definitions and the exact one-row `2,Demo Widget,1500` response.
No ERR packet occurs. All 36 SQL startup assertions and the existing four JOIN
and four multiply scope guards pass. The
[scoped receipt](evidence/native-shop-order-products-join-20261121.json) records
source, SDK, binary and trace hashes. Auditing starts no extra Native execution.

Only the new fixture and evidence are added. Existing SQL core, engine, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and gate mappings
remain unchanged. Prior failures, WAL and historical 349/349 evidence are
retained; the full regression suite and original 71 gate are not rerun or
promoted. This proves the isolated order/product JOIN contract.
