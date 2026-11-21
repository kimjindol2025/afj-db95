# Native stock change from 10 to 8

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed [FL stock fixture](../tests/native-shop-stock-decrement.fls) passes
1/1 on product HEAD `13b51b87`. It creates `shop_products` with id INT PRIMARY
KEY, sku TEXT, name TEXT, price INT and stock INT, then seeds exactly
`(1, SKU-1, Demo Widget, 1500, 10)`. Through the existing Native MariaDB
PREPARE path it executes:

```sql
UPDATE shop_products SET stock=? WHERE id=?
SELECT id, stock FROM shop_products WHERE id=?
```

The UPDATE binds integers 8,1 once. The SELECT binds integer 1 once and must
return exactly one row id `1`, stock `8`, with those two column names in order.
The current daemon's UPDATE row resultset is consumed before issuing SELECT.
The agreed new stock value is explicitly bound; SQL whitespace is preserved.
All setup, framing, bindings and result assertions are FreeLang.

The one authorized trial takes 5.197195 seconds including fresh fixture AOT;
its runtime/process host takes 0.390373 seconds. It reuses the accepted cart
commit's Native daemon ELF after verifying its SHA256, all five source
dependencies and every SDK file against the producer receipt. Daemon AOT time
is excluded. Existing compiler/link flags, 120s/2GiB bounds and the shared heavy
flock apply. No automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. The fixed private Python process host
only manages owned processes/files and makes no protocol/network requests.
It and the outer qualifier are two controllers outside the product. All owned
children are reaped; Node-family attempts and executions are zero.

The same trace independently verifies command bytes `3,3,22,23,22,23`, stock
10 in the acknowledged seed, exact SQL, statement IDs 1/2, parameter counts
2/1, bindings 8,1 and 1, the UPDATE product row with stock 8, and the final
exact `id=1,stock=8` row. No ERR packet occurs. All 36 SQL startup assertions
and projection/aggregate checks pass. The
[scoped receipt](evidence/native-shop-stock-decrement-20261121.json) records
source, SDK, binary and trace hashes. Auditing starts no new Native execution.

Only the new fixture and evidence are added. Existing SQL core, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and original gate
mappings remain unchanged. Prior failure records, WAL and historical 349/349
evidence are retained; neither the full regression suite nor the original 71
gate is rerun or promoted. This proves the isolated agreed DB stock contract.
