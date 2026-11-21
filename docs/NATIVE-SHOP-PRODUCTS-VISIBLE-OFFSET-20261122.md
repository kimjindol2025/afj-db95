# Native visible products: second page with LIMIT 1 OFFSET 1

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FreeLang fixture](../tests/native-shop-products-visible-offset.fls)
passes 1/1 after the approved SQL AST and engine input changes. Fresh storage
contains two visible products: `(1, SKU-1, Demo Widget, 1500, 1)` and
`(2, SKU-2, Demo Gadget, 2200, 1)`, plus cart row `(2,20,2,1)`.
The Native client prepares this exact SQL and binds INT32 `1` once:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? ORDER BY id LIMIT 1 OFFSET 1
```

The server returns exactly one row `SKU-2 / Demo Gadget / 2200`, with
columns `sku,name,price`, no SKU-1 row and no ERR. The client rejects extra
rows and checks every value; it neither filters nor truncates server rows.
The input SHA, SQL spaces/commas, seeds, binding and expectation match the
preserved original `ERR1064 / HY000 / unsupported SELECT form` failure.

Only two implementation files change. `sql-core.fls` retains its existing
LIMIT 1 path and additionally accepts the same bounded SELECT form with
literal `OFFSET 1`, emitting numeric AST `offset=1`. Other OFFSET values,
LIMIT2, DESC and aliases stay outside this scope. All existing guards stay;
four new rejections check unsupported OFFSET forms. The prior standard
parser body, including COUNT, remains byte-identical.

In `execute-select`, only the existing LIMIT input changes: an explicit
offset drops rows from `direction-ordered` before the existing `take`.
Without an offset the input remains identical. The take/limit/direction
logic, aggregate function, projection function and all other engine bytes
are preserved. WHERE and ORDER BY execute before OFFSET/LIMIT, then the
unprojected ordering key `id` is removed by normal projection.

The first SQL-only authorization was insufficient because the engine did
not read offset. Read-only inspection reported the conflict with zero
changes and zero extra Native runs; the coordinator explicitly approved
the two-file scope before implementation.

As authorized, daemon AOT runs separately outside the Native test gate.
Its fixed-SDK strict parse, generation, C syntax and link complete in
135.598862 seconds within a separate bounded preparation process and
2GiB. That preparation executes no Native client or daemon application.
The resulting ELF, generated C, source dependency map, SDK and trace
hashes are verified before the client gate.

The unchanged 120s/2GiB Native gate builds only the client ELF and runs
one PREPARE/EXECUTE in fresh storage: 5.515206 seconds, including
0.588841 seconds in the owned process host. Daemon AOT is not repeated
inside the gate. One Native FL client, one Native daemon and installed
socat opaque byte relay execute. Framing, authentication, setup, bindings
and assertions are FreeLang. Private Python controls validation and owned
process/file lifetimes outside the product. All owned children are reaped;
Node attempts/executions are zero in both traces. The shared flock is
acquired naturally without force release or automatic retry.

An offline audit of that single trace verifies five setup ACKs, both
visible seeds, exact PREPARE SQL, one INT32 bind, three columns and one
server row. It sees eight client frames, 15 daemon frames and ERR0.
Existing SQL36, JOIN, multiply, ORDER, SUM6, SUM-WHERE4, IFNULL6,
COUNT-WHERE4, LIMIT4, new OFFSET4 and engine COUNT checks pass at startup.
No extra Native run is used. The [receipt](evidence/native-shop-products-visible-offset-20261122.json)
records source, SDK, binaries, build/run traces, audits and retained
failure hashes.

Earlier LIMIT/COUNT/IFNULL proofs, plain SUM NULL, original COUNT
fresh-both TIMEOUT FAIL, WAL and historical 349/349 evidence remain
preserved. Full regression and original 71 gates are not rerun or
promoted. FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
