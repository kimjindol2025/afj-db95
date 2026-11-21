# Native visible products ordered by descending price

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-visible-price-desc.fls)
passes 1/1 on product HEAD `43e0f96f`, with no implementation changes.
Fresh storage contains `(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It prepares this exact SQL and binds INT32 `1` once:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? ORDER BY price DESC
```

The Native server returns exactly two rows in received order:
`SKU-2 / Demo Gadget / 2200`, then `SKU-1 / Demo Widget / 1500`, with
columns `sku,name,price` and ERR0. This reverses the ascending seed order.
The fixture checks the received row vector and does not sort, filter,
truncate or fabricate rows. The existing DESC parser and engine order
reversal implement the query without changes.

The current successful Native daemon ELF is reused only after checking its
SHA, all five source dependencies and full SDK map against the committed
product. Daemon AOT executions are zero. The unchanged 120s/2GiB gate
builds only the client ELF and runs one Native PREPARE/EXECUTE, completing
in 5.543600 seconds; owned process-host time is
0.691927 seconds. Source, fixture, SDK and daemon bytes
remain unchanged throughout the trial.

One Native FL client, one cached Native daemon and installed socat opaque
byte relay execute. Framing, authentication, setup, binding and assertions
are FreeLang. Two private Python controllers outside the product qualify
the trial and manage owned process/file lifetimes. All owned children are
reaped, Node attempts/executions are zero, and shared flock is acquired
naturally without forced release, duplicates or automatic retry.

An offline audit of that single trace checks five setup ACKs, exact SQL,
statement1, one INT32 bind1, three columns, both row payloads in descending
price order and ERR0. It sees eight client frames and 16 daemon frames.
SQL36, JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4,
LIMIT4, OFFSET4, LIKE6, WHERE/ORDER4 and engine COUNT startup checks pass.
No extra Native run is used. The [receipt](evidence/native-shop-products-visible-price-desc-20261122.json)
records source, SDK, cached producer, build/run traces, binaries and audits.

The ascending price proof, prior shopping/page/LIKE proofs, original1064
records, original COUNT fresh-both TIMEOUT FAIL, plain-SUM NULL, WAL and
historical 349/349 evidence remain preserved. Full regression and original71
gates are not rerun or promoted. SQL core, engine, FreeLang parser/compiler,
daemon/protocol, TLS, ACK and original25 remain unchanged.
