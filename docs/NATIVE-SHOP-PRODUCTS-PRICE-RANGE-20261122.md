# Native product price interval with two inclusive bounds

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-price-range.fls)
passes 1/1 after the approved SQL-only addition. Fresh storage contains
`(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It prepares this exact SQL, retaining spaces around comparisons and AND,
and binds INT32 `1500`, then `2200` once:

```sql
SELECT sku, name, price FROM shop_products WHERE price >= ? AND price <= ?
```

The server returns exactly two rows: one `SKU-1 / Demo Widget / 1500` and
one `SKU-2 / Demo Gadget / 2200`, with columns `sku,name,price` and ERR0.
Both boundary products are included. SQL does not specify order; the
fixture accepts either received order, checks exactly one of each record,
and returns received data unchanged. It does not sort, filter or fabricate
rows. Seeds, SQL spaces, both binds, expectation and fixture SHA match
the preserved earlier `ERR1064 / HY000 / unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. The bounded interval helper accepts the
same simple column with `>=` followed by AND and `<=`, and two signed
integer values. It emits the existing `where.and` vector of two range
predicates. The engine file is byte-identical, using its existing AND
candidate filtering and comparison paths. Standard, LIMIT/OFFSET,
WHERE/ORDER, LIKE and single numeric-bound helper bodies remain identical.
Four added checks reject OR, the reversed operator shape, a different
second column and projection aliases. No broader AND form is opened.

Daemon AOT is separate from the Native gate. Fixed-SDK strict parse,
generation, C syntax and link complete in 180.388705 seconds
under 2GiB within the separate 240s preparation cap. Preparation executes
no Native client or daemon application. Dependencies, full SDK, ELF,
generated C and trace hashes are verified before the client gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE in fresh storage: 5.893335 seconds, including
0.784297 seconds in the owned process host. No daemon
AOT is repeated inside that gate. One Native FL client, one Native daemon
and installed socat opaque byte relay execute. Framing, authentication,
setup, binding and assertions are FreeLang. Private Python controls
validation and owned process/file lifetimes outside the product. All owned
children are reaped, Node attempts/executions are zero, and shared flock
is acquired naturally without force release or automatic retry.

An offline audit of the single trace checks five setup ACKs, exact SQL,
statement1, parameter count2, two INT32 types and values1500/2200, three
columns, each boundary row once and ERR0. It sees eight client frames and
16 daemon frames. SQL36, JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6,
COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6, WHERE/ORDER4, numeric-bound4,
new numeric-interval4 and engine COUNT startup checks pass. No extra
Native run is used. The [receipt](evidence/native-shop-products-price-range-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failures.

Earlier single-bound and other shopping proofs, plain-SUM NULL, original
COUNT fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence remain
preserved. Full regression and original71 gates are not rerun or promoted.
Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and original25
remain unchanged.
