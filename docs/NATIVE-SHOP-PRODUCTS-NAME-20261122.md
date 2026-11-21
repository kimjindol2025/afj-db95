# Native product name lookup

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL product-name fixture](../tests/native-shop-products-name.fls)
passes 1/1 through the existing Native MariaDB PREPARE path. Fresh storage
contains products `(1, SKU-1, Demo Widget, 1500)` and
`(2, SKU-2, Demo Gadget, 2200)`. It prepares and executes this SQL once with
VAR_STRING bind `'Demo Widget'`:

```sql
SELECT id, sku, name, price FROM shop_products WHERE name=?
```

The server returns exactly one row `id=1, sku=SKU-1, name=Demo Widget,
price=1500`, with no ERR. Both products are seeded; the fixture checks all
received fields and rejects an extra row without filtering on the client.
The name's space, SQL commas and SQL spaces are preserved.

No implementation file changes. The accepted current daemon AOT from
`ec7d2988` is reused after all five dependency hashes and the entire fixed
SDK match its producer receipt. Its SQL core includes the prior SUM WHERE
change. The FL client is freshly parsed, generated, syntax-checked and
linked, then runs once with that daemon and installed Native socat relaying
opaque bytes. Framing, authentication, setup, binding and assertions are
FreeLang. Two private Python controllers outside the product only qualify
the trial and manage owned process/file lifetimes. All owned children are
reaped; Node-family attempts/executions are zero.

Elapsed time is 5.457504 seconds for fresh client AOT and runtime, excluding
cached daemon AOT. Process-host time is 0.439550 seconds. Limits remain
120 seconds and 2GiB with one shared heavy flock acquisition and no forced
release or automatic retry.

An offline audit of the same trace verifies three setup ACKs, exact prepared
SQL, parameter count 1, statement ID 1, type 253, the length-prefixed
11-byte `Demo Widget` value and exactly one four-column server row. There
are six client frames, 14 daemon frames and zero ERR. Existing 36 SQL
assertions, JOIN/multiply/ORDER guards, six SUM and four SUM WHERE guards,
and grouped COUNT/COUNT(*) engine checks pass at startup. No extra Native
run is used for the audit. The
[scoped receipt](evidence/native-shop-products-name-20261122.json) records
source, SDK, binary, trace and audit hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and
original25 remain unchanged.
