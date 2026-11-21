# Native empty cart total with explicit IFNULL

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL IFNULL fixture](../tests/native-shop-cart-user-empty-total-ifnull.fls)
passes 1/1 after the scoped AST and aggregate-result changes. Fresh storage
contains products `(1, SKU-1, Demo Widget, 1500)`, `(2, SKU-2, Demo Gadget,
2200)` and only cart row `(2,20,2,1)`. User 10 has no cart row. The fixture
prepares and executes this exact SQL once with INT32 bind `10`:

```sql
SELECT IFNULL(SUM(shop_cart.qty * shop_products.price), 0) FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id WHERE shop_cart.user_id=?
```

The server returns exactly one text value `0` with row payload `01 30`,
without ERR or a NULL row payload. The result column is
`IFNULL(SUM(shop_cart.qty * shop_products.price), 0)`. The client only reads
and verifies server bytes; it performs no zero conversion or calculation.
Fixture SHA, setup, SQL spaces, binding and expectation are unchanged from
the retained IFNULL ERR1064/HY000 `unsupported SELECT form` cohort.

`src/sql-core.fls` accepts only this explicit IFNULL-of-qualified-product-SUM
form with numeric default 0 and the existing qualified left-table WHERE
suffix. It reuses the existing multiply/SUM AST and adds `if-null=0`.
The existing internal `alias` field supplies the default expression column
label; SQL AS syntax is rejected. Six new scope checks reject a nonzero
default, COUNT, nonmultiply SUM, SQL AS, missing WHERE and AND. Existing
six SUM and four SUM WHERE rejection blocks remain byte-identical.

In `src/engine.fls`, only SUM's final value selection inside
`engine-aggregate-count` changes. It substitutes 0 only when an explicit
`if-null=0` AST field is present and the original SUM result is nil.
Otherwise it returns that original result. All other engine bytes,
including COUNT, execute-select and engine-project-row, are identical.
The earlier ordinary-SUM empty input returned one NULL row (`fb`); its
zero-expectation failure remains preserved. That plain SUM fixture is not
rerun or promoted by this IFNULL pass. Its NULL path is retained by the
explicit AST guard, while existing grouped COUNT/COUNT(*) execution checks
pass at startup.

Both daemon and client are freshly parsed, generated, syntax-checked and
linked. The accepted cohort takes 111.707110 seconds including both AOT
builds and runtime, under 120s/2GiB and the shared heavy flock. Process-host
time is 0.601101 seconds. One Native daemon, one Native FL fixture
and installed Native socat opaque byte relay execute. Framing,
authentication, setup, binding and assertions are FreeLang. Two private
Python controllers outside the product only qualify the trial and manage
owned process/file lifetimes. All owned children are reaped; Node-family
attempts/executions are zero. Each IFNULL cohort has separate single-run
authorization, without automatic retry.

An offline audit of the same accepted trace verifies five setup ACKs,
only the user-20 cart seed, exact SQL, parameter count 1, statement ID 1,
INT32 bind 10 and the single non-NULL text `0` row. There are eight client
frames, 13 daemon frames and zero ERR. Existing 36 SQL assertions,
JOIN/multiply/ORDER guards, six SUM, four SUM WHERE and six IFNULL guards,
and COUNT engine checks pass at startup. No extra Native run is used for
the audit. The [scoped receipt](evidence/native-shop-cart-user-empty-total-ifnull-20261122.json)
records source, SDK, binary, trace, audit and retained failure hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
