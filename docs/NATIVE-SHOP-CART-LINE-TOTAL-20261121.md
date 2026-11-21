# Native server-computed cart line total

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL line-total fixture](../tests/native-shop-cart-line-total.fls)
passes 1/1 after the scoped parser/executor addition. It creates the agreed
product `(1, SKU-1, Demo Widget, 1500)` and cart `(1,1,2)` in fresh storage,
then prepares this original SQL and executes it once with integer binding 1:

```sql
SELECT shop_cart.qty, shop_products.price, shop_cart.qty * shop_products.price FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id WHERE shop_cart.id=?
```

The Native server returns exactly one row with three text values `2,1500,3000`.
The third unaliased column is named `shop_cart.qty * shop_products.price`.
The fixture labels that received third value `line_total` in its receipt;
it does not calculate the total. The SQL, spaces, bind, expected values and
fixture SHA remain identical to the prior ERR1064/HY000 `unsupported SELECT
form` cohort, whose source and FAIL/wire receipts are retained.

`src/sql-core.fls` now emits a multiply node for qualified-column multiplication
in this JOIN projection. It retains the existing qualified string columns,
validates both references against the two actual tables and derives the default
expression column label. Within `src/engine.fls`, only `engine-project-row`
changes: the old string-column path stays in place, and a multiply node reads
the actual joined row values, normalizes integer strings through the existing
numeric conversion, then multiplies on the Native server. All other engine
source bytes are unchanged. There is no query-specific constant result or
client-side arithmetic. New division, function, alias and literal-operand
syntax are rejected by four additional checks; all four previous JOIN scope
guards continue to pass.

The accepted single cohort freshly parses, generates and links daemon and
fixture in 88.410562 seconds under 120s/2GiB and the shared heavy flock. The
runtime/process host takes 0.347441 seconds. One Native FL fixture, one fresh
Native daemon and one installed Native socat opaque byte relay execute.
Authentication, framing, setup, binding and all result assertions are FreeLang.
Two private Python controllers outside the product only qualify the trial and
manage owned process/file lifetimes. The process host makes no protocol/network
requests. All owned children are reaped; Node-family attempts/executions are
zero. Each Native cohort ran once under separate authorization.

The same trace independently verifies four setup ACKs, command bytes
`3,3,3,3,22,23`, one original JOIN-expression PREPARE/EXECUTE, statement ID 1,
bound integer 1, the three column definitions, and `3000` in the actual daemon
send response. All 36 prior SQL assertions, projection/aggregate checks,
four existing JOIN guards and four new multiply guards pass. The
[scoped receipt](evidence/native-shop-cart-line-total-20261121.json) records
source, binary, SDK and trace hashes. Auditing starts no extra Native run.

Prior shopping fixtures and failure records, WAL and historical 349/349 evidence
are retained. Recovery/storage code outside the projection function is unchanged.
The full regression suite and original 71 gate are not rerun or promoted.
Daemon entry/protocol, FreeLang parser/compiler, gate mappings, TLS, ACK and
original25 remain unchanged. This proves the agreed isolated DB line-total
contract.
