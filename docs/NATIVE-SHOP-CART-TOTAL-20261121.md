# Native cart total with server-side SUM

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL cart-total fixture](../tests/native-shop-cart-total.fls)
passes 1/1 after the scoped SQL and engine changes. Fresh storage contains
products `(1, SKU-1, Demo Widget, 1500)`, `(2, SKU-2, Demo Gadget, 2200)` and
cart rows `(1,1,2)`, `(2,2,1)`. It prepares and executes this exact SQL once,
with no parameters:

```sql
SELECT SUM(shop_cart.qty * shop_products.price) FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id
```

The Native server returns exactly one row with value `5200`, labeled
`SUM(shop_cart.qty * shop_products.price)`. The fixture checks the received
value without calculating line totals or adding them. Its SHA, SQL, spaces and
expectations are unchanged across all three separately authorized cohorts.

`src/sql-core.fls` recognizes a sole SUM of two qualified columns multiplied
on the existing two-table INNER JOIN. It reuses the multiplication AST and its
qualifier validation. Unsupported SUM shapes are rejected before the legacy
basic JOIN fallback can turn them into wildcard SELECT. Six checks reject a
single-column SUM, a literal operand, an unknown qualifier, SQL AS, AVG and
COUNT of the product. Existing WHERE/ORDER JOIN paths and COUNT parsing stay
unchanged. The aggregate AST's existing `alias` key supplies the default
expression column label; no SQL alias syntax is added.

Only `engine-aggregate-count` changes in `src/engine.fls`. Its SUM branch
passes the existing multiply AST through unchanged `engine-project-row`,
accumulates non-NULL values in the server, and returns one aggregate row.
The prior COUNT body is byte-identical as the else branch. `execute-select`
and all other engine functions remain unchanged. Existing grouped COUNT,
COUNT(*) and LEFT JOIN engine checks pass during daemon startup, alongside
36 SQL assertions, the four JOIN and four multiply scope guards, four ORDER BY
guards, the ordering-plan invariant and all six new SUM rejection checks.

The accepted cohort freshly parses, generates and links both daemon and
fixture under the unchanged 120s/2GiB limit and shared heavy flock.
Elapsed time is 97.075577 seconds, including both AOT builds; the process host
takes 0.598958 seconds. Native client and daemon each run once. Installed
Native socat relays opaque bytes. All framing, authentication, SQL and result
assertions are FreeLang; two private Python controllers outside the product
only qualify the trial and manage owned processes/files. All owned children
are reaped and Node-family attempts/executions are zero.

An offline audit of the same trace confirms six setup ACKs, original prepared
SQL, zero parameters, statement ID 1, the 10-byte EXECUTE, exactly one server
row `5200`, five response frames and no ERR packet. No additional Native run
is used for the audit. The [scoped receipt](evidence/native-shop-cart-total-20261121.json)
records source, SDK, binary, trace, audit and prior failure hashes.

The original cohort's ERR1064/HY000 `unsupported SELECT form` and the second
cohort's `qualified SUM scope guard failure` are preserved separately. The
latter occurred during SQL startup checks because legacy basic JOIN accepted
unsupported SUM as wildcard projection; it occurred before SUM execution.
Neither failed candidate was committed. Current source/fixture hashes and
the six negative assertions were checked after the final authorized change.

Earlier shopping contracts, original gate FAILs, WAL and historical 349/349
evidence remain preserved. The full regression suite and original 71 gate
were not rerun or promoted. This scoped DB proof does not establish complete
mall operation or payment processing.
