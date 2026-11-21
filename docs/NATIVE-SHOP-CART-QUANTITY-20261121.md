# Native cart quantity update

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed [FL fixture](../tests/native-shop-cart-quantity.fls) passes 1/1 on
product HEAD `b23924d0`. It creates the agreed product seed id 1 (SKU-1,
Demo Widget, price 1500) and `shop_cart(id INT PRIMARY KEY, product_id INT,
qty INT)` with one row id 1, product_id 1, qty 2. It then executes:

```sql
UPDATE shop_cart SET qty=? WHERE id=?
SELECT id, product_id, qty FROM shop_cart WHERE id=?
```

The UPDATE binds integers 5,1 once; the SELECT binds integer 1 once. Both use
the existing Native MariaDB PREPARE path. The final SELECT must return exactly
one row id `1`, product_id `1`, qty `5`, with the requested three column names
in order. SQL spaces are preserved. The current daemon returns an UPDATE row
resultset, which the fixture fully consumes and checks before the SELECT.
No protocol or server response is changed to accommodate the fixture.

The one authorized trial takes 5.718186 seconds including fresh fixture AOT;
its runtime/process host takes 0.413619 seconds. It reuses the accepted cart
commit's Native daemon ELF after verifying its SHA256, all five source
dependencies and every SDK file against the producer receipt. Daemon AOT time
is excluded. Existing compiler/link flags, 120s/2GiB bounds and the shared heavy
flock apply. No automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. Framing, authentication, setup, bindings
and all row assertions are FreeLang. The private fixed Python process host
only manages owned processes/files and makes no protocol/network requests.
It and the outer qualifier are two controllers outside the product. All owned
children are reaped; Node-family attempts and executions are zero.

The same trace independently verifies command bytes `3,3,3,3,22,23,22,23`,
initial qty 2 seed and setup ACKs, exact UPDATE/SELECT SQL, statement IDs 1/2,
parameter counts 2/1, bindings 5,1 and 1, then both exact one-row responses
`1,1,5`. No ERR packet occurs. All 36 existing SQL startup assertions and the
projection/aggregate checks pass. The
[scoped receipt](evidence/native-shop-cart-quantity-20261121.json) records source,
SDK, binary and trace hashes. Auditing starts no additional Native execution.

Only the new fixture and evidence are added. Existing SQL core, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and original gate
mappings remain unchanged. Prior failure records, WAL and historical 349/349
evidence are retained; neither the full regression suite nor the original 71
gate is rerun or promoted. This proves the isolated DB quantity-change contract.
