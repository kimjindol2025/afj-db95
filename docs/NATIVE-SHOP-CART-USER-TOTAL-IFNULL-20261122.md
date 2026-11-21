# Native nonempty cart total with IFNULL

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL nonempty IFNULL fixture](../tests/native-shop-cart-user-total-ifnull.fls)
passes 1/1 using the existing Native MariaDB PREPARE path. Fresh storage
has products `(1, SKU-1, Demo Widget, 1500)`, `(2, SKU-2, Demo Gadget, 2200)`
and only cart row `(2,20,2,1)`. It prepares and executes the same SQL as the
prior empty-cart contract, once, with INT32 bind `20`:

```sql
SELECT IFNULL(SUM(shop_cart.qty * shop_products.price), 0) FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id WHERE shop_cart.user_id=?
```

The server returns exactly one text value `2200`, row payload `04 32 32 30 30`,
with no ERR. The fixture rejects NULL and a zero result. It reads and checks
the server value without computing the total on the client. This confirms
that explicit IFNULL returns the original nonempty SUM value. SQL commas
and spaces, products and cart seeds remain as agreed.

No implementation file changes. The accepted daemon AOT from `fd18ae34`,
including the scoped IFNULL AST and result selection, is reused after all
five dependency hashes and the entire fixed SDK match its producer receipt.
The FL client is freshly parsed, generated, syntax-checked and linked, then
runs once with that daemon and installed Native socat relaying opaque bytes.
Framing, authentication, setup, binding and assertions are FreeLang. Two
private Python controllers outside the product only qualify the trial and
manage owned process/file lifetimes. All owned children are reaped;
Node-family attempts/executions are zero.

Elapsed time is 4.816804 seconds for fresh client AOT and runtime, excluding
cached daemon AOT. Process-host time is 0.474355 seconds. Limits remain
120 seconds and 2GiB with one shared heavy flock acquisition and no forced
release or automatic retry.

An offline audit of the same trace verifies five setup ACKs, the single
user-20 cart row, exact SQL, parameter count 1, statement ID 1, INT32 bind
20 and one server row `2200`. There are eight client frames, 13 daemon
frames and zero ERR. Existing 36 SQL assertions, JOIN/multiply/ORDER guards,
six SUM, four SUM WHERE and six IFNULL guards, and grouped COUNT/COUNT(*)
engine checks pass at startup. No extra Native run is used for the audit.
The [scoped receipt](evidence/native-shop-cart-user-total-ifnull-20261122.json)
records source, SDK, binary, trace and audit hashes.

Prior empty-IFNULL proof, plain-SUM NULL record, failure records, WAL and
historical 349/349 evidence remain preserved. Full regression and the
original 71 gate are not rerun or promoted. SQL core, engine,
parser/compiler, daemon, TLS, ACK and original25 remain unchanged.
