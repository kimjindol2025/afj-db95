# Native product upper-price filter includes the boundary

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-max-price.fls)
passes 1/1 after the approved SQL-only addition. Fresh storage contains
`(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It prepares this exact SQL, retaining spaces around `<=`, and binds
INT32 `1500` once:

```sql
SELECT sku, name, price FROM shop_products WHERE price <= ?
```

The server returns exactly one row `SKU-1 / Demo Widget / 1500`, with
columns `sku,name,price`, no SKU-2 and ERR0. The equal-price boundary is
included. The fixture checks received values without filtering, truncating
or constructing a result. Seeds, SQL spaces, bind, expectation and fixture
SHA match the preserved earlier `ERR1064 / HY000 / unsupported SELECT form`.

Only `src/sql-core.fls` changes. The existing numeric-bound helper now
permits `>=` and `<=` and emits the actual operator token with the same
signed-integer value AST. Its name is updated to describe both bounds.
The `>=` path retains its prior validation/value/AST, as checked against
the saved source. Standard, LIMIT/OFFSET, WHERE/ORDER and LIKE helper bodies
remain byte-identical. The newly valid `<=` rejection changes to strict `<`;
strict `>`, extra AND and alias rejection checks remain. The entire engine
file is unchanged and uses its existing inclusive comparison branch.

Daemon AOT runs outside the Native gate and completes strict parse,
generation, C syntax and link in 161.160684 seconds under the
fixed SDK/flags and 2GiB. The separate preparation cap is 240s after the
previous preparation took179.159s; it is outside the fixed 120s Native
client gate. Preparation executes no Native client or daemon application.
Candidate dependencies, SDK, ELF, generated C and trace hashes are
verified before the client gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE in fresh storage: 5.723689 seconds, including
0.659795 seconds in the owned process host. No daemon
AOT is repeated inside that gate. One Native FL client, one Native daemon
and installed socat opaque byte relay execute. Framing, authentication,
setup, binding and assertions are FreeLang. Private Python controls
validation and owned process/file lifetimes outside the product. All owned
children are reaped, Node attempts/executions are zero, and shared flock
is acquired naturally without force release or automatic retry.

An offline audit of the single trace checks five setup ACKs, exact SQL,
statement1, INT32 bind1500, three columns, the one boundary row and ERR0.
It sees eight client frames and 15 daemon frames. SQL36, JOIN/multiply/ORDER,
SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6,
WHERE/ORDER4, updated numeric-bound4 and engine COUNT startup checks pass.
No extra Native run is used. The [receipt](evidence/native-shop-products-max-price-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failures.

The previous >= Native proof, other shopping/page/LIKE/price-order proofs,
plain-SUM NULL, original COUNT fresh-both TIMEOUT FAIL, WAL and historical
349/349 evidence remain preserved. Full regression and original71 gates
are not rerun or promoted. Engine, FreeLang parser/compiler, daemon/protocol,
TLS, ACK and original25 remain unchanged.
