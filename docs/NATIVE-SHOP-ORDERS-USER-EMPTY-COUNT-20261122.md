# Native empty per-user order count returns one non-NULL zero

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-orders-user-empty-count.fls)
passes 1/1 on product HEAD `91f6132b`, with no implementation changes.
It seeds both visible products and cart row `(2,20,2,1)` exactly as agreed.
An empty `shop_orders` table uses the existing order schema from
`tests/native-shop-orders-user.fls`: id INT PRIMARY KEY, user_id INT,
product_id INT, qty INT and total INT. No order INSERT runs; user10 has
no orders. The client prepares this exact SQL and binds INT32 `10` once:

```sql
SELECT COUNT(*) FROM shop_orders WHERE user_id=?
```

The Native server returns exactly one row containing text `0`, with
column `COUNT(*)`, row payload `0130` and ERR0. SQL NULL `0xfb` is absent.
The fixture rejects a missing/extra row, NULL, trailing bytes and any value
other than server-returned `0`. It uses neither IFNULL nor client-side
counting or zero substitution.

The current successful Native daemon ELF from commit `50b343f6` is reused
after checking its SHA, five dependency source hashes and full SDK map
against current product HEAD. Daemon AOT executions are zero. The
unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE: 5.250046 seconds, including
0.787361 seconds in the owned process host. Source,
fixture, SDK and daemon bytes remain unchanged throughout.

One Native FL client, one cached Native daemon and installed socat opaque
byte relay execute. Framing, authentication, six setup commands, binding
and assertions are FreeLang. Two private Python controllers outside the
product qualify the trial and manage owned process/file lifetimes. All
owned children are reaped, Node attempts/executions are zero, and shared
flock is acquired naturally without forced release, duplicates or automatic retry.

An offline audit of the single trace checks six setup ACKs, the empty
orders CREATE, absence of order INSERTs, exact SQL, statement1, parameter
count1, INT32 bind10, one non-NULL text0 row and ERR0. It sees nine client
frames and 14 daemon frames. SQL36, JOIN/multiply/ORDER, SUM6,
SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6, WHERE/ORDER4,
numeric-bound4, numeric-interval4, equality/numeric-bound4 and engine
COUNT startup checks pass. No extra Native run is used. The
[receipt](evidence/native-shop-orders-user-empty-count-20261122.json)
records source, schema, SDK, cached producer, build/run traces, binaries and audits.

Prior shopping proofs, original1064 records, original COUNT fresh-both
TIMEOUT FAIL, plain-SUM NULL, WAL and historical 349/349 evidence remain
preserved. Full regression and original71 gates are not rerun or promoted.
SQL core, engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
