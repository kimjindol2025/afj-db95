# Native order list

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed [FL order-list fixture](../tests/native-shop-orders-list.fls)
passes 1/1 on product HEAD `e82cd864`. It creates
`shop_orders(id INT PRIMARY KEY, product_id INT, qty INT, total INT)` and seeds:

| id | product_id | qty | total |
| --- | --- | --- | --- |
| 1 | 1 | 2 | 3000 |
| 2 | 2 | 1 | 2200 |

It then executes this exact statement through the existing Native MariaDB
PREPARE path, with zero parameters and one EXECUTE:

```sql
SELECT id, product_id, qty, total FROM shop_orders ORDER BY id
```

The fixture requires exactly two rows with all values above, in id order, and
column names `id,product_id,qty,total` in that order. Missing, extra or reordered rows,
incorrect values, ERR packets and trailing bytes fail the Native FL assertions.
SQL spaces are preserved on the wire.

The one authorized trial takes 4.955743 seconds including fresh fixture AOT;
its runtime/process host takes 0.462049 seconds. It reuses the accepted cart
commit's Native daemon ELF after verifying its SHA256, all five source
dependencies and every SDK file against the producer receipt. Daemon AOT time
is excluded. Existing compiler/link flags, 120s/2GiB bounds and the shared heavy
flock apply. No automatic retry was made.

One Native FL fixture, one existing Native MariaDB daemon and one installed
Native socat opaque byte relay execute. Authentication, setup, framing,
PREPARE/EXECUTE and exact ordered-row assertions are FreeLang. The fixed private
Python process host manages owned processes and files, makes no protocol/network
requests, and is counted alongside the outer qualifier as two controllers
outside the product. All owned children are reaped. Node-family attempts and
executions are zero.

The same trace independently verifies command bytes `3,3,3,22,23`, the two seed
ACKs, original spaced query, PREPARE parameter count zero, statement ID 1,
10-byte zero-parameter EXECUTE, four column definitions and both ordered rows.
All 36 SQL startup assertions plus projection/aggregate checks pass. The
[scoped receipt](evidence/native-shop-orders-list-20261121.json) records the
source, SDK, binary and trace hashes. Auditing starts no new Native execution.

Only the new fixture and its evidence are added. Existing SQL core, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and original gate
mappings remain unchanged. Prior failure records, WAL and historical 349/349
evidence are retained. Neither the full regression suite nor the original 71
gate is rerun or promoted. This proves the isolated DB list contract.
