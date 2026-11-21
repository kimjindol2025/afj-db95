# Native re-add of the same cart product

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL cart re-add fixture](../tests/native-shop-cart-readd.fls) passes 1/1 on
product HEAD `24a72216`. It creates the agreed product seed id 1 (SKU-1,
Demo Widget, price 1500) and cart row `(1,1,2)`, then prepares and executes:

```sql
UPDATE shop_cart SET qty=? WHERE product_id=?
SELECT id, product_id, qty FROM shop_cart WHERE product_id=?
```

The UPDATE binds integers 3,1 once. The SELECT binds integer 1 once and must
return exactly one row id `1`, product_id `1`, qty `3`, with those three column
names in order. A second matching row fails the exact-row EOF assertion. The
existing daemon's UPDATE resultset is consumed and checked before the SELECT.
SQL spaces are preserved.

The single authorized Native trial takes 5.057309 seconds including fresh
fixture AOT; its runtime/process host takes 0.390615 seconds. It reuses the
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

The same trace independently verifies command bytes `3,3,3,3,22,23,22,23`, the
initial qty 2 seed and setup ACKs, exact SQL, statement IDs 1/2, parameter counts
2/1, bindings 3,1 and 1, and both exact one-row `1,1,3` responses. No ERR or
second cart row occurs. All 36 SQL startup assertions plus the existing four
JOIN and four multiply scope guards pass. The
[scoped receipt](evidence/native-shop-cart-readd-20261121.json) records source,
SDK, binary and trace hashes. Auditing starts no extra Native execution.

Only the new fixture and evidence are added. Existing SQL core, engine, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and gate mappings
remain unchanged. Prior failures, WAL and historical 349/349 evidence are
retained; the full regression suite and original 71 gate are not rerun or
promoted. This proves the isolated same-product cart re-add contract.
