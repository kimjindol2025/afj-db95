# Native product visibility combined with a minimum price

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-visible-min-price.fls)
passes 1/1 after the approved SQL-only addition. Fresh storage contains
`(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It prepares the exact agreed SQL and binds INT32 `1`, then `2000` once:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND price >= ?
```

The server returns exactly one row `SKU-2 / Demo Gadget / 2200`, with
columns `sku,name,price`, no SKU-1 and ERR0. The fixture checks received
values without filtering, truncating or constructing a result. Seeds,
original SQL whitespace, both binds, expectation and fixture SHA match
the preserved earlier `ERR1064 / HY000 / unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. The bounded helper accepts an integer
equality token as used by the supplied `visible=?` SQL, AND, and a simple
column with a separate `>=` signed-integer value. It emits the existing
`where.and` vector with an equals predicate and a range predicate. The
entire engine file remains byte-identical and uses its existing AND
filtering. Standard, LIMIT/OFFSET, WHERE/ORDER, LIKE, single-bound and
numeric-interval helper bodies are unchanged. Four added checks reject
OR, mixed `<=`, mixed `>` and projection aliases. No broader AND form
or SQL whitespace rewrite is introduced.

Daemon AOT is outside the Native gate. Fixed-SDK strict parse, generation,
C syntax and link complete in 189.429061 seconds under 2GiB
within the separate 240s preparation cap, with no Native client/daemon
application executed. Dependencies, full SDK, ELF, generated C and trace
hashes are verified before the client gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE on fresh storage: 6.215177 seconds, including
0.884262 seconds in the owned process host. Daemon AOT
is not repeated inside that gate. Both original and fixed trials wait
naturally for shared flock; no lock is forced and no duplicate is launched.
One Native FL client, one Native daemon and installed socat opaque byte
relay execute. Framing, authentication, setup, binds and assertions are
FreeLang. Private Python qualifies the trial and manages owned process/file
lifetimes outside the product. All owned children are reaped and Node
attempts/executions are zero.

An offline audit of the single trace checks five setup ACKs, exact SQL,
statement1, parameter count2, two INT32 types and values1/2000, three
columns, the single server row and ERR0. It sees eight client frames and
15 daemon frames. SQL36, JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6,
COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6, WHERE/ORDER4, numeric-bound4,
numeric-interval4, new equality/lower-bound4 and engine COUNT checks
pass at startup. No extra Native run is used. The
[receipt](evidence/native-shop-products-visible-min-price-20261122.json)
records source, SDK, binaries, build/run traces, audits, lock snapshots
and retained failure hashes.

Earlier single-bound/interval and other shopping proofs, plain-SUM NULL,
original COUNT fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence
remain preserved. Full regression and original71 gates are not rerun or
promoted. Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
