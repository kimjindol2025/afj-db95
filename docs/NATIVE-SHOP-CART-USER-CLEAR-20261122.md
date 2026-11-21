# Native per-user cart clearing

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL cart-clearing fixture](../tests/native-shop-cart-user-clear.fls)
passes 1/1 through the existing Native MariaDB PREPARE path. Fresh storage
contains cart rows `(1,10,1,2)` and `(2,20,2,1)` in
`shop_cart(id,user_id,product_id,qty)`. It executes each statement once:

```sql
DELETE FROM shop_cart WHERE user_id=?
SELECT id FROM shop_cart WHERE user_id=?
SELECT id, user_id, product_id, qty FROM shop_cart WHERE user_id=?
```

INT32 bindings are `[10]`, `[10]`, `[20]`. The final queries return zero
user-10 rows without ERR, followed by exactly one user-20 row
`id=2, user_id=20, product_id=2, qty=1`. SQL commas and spaces are preserved.
The existing DELETE response is a four-column resultset containing that
remaining user-20 row. The fixture consumes and checks it before the two
state queries. The zero-row SELECT may expose `result` metadata without
an `id` column; zero rows and absence of ERR remain strict.

The prior 0/1 cohort failed its one-column DELETE response assumption
(`NATIVE_SHOP_CART_USER_CLEAR_RESULT_HEADER`). An offline read of that
failed trace showed header `0x04`, the remaining `2/20/2/1` row, EOF status
`0x0002` and no ERR. The separately authorized correction changes only the
fixture's DELETE metadata/row expectation. Setup, all three SQL strings,
bindings and final state expectations are unchanged, and every other
fixture byte is identical. The failed fixture and receipts are preserved;
the failed candidate was not committed.

No implementation file changes. The accepted daemon AOT from `1414d4dd`
is reused after all five dependency hashes and the entire fixed SDK match
its producer receipt. The FL client is freshly parsed, generated,
syntax-checked and linked, then runs once with that daemon and installed
Native socat relaying opaque bytes. All framing, authentication, setup,
binds and assertions are FreeLang. Two private Python controllers outside
the product only qualify the trial and manage owned process/file lifetimes.
All owned children are reaped; Node-family attempts/executions are zero.

The accepted cohort takes 5.565512 seconds for fresh client AOT and runtime,
excluding cached daemon AOT; process-host time is 0.546334 seconds.
Limits remain 120 seconds and 2GiB with a shared heavy flock and no forced
release or automatic retry. Each cohort had its own single-run authorization.

An offline audit of the accepted trace verifies the table/two seed ACKs,
all three prepared SQL strings, statement IDs 1 through 3, bindings
`10,10,20`, the DELETE resultset and both final SELECT results. There are
10 client frames, 28 daemon frames and zero ERR. Existing 36 SQL assertions,
JOIN/multiply/ORDER/SUM guards and grouped COUNT/COUNT(*) engine checks pass
at startup. No extra Native run is used for the audit. The
[scoped receipt](evidence/native-shop-cart-user-clear-20261122.json) records
source, SDK, binary, trace, audit and retained failure hashes.

This is the prepared per-user mutation/readback contract; application
permission requests are outside the exercised path. Prior shopping proofs,
failure records, WAL and historical 349/349 evidence remain preserved.
Full regression and the original 71 gate are not rerun or promoted. SQL
core, engine, parser/compiler, daemon, TLS, ACK and original25 remain unchanged.
