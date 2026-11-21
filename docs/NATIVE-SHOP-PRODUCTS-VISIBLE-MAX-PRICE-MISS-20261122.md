# Native visibility plus maximum-price filter with no match

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-visible-max-price-miss.fls)
passes 1/1 on product HEAD `50b343f6`, with no implementation changes.
Fresh storage contains `(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It uses the same prepared SQL as the successful combined upper bound:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND price <= ?
```

The two INT32 binds are `1`, then `1000`. Both products cost more than
1000. The Native server returns exactly zero rows and ERR0, with header
`01`, metadata `[result]` and two EOF payloads `fe00000200`. The fixture
accepts valid empty metadata, rejects any row and does not filter,
truncate or fabricate a result. Original SQL whitespace is retained.

The current successful Native daemon ELF is reused after verifying its
SHA, five dependency source hashes and full SDK map against the committed
product. Daemon AOT executions are zero. The unchanged 120s/2GiB gate
builds only the client ELF and runs one PREPARE/EXECUTE:
5.870392 seconds, including 0.780018 seconds
in the owned process host. Source, fixture, SDK and daemon bytes remain
unchanged throughout.

One Native FL client, one cached Native daemon and installed socat opaque
byte relay execute. Framing, authentication, setup, binds and assertions
are FreeLang. Two private Python controllers outside the product qualify
the trial and manage owned process/file lifetimes. All owned children are
reaped, Node attempts/executions are zero, and shared flock is acquired
naturally without forced release, duplicates or automatic retry.

An offline audit of the single trace checks five setup ACKs, exact SQL,
statement1, parameter count2, two INT32 types and values1/1000, zero row
frames and ERR0. It sees eight client frames and 12 daemon frames. SQL36,
JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4,
OFFSET4, LIKE6, WHERE/ORDER4, numeric-bound4, numeric-interval4,
equality/numeric-bound4 and engine COUNT startup checks pass. An early
audit read before result-file creation stopped with FileNotFoundError;
only that read-only audit was repeated after Native PASS. The authorized
Native trial ran once, with no product changes or Native rerun. The
[receipt](evidence/native-shop-products-visible-max-price-miss-20261122.json)
records source, SDK, cached producer, build/run traces, binaries, audits
and the audit-timing correction.

The upper-bound hit proof, prior shopping proofs, original1064 records,
original COUNT fresh-both TIMEOUT FAIL, plain-SUM NULL, WAL and historical
349/349 evidence remain preserved. Full regression and original71 gates
are not rerun or promoted. SQL core, engine, FreeLang parser/compiler,
daemon/protocol, TLS, ACK and original25 remain unchanged.
