# Native visible products ordered by price without LIMIT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-visible-price-order.fls)
passes 1/1 after the approved SQL-only addition. Fresh storage contains
`(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
The Native client prepares this exact SQL and binds INT32 `1` once:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? ORDER BY price
```

The server returns exactly two rows in the required order:
`SKU-1 / Demo Widget / 1500`, then `SKU-2 / Demo Gadget / 2200`, with
columns `sku,name,price` and ERR0. The fixture appends received rows and
compares their ordered values; it does not sort, filter or truncate them.
The fixed seeds are already in increasing price order. Seeds, SQL spaces,
bind, expected order and fixture SHA match the preserved earlier
`ERR1064 / HY000 / unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. A bounded helper recognizes the plain
identifier projection/table, one equality WHERE and one ascending ORDER BY
key, producing existing AST fields with `order-by` and no `limit`. The
engine's unchanged filter/order/project pipeline handles both rows.
Existing standard, LIMIT/OFFSET and literal-LIKE parser functions are
byte-identical. All prior guards remain; four added checks reject explicit
ASC, multiple ordering keys, an extra AND predicate and projection aliases.
No engine, runtime, FreeLang parser/compiler or protocol implementation changes.

Daemon AOT preparation is separate from the Native gate. Fixed-SDK strict
parse, generation, C syntax and link complete in 152.702784
seconds under 2GiB in a separate bounded preparation process, executing
no Native client or daemon application. Candidate dependencies, full SDK,
ELF, generated C and trace hashes are checked before the gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE on fresh storage: 5.915802 seconds, including
0.680293 seconds in the owned process host. Daemon AOT
is not repeated inside that gate. One Native FL client, one Native daemon
and installed socat opaque byte relay execute. Protocol framing,
authentication, setup, binding and assertions are FreeLang. Private Python
controls validation and owned process/file lifetimes outside the product.
All owned children are reaped, Node attempts/executions are zero, and the
shared flock is acquired naturally without force release or automatic retry.

An offline audit of that single trace checks five setup ACKs, exact SQL,
statement1, one INT32 bind1, three columns, both row payloads in received
order and ERR0. It sees eight client frames and 16 daemon frames. SQL36,
JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4,
OFFSET4, LIKE6, new WHERE/ORDER4 and engine COUNT startup checks pass.
No extra Native run is used. The [receipt](evidence/native-shop-products-visible-price-order-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failure hashes.

Earlier shopping/page/LIKE proofs, plain-SUM NULL, original COUNT fresh-both
TIMEOUT FAIL, WAL and historical 349/349 evidence remain preserved. Full
regression and original71 gates are not rerun or promoted. Engine,
FreeLang parser/compiler, daemon/protocol, TLS, ACK and original25 remain unchanged.
