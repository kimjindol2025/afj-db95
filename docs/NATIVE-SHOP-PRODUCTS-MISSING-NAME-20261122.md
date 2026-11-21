# Native missing product name lookup

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL missing-name fixture](../tests/native-shop-products-missing-name.fls)
passes 1/1 through the existing Native MariaDB PREPARE path. Fresh storage
contains `(1, SKU-1, Demo Widget, 1500)` and `(2, SKU-2, Demo Gadget, 2200)`.
It prepares and executes this SQL once with VAR_STRING bind `'No Such Item'`:

```sql
SELECT id, sku, name, price FROM shop_products WHERE name=?
```

The server returns zero rows and no ERR. Its empty result uses one `result`
column; the fixture accepts empty-result metadata without requiring `id`,
and rejects any row. It checks the server result without filtering on the
client. Spaces within the bound name, SQL commas and SQL spaces are preserved.

No implementation file changes. The accepted current daemon AOT from
`ec7d2988` is reused after all five dependency hashes and the entire fixed
SDK match its producer receipt. The new FL client is freshly parsed,
generated, syntax-checked and linked, then runs once with that daemon and
installed Native socat relaying opaque bytes. Framing, authentication,
setup, binding and assertions are FreeLang. Two private Python controllers
outside the product only qualify the trial and manage owned process/file
lifetimes. All owned children are reaped; Node-family attempts/executions
are zero.

Elapsed time is 5.254511 seconds for fresh client AOT and runtime, excluding
cached daemon AOT. Process-host time is 0.450897 seconds. Limits remain
120 seconds and 2GiB with one shared heavy flock acquisition and no forced
release or automatic retry.

An offline audit of the same trace verifies three setup ACKs, exact prepared
SQL, parameter count 1, statement ID 1, type 253, the length-prefixed
12-byte `No Such Item` value and the empty result's consecutive EOF frames.
There are six client frames, ten daemon frames and zero ERR. Existing 36
SQL assertions, JOIN/multiply/ORDER guards, six SUM and four SUM WHERE guards,
and grouped COUNT/COUNT(*) engine checks pass at startup. No extra Native
run is used for the audit. The
[scoped receipt](evidence/native-shop-products-missing-name-20261122.json)
records source, SDK, binary, trace and audit hashes.

Prior shopping proofs, failure records, WAL and historical 349/349 evidence
remain preserved. Full regression and the original 71 gate are not rerun
or promoted. SQL core, engine, parser/compiler, daemon, TLS, ACK and
original25 remain unchanged.
