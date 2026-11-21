# Native visible product listing with ORDER BY and LIMIT 1

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL LIMIT fixture](../tests/native-shop-products-visible-limit.fls)
passes 1/1 after the scoped SQL parser addition. Fresh storage contains
both products with `visible=1`: `(1, SKU-1, Demo Widget, 1500)` and
`(2, SKU-2, Demo Gadget, 2200)`, plus cart row `(2,20,2,1)`. It prepares
and executes this exact SQL once with INT32 bind `1`:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? ORDER BY id LIMIT 1
```

The Native server returns exactly one row `sku=SKU-1, name=Demo Widget,
price=1500`, without ERR or a SKU-2 row. Both products are visible, so the
server must apply LIMIT. The fixture rejects an extra row and neither
filters nor truncates on the client. SQL spaces/commas, seeds, binding,
expectation and fixture SHA match the preserved earlier ERR1064/HY000
`unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. A bounded helper parses a plain identifier
projection, simple table, one simple equality WHERE, one ascending ORDER BY
identifier and literal LIMIT 1 into existing engine fields. Projection
comma/space handling uses the existing validated token normalizer; wire SQL
is unchanged. The prior standard parser body, including COUNT, remains
byte-identical. The engine is unchanged: it filters, sorts complete rows,
applies numeric limit 1, then projects the three requested fields. Sorting
by unprojected `id` is therefore retained. Four checks reject LIMIT2,
DESC, AND and a SQL projection alias.

As explicitly agreed, daemon AOT preparation runs separately outside the
Native test gate. Its strict parse, generation, C syntax and link complete
in 128.085299 seconds under the same fixed SDK/flags and 2GiB, with a
separate bounded preparation process. It executes no Native client or
daemon application. ELF, generated C, all five dependencies, full SDK and
trace hashes are verified before the Native gate.

The unchanged 120s/2GiB gate then builds only the client ELF and executes
one PREPARE/EXECUTE in fresh storage. It takes 5.411997 seconds;
process-host time is 0.565814 seconds. Daemon AOT is not repeated or
included in that gate. One Native FL client, one freshly prepared Native
daemon and installed Native socat opaque byte relay execute. All framing,
authentication, setup, binding and assertions are FreeLang. Two private
Python controllers outside the product qualify the Native trial and manage
owned process/file lifetimes; daemon preparation has its own separate
private controller. All owned runtime children are reaped; Node-family
attempts/executions are zero in both traces. Shared flock is acquired
naturally with no force release, automatic retry or Native-budget extension.

An offline audit of the single Native trace verifies five setup ACKs,
both `visible=1` products, exact SQL, parameter count 1, statement ID 1,
INT32 bind 1, exactly three columns and one server row. There are eight
client frames, 15 daemon frames and zero ERR. The Native gate's two flc
and two gcc calls build only the client. Existing SQL36, JOIN/multiply/ORDER,
SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, new LIMIT4 and COUNT engine checks
pass at startup. Engine and fixture bytes remain identical to their
baselines. No extra Native run is used for the audit. The
[scoped receipt](evidence/native-shop-products-visible-limit-20261122.json)
records source, SDK, both build/run traces, binaries, audits and retained
failure hashes.

Prior shopping proofs, plain-SUM NULL record, original COUNT fresh-both
TIMEOUT FAIL, WAL and historical 349/349 evidence remain preserved.
Full regression and the original 71 gate are not rerun or promoted.
Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and original25
remain unchanged.
