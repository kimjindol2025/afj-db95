# Native two cart line totals in cart order

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL two-line fixture](../tests/native-shop-cart-two-line-totals.fls)
passes 1/1 after the scoped SQL JOIN suffix addition. It creates products
`(1, SKU-1, Demo Widget, 1500)`, `(2, SKU-2, Demo Gadget, 2200)` and cart rows
`(1,1,2)`, `(2,2,1)` in fresh storage, then prepares and executes this exact
zero-parameter SQL once:

```sql
SELECT shop_cart.qty * shop_products.price FROM shop_cart JOIN shop_products ON shop_cart.product_id = shop_products.id ORDER BY shop_cart.id
```

The Native server returns exactly two one-column rows `3000`, `2200` in that
order. The expression column label is `shop_cart.qty * shop_products.price`.
The fixture only reads and checks received values; it neither multiplies nor
sorts them. No dummy WHERE, SQL alias or split query is used. The original
fixture SHA, SQL, spaces and expected values match the preserved earlier
ERR1064/HY000 `unsupported SELECT form` cohort.

Only `src/sql-core.fls` changes. The qualified INNER JOIN parser now accepts
its existing WHERE form or a WHERE-free ORDER BY suffix with one qualified
column. The engine, multiplication evaluator, daemon and protocol are unchanged.
The existing sorter reads a bare key from a merged row, so the equivalent
WHERE-free INNER JOIN execution order places the requested ordering relation on
the right when needed. This keeps that relation's bare value on a name collision,
while retaining both qualified row representations and the original projection
and ON meaning. ORDER BY itself stays qualified in the AST. The original WHERE
form keeps its original plan and filter behavior.

Four new checks reject an unknown order qualifier, an unqualified order key,
multiple order keys, and a combined WHERE/ORDER BY form. A separate plan invariant
checks that the requested ordering relation owns the sort key, ON references
match their execution relations, and no WHERE was introduced. All pass alongside
the existing four JOIN and four multiply scope guards and all 36 SQL assertions.

The accepted single Native cohort freshly parses, generates and links daemon
and fixture in 93.548891 seconds under 120s/2GiB and the shared heavy flock.
Its runtime/process host takes 0.358280 seconds. One Native FL fixture, one
fresh Native daemon and one installed Native socat opaque byte relay execute.
All framing, authentication, setup and result assertions are FreeLang. Two
private Python controllers outside the product only qualify the trial and manage
owned process/file lifetimes. The host makes no protocol/network requests.
All owned children are reaped; Node-family attempts/executions are zero.
Each Native cohort ran once under separate authorization.

The same trace independently verifies six setup ACKs, command bytes
`3,3,3,3,3,3,22,23`, the original query without WHERE, parameter count zero,
statement ID 1, the 10-byte EXECUTE and the two ordered daemon response values.
The [scoped receipt](evidence/native-shop-cart-two-line-totals-20261121.json)
records source, SDK, binary, trace and retained failure hashes. Auditing starts
no extra Native execution.

Prior shopping fixtures and failure records, WAL and historical 349/349 evidence
are retained. The full regression suite and original 71 gate are not rerun or
promoted. Engine, FreeLang parser/compiler, daemon/protocol, gate mappings, TLS,
ACK and original25 remain unchanged. This proves the isolated agreed two-line
DB contract.
