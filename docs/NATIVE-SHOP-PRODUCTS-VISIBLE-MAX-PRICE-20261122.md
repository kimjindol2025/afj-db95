# Native product visibility combined with an inclusive maximum price

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-visible-max-price.fls)
passes 1/1 after the approved SQL-only addition. Fresh storage contains
`(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It prepares the exact agreed SQL and binds INT32 `1`, then `1500` once:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND price <= ?
```

The server returns exactly one row `SKU-1 / Demo Widget / 1500`, with
columns `sku,name,price`, no SKU-2 and ERR0. The price boundary is included.
The fixture checks received values without filtering, truncating or
constructing results. Seeds, original SQL whitespace, both binds,
expectation and fixture SHA match the preserved earlier
`ERR1064 / HY000 / unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. The equality+numeric-bound helper now
permits both inclusive operators after AND and emits the actual operator
token. Its name and guard marker describe both bounds. The previous
`=? AND >= ?` validation/value/AST path is source-equivalent. Standard,
LIMIT/OFFSET, WHERE/ORDER, LIKE, standalone-bound and numeric-interval
helper bodies remain byte-identical. The newly valid mixed `<=` rejection
changes to strict `<`; OR, strict `>` and alias rejection checks remain.
The entire engine file is unchanged and reuses its existing AND filtering.

Daemon AOT is outside the Native gate. Fixed-SDK strict parse, generation,
C syntax and link complete in 188.625627 seconds under 2GiB
within the separate 240s preparation cap, executing no Native client or
daemon application. Dependencies, SDK, ELF, generated C and trace hashes
are verified before the client gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE in fresh storage: 5.940604 seconds, including
1.005200 seconds in the owned process host. Daemon AOT
is not repeated inside that gate. Shared flock is acquired naturally with
no forced release or duplicate. One Native FL client, one Native daemon
and installed socat opaque byte relay execute. Framing, authentication,
setup, binds and assertions are FreeLang. Private Python qualifies the
trial and manages owned process/file lifetimes outside the product. All
owned children are reaped and Node attempts/executions are zero.

An offline audit of the single trace checks five setup ACKs, exact SQL,
statement1, parameter count2, two INT32 types and values1/1500, three
columns, the boundary row and ERR0. It sees eight client frames and
15 daemon frames. SQL36, JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6,
COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6, WHERE/ORDER4, numeric-bound4,
numeric-interval4, updated equality/numeric-bound4 and engine COUNT
startup checks pass. No extra Native run is used. The
[receipt](evidence/native-shop-products-visible-max-price-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failures.

Earlier combined-lower-bound and other shopping proofs, plain-SUM NULL,
original COUNT fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence
remain preserved. Full regression and original71 gates are not rerun or
promoted. Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
