# Native inclusive product price BETWEEN

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-price-between.fls) passes 1/1 after a
SQL-only change. Fresh storage contains `(1, SKU-1, Demo Widget, 1500, 1)`
and `(2, SKU-2, Demo Gadget, 2200, 1)`, plus cart row `(2,20,2,1)`.
It prepares this original SQL once and binds INT32 `1500`, then `2200`:

```sql
SELECT sku, name, price FROM shop_products WHERE price BETWEEN ? AND ?
```

The server returns exactly two rows, `SKU-1 / Demo Widget / 1500` and
`SKU-2 / Demo Gadget / 2200`, each once, with columns `sku,name,price`
and ERR0. Both boundary values are included. Result order is unspecified;
the client checks either received order without sorting, filtering,
truncating or constructing rows. Fixture SHA, seeds, SQL whitespace,
binds and expectation match the preserved original 0/1 ERR1064 / HY000 /
unsupported SELECT form trial (5.825357s). The fixed three-column
projection was explicitly confirmed before this one execution.

Only `src/sql-core.fls` changes. A bounded BETWEEN token form delegates
to the existing integer numeric-interval validator and emits the existing
`where.and` inclusive >=/<= AST. Original wire SQL is unchanged. Every
prior helper and guard, including the >= AND <= helper, is byte-identical.
The entire engine is unchanged. Four new guards reject OR in place of
AND, NOT BETWEEN, decimal upper bounds and projection aliases.

The original combined daemon AOT remains TIMEOUT124 at 240.063695s
under its 240s/2GiB preparation bound. Its C generation completed; its
daemon ELF did not. That failed attempt is preserved. Separate approved
preparation steps reuse exactly that C and SDK: gcc object-only takes
196.422109s (whole preparation 196.460864s), exit0,
under its unchanged 240s/2GiB bound; direct ld takes 0.240163s
(whole preparation 0.279708s), exit0, under its unchanged bound.
The object step adds the authorized `-c` mode, retaining compiler options.
The ld argv is recovered from an existing successful same-SDK build;
only the input object and output ELF path change. No Native client or
daemon application executes during these preparation steps.

The separately linked daemon ELF, object, C, source dependencies, full SDK
and producer traces are hash-verified before use. The unchanged
120s/2GiB gate builds only the client ELF and executes one Native
PREPARE/EXECUTE in fresh storage: 5.921213s, including
1.087057s in the owned process host. Daemon AOT is not
repeated. The original combined AOT failure is not promoted by this
separate approved preparation and Native proof. Each authorized step
executes once; automatic retries and forced lock release are zero.

An offline audit of this single Native trace checks five setup ACKs,
exact SQL, statement1, parameter count2, both INT32 values, three columns,
both rows, EOF status0x0002 and ERR0. It sees eight client and 16 daemon
frames. Existing SQL36 and JOIN, multiply, SUM, IFNULL, COUNT, ordering,
LIMIT/OFFSET, LIKE, numeric and equality startup checks pass, together
with the four new BETWEEN guards. No extra Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in a private loopback namespace. FreeLang implements protocol,
authentication, setup, binds and assertions. Private Python manages
validation and owned process/file lifetimes outside the product. All
owned children are reaped; Node attempts/executions are zero. The
[receipt](evidence/native-shop-products-price-between-20261122.json) records every cohort and hashes.

Earlier PASS/FAIL evidence, original COUNT fresh-both TIMEOUT, ordinary
empty SUM NULL, WAL and historical349/349 remain preserved. Full
regression and original71 are not rerun or promoted. Engine, FreeLang
parser/compiler, daemon/protocol, TLS, ACK and original25 remain unchanged.
