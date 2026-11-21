# Native per-user cart total with server SUM

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL user-cart-total fixture](../tests/native-shop-cart-user-total.fls)
passes 1/1 after the scoped SQL suffix change. Fresh storage contains products
`(1, SKU-1, Demo Widget, 1500)`, `(2, SKU-2, Demo Gadget, 2200)` and cart rows
`(1,10,1,2)`, `(2,20,2,1)` in `shop_cart(id,user_id,product_id,qty)`.
It prepares and executes this exact SQL once with INT32 bind `10`:

```sql
SELECT SUM(shop_cart.qty * shop_products.price) FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id WHERE shop_cart.user_id=?
```

The Native server returns exactly one row `3000`, labeled
`SUM(shop_cart.qty * shop_products.price)`, with no ERR. Both users are
seeded, and the one server aggregate is restricted to user 10. The fixture
checks the received value without summing or filtering rows on the client.
Fixture SHA, SQL, spaces, binding and expected value are unchanged from
the retained ERR1064/HY000 `unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. SUM JOIN now accepts the existing qualified
left-table equality WHERE suffix while retaining the aggregate AST. The
existing bare predicate representation feeds the unchanged engine, which
filters left source rows before JOIN and then applies its existing SUM
branch. No engine change is needed. The prior WHERE-free SUM path and
COUNT parsing/evaluation are preserved. Existing six SUM rejection checks
are unchanged; four additional checks reject an unknown predicate qualifier,
unqualified predicate, AND and ORDER BY suffixes. No SQL alias is added.

Both daemon and fixture are freshly parsed, generated, syntax-checked and
linked in the accepted cohort. Elapsed time is 104.729211 seconds including
both AOT builds and runtime, under the original 120s/2GiB limit and shared
heavy flock. Process-host time is 0.462229 seconds. One Native daemon,
one Native FL fixture and installed Native socat opaque byte relay execute.
All framing, authentication, setup, binding and assertions are FreeLang.
Two private Python controllers outside the product only qualify the trial
and manage owned process/file lifetimes. All owned children are reaped;
Node-family attempts/executions are zero. Each cohort had separate
single-run authorization, with no automatic retry.

An offline audit of the same accepted trace verifies six setup ACKs and
both user seeds, exact SQL, parameter count 1, statement ID 1, INT32 bind 10,
one server row `3000`, nine client frames, 14 daemon frames and zero ERR.
Existing 36 SQL assertions, JOIN/multiply/ORDER guards, six SUM guards,
four new SUM WHERE guards and grouped COUNT/COUNT(*) engine checks pass at
startup. Engine and fixture bytes remain identical to their baselines.
No extra Native run is used for the audit. The
[scoped receipt](evidence/native-shop-cart-user-total-20261122.json) records
source, SDK, binary, trace, audit and retained failure hashes.

This proves the prepared per-user aggregate filter. Application permission
requests are outside the exercised path. Prior shopping proofs, failure
records, WAL and historical 349/349 evidence remain preserved. Full
regression and the original 71 gate are not rerun or promoted. Engine,
FreeLang parser/compiler, daemon, TLS, ACK and original25 remain unchanged.
