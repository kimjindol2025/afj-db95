# Native product lookup by SKU

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed [FL SKU fixture](../tests/native-shop-products-sku.fls) passes 1/1
on product HEAD `e39f6cf0`. It creates
`shop_products(id INT PRIMARY KEY, sku TEXT, name TEXT, price INT)` and seeds
both agreed products: `(1, SKU-1, Demo Widget, 1500)` and
`(2, SKU-2, Demo Gadget, 2200)`. It executes this exact statement once through
the existing Native MariaDB PREPARE path:

```sql
SELECT id, sku, name, price FROM shop_products WHERE sku=?
```

The EXECUTE binds string `SKU-2` as type 253 with its length-prefixed bytes.
The fixture requires exactly one row id `2`, sku `SKU-2`, name `Demo Gadget`,
price `2200`, and the four requested column names in order. Missing/extra rows,
wrong values, ERR packets and trailing bytes fail its Native FL assertions.
SQL spaces and the placeholder are preserved on the wire.

The one authorized trial takes 4.687852 seconds including fresh fixture AOT;
its runtime/process host takes 0.350025 seconds. It reuses the accepted cart
commit's Native daemon ELF after verifying its SHA256, all five source
dependencies and every SDK file against the producer receipt. Daemon AOT time
is excluded. Existing compiler/link flags, 120s/2GiB bounds and the shared heavy
flock apply. No automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. Authentication, setup, framing, string
binding and exact-row assertions are FreeLang. The fixed private Python process
host manages owned processes/files and makes no protocol/network requests.
It and the outer qualifier are two controllers outside the product. All owned
children are reaped; Node-family attempts and executions are zero.

The same trace independently verifies command bytes `3,3,3,22,23`, both seed
ACKs, original spaced SQL, parameter count 1, statement ID 1, type 253 and exact
`SKU-2` bytes in the 20-byte EXECUTE payload, and the single matching product.
All 36 SQL startup assertions and the projection/aggregate checks pass. The
[scoped receipt](evidence/native-shop-products-sku-20261121.json) records source,
SDK, binary and trace hashes. Auditing starts no additional Native execution.

Only the new fixture and evidence are added. Existing SQL core, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and original gate
mappings remain unchanged. Prior failure records, WAL and historical 349/349
evidence are retained; neither the full regression suite nor the original 71
gate is rerun or promoted. This proves the isolated DB SKU lookup contract.
