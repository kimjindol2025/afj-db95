# Native product visibility combined with price BETWEEN

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [combined FreeLang fixture](../tests/native-shop-products-visible-price-between.fls) passes 1/1
following a SQL-only change. Fresh storage contains visible Widget
`(1, SKU-1, Demo Widget, 1500, visible=1)` and invisible Gadget
`(2, SKU-2, Demo Gadget, 2200, visible=0)`, plus cart row `(2,20,2,1)`.
It prepares the same three-column SQL once and binds INT32 `1`, `1500`
and `2200`, preserving comma/BETWEEN/AND whitespace:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND price BETWEEN ? AND ?
```

The server returns exactly one row `SKU-1 / Demo Widget / 1500`, columns
`sku,name,price`, with ERR0. Invisible SKU-2 is absent despite its price
being inside the inclusive range. The client checks received values
without sorting, filtering, truncating or constructing rows. Combined
fixture bytes, seeds, SQL, binds and expectation match the retained
0/1 ERR1064 / HY000 / unsupported SELECT form cohort (6.178534s).
The original standalone BETWEEN reference fixture remains byte-identical
at SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`.

Only `src/sql-core.fls` changes. The helper validates integer equality
and delegates the range to the existing BETWEEN validator. It emits
an outer AND with two predicates: the equality and an inner AND holding
both inclusive price bounds. This nesting preserves all three conditions
through the existing two-predicate index selection and recursive matcher.
The engine is byte-identical. All prior helper/guard bodies, including
standalone BETWEEN and equality with >=/<=, are byte-identical. Four new
guards reject OR before BETWEEN, NOT BETWEEN, decimal upper bounds and
projection aliases.

The fixed-SDK combined daemon AOT (strict parse, generation, C syntax,
gcc and ld) completes in 227.107261s under the unchanged combined
240s/2GiB preparation bound, outside the Native gate. No Native client
or daemon application executes during preparation. Full SDK, all source
dependencies, ELF, generated C and trace hashes are verified before reuse.

The unchanged 120s/2GiB gate builds only the client ELF and executes one
PREPARE/EXECUTE in fresh storage: 5.936247s, including
0.970542s in the owned process host. Daemon AOT is not
repeated during the gate. Shared flock is acquired naturally, without
force release or duplicate; each authorized stage runs once.

An offline audit of the same trace checks five setup ACKs, invisible
product2 seed0, exact SQL, statement1, parameter count3, three INT32
values, three result columns, one exact row, EOF status0x0002 and ERR0.
It sees eight client and 15 daemon frames. SQL36, standalone BETWEEN4,
equality/BETWEEN4 and existing JOIN, multiply, numeric/AND bounds,
equality/LIKE, ordering, LIMIT/OFFSET, SUM, IFNULL, COUNT and engine
startup checks pass. No additional Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in a private loopback namespace. FreeLang implements protocol,
authentication, setup, binding and assertions. Private Python manages
validation and owned process/file lifetimes outside the product. All
children are reaped; Node attempts/executions are zero. The
[receipt](evidence/native-shop-products-visible-price-between-20261122.json) records hashes and artifacts.

Prior 1064 failures, standalone BETWEEN combined AOT_EXIT_124, original
COUNT fresh-both TIMEOUT, ordinary empty SUM NULL, WAL and historical349/349
remain preserved. Full regression and original71 are not rerun or
promoted. Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK
and original25 remain unchanged.
