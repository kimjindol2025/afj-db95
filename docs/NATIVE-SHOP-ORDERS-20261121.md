# Native shopping-order prepared INSERT and SELECT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed [FL order fixture](../tests/native-shop-orders.fls) passes 1/1 on
product HEAD `edfa9fad`. Within fresh isolated storage, it creates and seeds
`shop_products` with id 1, SKU-1, Demo Widget, price 1500, and `shop_cart`
with id 1, product_id 1, qty 2. It then creates
`shop_orders(id INT PRIMARY KEY, product_id INT, qty INT, total INT)` and sends:

```sql
INSERT INTO shop_orders (id, product_id, qty, total) VALUES (?, ?, ?, ?)
SELECT id, product_id, qty, total FROM shop_orders WHERE id=?
```

The prepared INSERT binds integers 1,1,2,3000 once. The prepared SELECT binds
integer 1 once and must return exactly one row with id `1`, product_id `1`,
qty `2`, total `3000`, and those four column names in order. Every result cell
is checked as a MariaDB text value. The total is the explicitly agreed bound
value; this contract exercises prepared order storage and retrieval.

The one authorized trial takes 5.332011 seconds including fresh fixture AOT;
its runtime/process host takes 0.495895 seconds. It reuses the accepted cart
commit's Native daemon ELF after verifying its SHA256, all five source
dependencies and the SDK bytes against the producer receipt. Daemon AOT time
is excluded. The fresh fixture uses the existing compiler/link flags and runs
under 120s/2GiB with the shared heavy flock. No automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. Authentication, setup, packet framing,
parameter binding and result assertions are FreeLang. The fixed private Python
process host only manages owned children and files; it and the outer qualifier
are two controllers outside the product. All owned children are reaped.
Node-family attempts and executions are zero.

The same trace independently verifies five setup commands and their ACKs,
command bytes `3,3,3,3,3,22,23,22,23`, statement IDs 1/2, exact spaced SQL,
all bound integers, four response columns and the single exact row. All 36
existing SQL assertions, the projection missing-comma guard and aggregate/LEFT
JOIN startup checks pass. This audit starts no additional Native execution.
The [scoped receipt](evidence/native-shop-orders-20261121.json) records source,
binary, SDK and trace hashes.

Only this new fixture and its evidence are added. Existing SQL core, daemon,
FreeLang parser/compiler, protocol and gate mappings remain unchanged. The
previous product/cart fixtures and failure records, WAL and historical 349/349
evidence are retained. Neither the full regression suite nor the original 71
gate is rerun or promoted. This isolated DB contract does not qualify the whole
shop application or deployment.
