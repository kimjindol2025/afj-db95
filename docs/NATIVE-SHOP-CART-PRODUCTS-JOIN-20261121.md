# Native cart and product qualified INNER JOIN

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL JOIN fixture](../tests/native-shop-cart-products-join.fls)
passes 1/1 after the scoped `src/sql-core.fls` addition. In fresh storage it
creates the agreed product `(1, SKU-1, Demo Widget, 1500)` and cart `(1,1,2)`,
then prepares this original SQL and executes it once with integer binding 1:

```sql
SELECT shop_cart.qty, shop_products.price FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id WHERE shop_cart.id=?
```

The result must be exactly one row qty `2`, price `1500`, with those two column
names in order. The SQL, spaces, placeholder, binding, expected row and fixture
SHA are identical to the earlier ERR1064/HY000 `unsupported SELECT form` cohort.
That FAIL receipt, wire response and source snapshot are preserved uncommitted.
The JOIN is not split into separate SELECTs.

Only the SQL parser implementation changes. The new branch accepts a qualified
identifier projection over exactly two distinct tables, one ON equality and
one qualified equality filter on the left table. It reuses the engine's existing
row-qualification fields with the actual relation names, retains qualified
projection/ON references, and gives the existing left-source filter/index its
bare predicate column. No SQL alias syntax, LEFT JOIN or third table is added.
Unknown qualifiers, SQL aliases, a right-table WHERE and duplicate output names
are rejected; all four new rejection checks pass. Existing engine, daemon,
wire protocol and FreeLang parser/compiler remain unchanged.

The accepted single cohort freshly parses, generates and links both daemon and
fixture in 63.408778 seconds under 120s/2GiB and the shared heavy flock. Its
runtime/process host takes 0.360918 seconds. One Native FL fixture, one fresh
Native daemon and one installed Native socat opaque byte relay execute.
Authentication, framing, all setup/SQL/binding and exact-row assertions are
FreeLang. Two private Python controllers outside the product only qualify the
trial and manage owned process/file lifetimes. The process host makes no protocol
or network requests. All owned children are reaped; Node-family attempts and
executions are zero. Each cohort ran once under separate authorization.

The same trace independently verifies four setup ACKs, command bytes
`3,3,3,3,22,23`, one PREPARE/EXECUTE pair, the full original JOIN query, statement
ID 1, bound integer 1 and the exact two-column row. No ERR packet occurs in the
accepted cohort. All 36 prior SQL startup assertions, the projection missing-comma
guard and aggregate/LEFT JOIN checks pass, as do the four new scope guards. The
[scoped receipt](evidence/native-shop-cart-products-join-20261121.json) records
source, binary, SDK and trace hashes. Auditing starts no additional Native run.

Prior shopping fixtures and failure records, WAL and historical 349/349 evidence
are retained. The full regression suite and original 71 gate are not rerun or
promoted. Original gate mappings, TLS, ACK and original25 remain unchanged.
This proves the agreed isolated DB JOIN contract.
