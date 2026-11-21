# Native product filter with a spaced minimum-price comparison

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-min-price.fls)
passes 1/1 after the approved SQL-only addition. Fresh storage contains
`(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
The Native client prepares this exact SQL, retaining spaces around `>=`,
and binds INT32 `2000` once:

```sql
SELECT sku, name, price FROM shop_products WHERE price >= ?
```

The server returns exactly one row `SKU-2 / Demo Gadget / 2200`, with
columns `sku,name,price`, no SKU-1 and no ERR. The fixture checks received
rows without filtering, truncating or constructing results. Seeds, SQL
spaces, binding, expectation and fixture SHA match the preserved earlier
`ERR1064 / HY000 / unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. A bounded helper accepts a plain projected
SELECT/table/WHERE column and a separate `>=` operator plus signed-integer
value token, emitting the existing range AST fields. The input SQL is
unchanged. The entire engine remains byte-identical and uses its existing
numeric comparison branch. Standard, LIMIT/OFFSET, WHERE/ORDER and literal
LIKE parser functions are also byte-identical. Four new checks reject
projected `>`, projected `<=`, an extra AND predicate and projection aliases;
existing wildcard-range and all other guard paths remain intact.

Daemon AOT is explicitly outside the Native gate. Fixed-SDK strict parse,
generation, C syntax and link complete in 179.159382 seconds
under 2GiB in the separate bounded preparation process. It executes no
Native client or daemon application. Candidate dependencies, full SDK,
ELF, generated C and trace hashes are verified before the gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE in fresh storage: 5.648800 seconds, including
0.670302 seconds in the owned process host. No daemon
AOT is repeated inside that gate. One Native FL client, one Native daemon
and installed socat opaque byte relay execute. Framing, authentication,
setup, binding and assertions are FreeLang. Private Python controls
validation and owned process/file lifetimes outside the product. All
owned children are reaped, Node attempts/executions are zero, and shared
flock is acquired naturally without force release or automatic retry.

An offline audit of the single trace checks five setup ACKs, exact SQL,
statement1, INT32 bind2000, three columns, the one server row and ERR0.
It sees eight client frames and 15 daemon frames. SQL36, JOIN/multiply/ORDER,
SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6,
WHERE/ORDER4, new projected->=4 and engine COUNT startup checks pass.
No extra Native run is used. The [receipt](evidence/native-shop-products-min-price-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failure hashes.

Earlier shopping/page/LIKE/price-order proofs, plain-SUM NULL, original
COUNT fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence remain
preserved. Full regression and original71 gates are not rerun or promoted.
Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and original25
remain unchanged.
