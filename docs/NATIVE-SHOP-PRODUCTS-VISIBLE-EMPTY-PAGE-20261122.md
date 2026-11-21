# Native visible products: empty page at LIMIT 1 OFFSET 2

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang empty-page fixture](../tests/native-shop-products-visible-empty-page.fls)
passes 1/1 after the approved SQL-only change. Fresh storage contains both
visible products `(1, SKU-1, Demo Widget, 1500, 1)` and
`(2, SKU-2, Demo Gadget, 2200, 1)`, plus cart row `(2,20,2,1)`.
The Native client prepares the exact SQL and binds INT32 `1` once:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? ORDER BY id LIMIT 1 OFFSET 2
```

The server returns exactly zero rows and ERR0; neither SKU-1 nor SKU-2 is
present. The response header is `01`, metadata is `[result]`, and both EOF
payloads are `fe00000200`. The fixture accepts valid empty-result metadata,
rejects any row, and never filters, truncates or fabricates rows. Seeds,
SQL spaces/commas, bind, zero-row expectation and fixture SHA are identical
to the preserved earlier `ERR1064 / HY000 / unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. The existing bounded WHERE/ORDER BY/LIMIT1
parser now accepts OFFSET literals 1 and 2, emitting numeric 1 and 2.
The absent-offset and OFFSET1 paths are retained. No general integer regex,
new ordering direction, alias or additional clause is opened. The newly
valid OFFSET2 rejection changes to OFFSET3; LIMIT2, DESC and alias rejection
checks remain, with all other existing guards. The legacy standard parser,
including COUNT, remains byte-identical. The entire engine file is unchanged;
its previously approved explicit-offset input skips sorted rows before
the existing limit and normal projection.

Daemon AOT preparation is explicitly outside the Native gate. Strict
parse, generation, C syntax and link take 148.941999 seconds under
the same fixed SDK/flags and 2GiB, with a separate bounded preparation
process. That preparation executes no Native client or daemon application.
ELF, generated C, candidate source dependencies, full SDK and trace hashes
are verified before the Native client gate.

The unchanged 120s/2GiB gate builds only the client ELF and runs one
PREPARE/EXECUTE against fresh storage: 5.484393 seconds, including
0.567015 seconds in the owned process host. No daemon AOT
is repeated inside that gate. One Native FL client, one Native daemon and
installed socat opaque byte relay execute. Framing, authentication, setup,
bindings and assertions are FreeLang. Private Python controls validation
and owned process/file lifetimes outside the product. All owned children
are reaped; Node attempts/executions are zero in both traces. Shared flock
is acquired naturally without forced release or automatic retry.

An offline audit of that single Native trace verifies five setup ACKs,
both visible seeds, exact PREPARE SQL, one INT32 bind, zero row frames and
ERR0. It sees eight client frames and 12 daemon frames. SQL36, existing
JOIN/multiply/ORDER, SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4,
updated OFFSET4 and engine COUNT startup checks pass. No extra Native run
is used. The [receipt](evidence/native-shop-products-visible-empty-page-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained failures.

Prior first/second page proofs, COUNT/IFNULL proofs, plain-SUM NULL record,
original COUNT fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence
remain preserved. Full regression and original 71 gates are not rerun or
promoted. Engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
