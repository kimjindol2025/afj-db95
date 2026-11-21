# Native nonempty cart COUNT

STATUS=SCOPED_PASS; ORIGINAL_FRESH_BOTH_TIMEOUT=FAIL_PRESERVED;
COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FL nonempty COUNT fixture](../tests/native-shop-cart-user-count.fls)
passes 1/1 using the existing Native MariaDB PREPARE path. Fresh storage
contains the two agreed products and only cart row `(2,20,2,1)`, so user 20
has one line and user 10 has none. It prepares and executes this SQL once
with INT32 bind `20`:

```sql
SELECT COUNT(*) FROM shop_cart WHERE user_id=?
```

The server returns exactly one text value `1`, row payload `01 31`, with
no ERR. The fixture rejects a zero or NULL value and performs no client
counting or value conversion. It uses no IFNULL wrapper. SQL spaces,
products and cart seed remain as agreed.

No implementation file changes. The existing daemon ELF qualified at
`0e52a8a5` is reused after all five source dependencies and the entire
fixed SDK match its accepted recovery receipt. Its SHA is
`8720cfded21cd575234fd0d5ef1c8928c4016a9daa345d4c0c43ff813688390f`.
Daemon flc/gcc/ld are not rerun. Only the FL client is freshly parsed,
generated, syntax-checked and linked before one Native run. The original
AOT-included 120.036687-second TIMEOUT remains FAIL and is not promoted by
this result.

Elapsed time is 4.765726 seconds for client AOT and runtime, excluding
daemon AOT; process-host time is 0.441212 seconds. Limits remain
120 seconds and 2GiB with one shared heavy flock acquisition and no forced
release or automatic retry. One Native FL client, one qualified Native
daemon and installed Native socat opaque byte relay execute. Framing,
authentication, setup, binding and assertions are FreeLang. Two private
Python controllers outside the product only qualify the trial and manage
owned process/file lifetimes. All owned children are reaped; Node-family
attempts/executions are zero.

An offline audit of the same trace verifies five setup ACKs, the user-20
cart seed, exact SQL, parameter count 1, statement ID 1, INT32 bind 20 and
one `COUNT(*)` column containing text `1`. There are eight client frames,
13 daemon frames and zero ERR. The two flc and two gcc calls build only
the client. Existing 36 SQL assertions, JOIN/multiply/ORDER guards,
SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4 and legacy COUNT engine checks pass
at startup. No extra Native run is used for the audit. The
[scoped receipt](evidence/native-shop-cart-user-count-20261122.json) records
source, SDK, binary, trace and audit hashes.

Prior empty COUNT recovery, original COUNT timeout, shopping proofs,
plain-SUM NULL record, WAL and historical 349/349 evidence remain preserved.
Full regression and the original 71 gate are not rerun or promoted. SQL
core, engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
