# Native visible product name contains search

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-visible-name-like.fls) passes 1/1 after a
SQL-only change. Fresh storage contains two visible products,
`(1, SKU-1, Demo Widget, 1500, 1)` and `(2, SKU-2, Demo Gadget, 2200, 1)`,
and cart row `(2,20,2,1)`. It prepares this original SQL once and binds
INT32 `1` followed by VAR_STRING `%Widget%`:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND name LIKE ?
```

The server returns exactly one row `SKU-1 / Demo Widget / 1500`, columns
`sku,name,price`, no SKU-2 and ERR0. The client checks received rows without
filtering, truncating, sorting or constructing them. The original failed
trial remains 0/1, ERR1064 / HY000 / unsupported SELECT form in
5.769400s. Both trials use identical fixture bytes, seeds, SQL
whitespace, binds and expectation.

Only `src/sql-core.fls` changes. A bounded equality-AND-LIKE helper validates
the integer equality and reuses the existing `%literal%` LIKE validator.
It emits the existing `where.and` AST; the entire engine is byte-identical.
All prior parser helper bodies and guards are byte-identical. Seven new
scope checks reject OR, prefix-only, suffix-only, underscore, interior
percent, ESCAPE and projection alias forms. General LIKE/collation support
is outside this bounded contains contract.

Fixed-SDK daemon parse, generation, C syntax and link complete separately
in 202.764292s under 2GiB, outside the unchanged 120s Native gate
and within the separate 240s preparation cap. This preparation executes
no Native client or daemon application. Source dependencies, full SDK,
ELF, generated C and trace hashes are verified before reuse.

The 120s/2GiB gate builds only the client and executes one PREPARE/EXECUTE:
5.807571s including 0.895629s in the owned process
host. Shared flock is acquired naturally, with no forced release or
duplicate run. One Native FL client, one Native daemon and the installed
socat opaque relay execute in fresh private storage and loopback namespace.
FreeLang implements protocol, authentication, SQL setup, binds and
assertions. Private Python manages validation and owned process/file
lifetimes outside the product. All owned children are reaped; Node attempts
and executions are zero.

An offline audit of that single trace verifies all five setup ACKs, exact
SQL, parameter count2, INT32/VAR_STRING payload, one result row, three
columns, EOF status and ERR0. It observes eight client and 15 daemon frames.
Existing SQL36 and the JOIN, multiply, SUM, IFNULL, COUNT, LIMIT/OFFSET,
LIKE, ordering and numeric/equality-bound startup checks pass, alongside
the seven new guards. No additional Native run is used. The
[receipt](evidence/native-shop-products-visible-name-like-20261122.json) records hashes and evidence.

Previous PASS and FAIL evidence, ordinary empty SUM NULL, original COUNT
fresh-both TIMEOUT, WAL and historical349/349 remain preserved. Full
regression and original71 are not rerun or promoted. Engine, FreeLang
parser/compiler, daemon/protocol, TLS, ACK and original25 remain unchanged.
