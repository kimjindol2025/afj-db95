# Native product-name search with a bound literal LIKE pattern

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-name-like.fls)
passes 1/1 after the approved bounded SQL/engine addition. Fresh storage
contains products `(1, SKU-1, Demo Widget, 1500, visible=1)` and
`(2, SKU-2, Demo Gadget, 2200, visible=1)`, plus cart row `(2,20,2,1)`.
The Native client prepares this exact SQL and binds VAR_STRING `%Widget%`
once through the existing MariaDB PREPARE path:

```sql
SELECT sku, name, price FROM shop_products WHERE name LIKE ?
```

The server returns exactly one row `SKU-1 / Demo Widget / 1500`, with
columns `sku,name,price`, no SKU-2 row and no ERR. The client rejects extra
rows and checks every value, without filtering or constructing the result.
The seeds, SQL spaces/commas, binding, expectation and fixture SHA match
the preserved earlier `ERR1064 / HY000 / unsupported SELECT form` cohort.

Only two implementation files change. The SQL helper accepts a plain
identifier projection/table/WHERE column and a quoted `%literal%` pattern,
then emits `operator=LIKE` and the pattern. It removes only the surrounding
SQL quotes, preserving literal punctuation. Matching uses string inclusion,
not regular expressions. The engine adds only a LIKE branch in
`engine-match-basic?`, validates a nonempty percent-wrapped literal and
matches string values with case-sensitive containment. Prefix-only,
suffix-only, `_`, interior `%`, backslash and ESCAPE forms remain outside
this scope. Six startup checks reject unsupported forms and aliases.
This is a scoped contains-search contract, not general LIKE/collation support.

The old equality/range branches are retained. All engine bytes outside
that matching function are identical, including execute-select, aggregation,
projection and the existing OFFSET/LIMIT pipeline. The standard SQL parser
and bounded LIMIT/OFFSET helper are byte-identical to their baselines.
Read-only inspection first reported that the SQL-only scope lacked an
engine predicate; zero changes and zero extra Native runs preceded the
coordinator's explicit two-file approval.

Daemon AOT runs separately outside the Native test gate. Strict parse,
generation, C syntax and link take 144.150979 seconds under the
same fixed SDK/flags and 2GiB, in a separate bounded preparation process.
It executes no Native client or daemon application. ELF, generated C,
source dependencies, full SDK and trace hashes are verified before the
gate. The unchanged 120s/2GiB gate then builds only the client ELF and runs
one PREPARE/EXECUTE: 6.200721 seconds, including
0.673527 seconds in the owned process host. Daemon AOT is
not repeated inside the gate.

One Native FL client, one Native daemon and installed socat opaque byte
relay execute. Framing, authentication, setup, bindings and assertions are
FreeLang. Private Python controls validation and owned process/file
lifetimes outside the product. All owned children are reaped; Node
attempts/executions are zero in both traces. Shared flock is acquired
naturally without forced release or automatic retry.

An offline audit of that single trace verifies five setup ACKs, exact SQL,
statement 1, one VAR_STRING parameter containing `%Widget%`, three columns,
one server row and ERR0. It sees eight client frames and 15 daemon frames.
SQL36, existing JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6,
COUNT-WHERE4, LIMIT4, OFFSET4, new LIKE6 and engine COUNT startup checks
pass. No extra Native run is used. The [receipt](evidence/native-shop-products-name-like-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failures.

Prior page, COUNT and IFNULL proofs, plain-SUM NULL, original COUNT
fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence remain
preserved. Full regression and original 71 gates are not rerun or
promoted. FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
