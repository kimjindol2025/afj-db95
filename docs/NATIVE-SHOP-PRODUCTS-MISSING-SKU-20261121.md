# Native missing SKU lookup

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL missing-SKU fixture](../tests/native-shop-products-missing-sku.fls)
passes 1/1 on product HEAD `b2dc50a1`. It creates `shop_products` and seeds
`(1, SKU-1, Demo Widget, 1500)` and `(2, SKU-2, Demo Gadget, 2200)`, then
prepares this unchanged SQL and binds the string `SKU-MISSING` once:

```sql
SELECT id, sku, name, price FROM shop_products WHERE sku=?
```

The fixture requires zero rows and no ERR. It consumes the actual resultset
metadata without requiring an `id` column name for the empty result. The
observed response has header `01`, one column `result`, and EOFs
`fe00000200` (status `0x0002`) with no row packet.

The sole Native contract execution passes in 4.706575 seconds including fresh
fixture AOT; its runtime/process host takes 0.460259 seconds. Before it, a
private controller still named an older daemon producer, and the source guard
stopped qualification before any flc, GCC, daemon or fixture execution. That
pre-Native receipt is preserved separately, with Native executions zero. The
corrected controller uses the verified current daemon from `b2dc50a1`; the
fixture and product sources did not change. There was no repeated Native trial.

The accepted cohort verifies the daemon SHA256, all five source dependencies
and every SDK file against the producer receipt before reuse. Daemon AOT time
is excluded. Existing compiler/link flags, 120s/2GiB bounds and the shared heavy
flock apply. One Native FL fixture, one existing Native MariaDB daemon and one
installed Native socat opaque byte relay execute, and all owned children are
reaped. Framing, authentication, setup, binding and zero-row/ERR assertions are
FreeLang. Two private Python controllers qualify the accepted trial and manage
owned processes/files; the earlier qualification controller is recorded
separately. The process host makes no protocol/network requests. Node-family
attempts and executions are zero.

The same trace independently verifies command bytes `3,3,3,22,23`, both seed
ACKs, the exact spaced query, statement ID 1, type 253 and the exact eleven-byte
`SKU-MISSING` string in the 26-byte EXECUTE payload, then the zero-row result.
All 36 SQL startup assertions plus the existing four JOIN and four multiply
scope guards pass. The
[scoped receipt](evidence/native-shop-products-missing-sku-20261121.json) records
source, SDK, binary, trace and qualification hashes. Auditing starts no new
Native execution.

Only the new fixture and evidence are added. Existing SQL core, engine, daemon,
FreeLang parser/compiler, protocol, prior shopping fixtures and gate mappings
remain unchanged. Prior failures, WAL and historical 349/349 evidence are
retained; the full regression suite and original 71 gate are not rerun or
promoted. This proves the isolated missing-SKU DB contract.
