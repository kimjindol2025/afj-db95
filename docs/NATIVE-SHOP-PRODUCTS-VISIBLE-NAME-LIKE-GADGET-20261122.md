# Native visible product name contains search for Gadget

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-visible-name-like-gadget.fls) passes 1/1 on source HEAD
`4e9bec23c43f20f1f80add4e7348d13cefb57907`. Fresh storage contains both visible products
`(1, SKU-1, Demo Widget, 1500, 1)` and `(2, SKU-2, Demo Gadget, 2200, 1)`,
plus cart row `(2,20,2,1)`. It prepares this original SQL once and binds
INT32 `1` followed by VAR_STRING `%Gadget%`:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND name LIKE ?
```

The server returns exactly one row `SKU-2 / Demo Gadget / 2200`, columns
`sku,name,price`, no SKU-1 and ERR0. The client checks received values
without filtering, truncating, sorting or constructing rows. Original
SQL whitespace is preserved.

The previously qualified daemon ELF is reused after verifying five source
dependencies, the full SDK, producer receipt/trace and ELF hashes. Its
producer commit is `24878a82cdff2b1f77473a4a201b3594cae87b09`. Product sources and daemon build are
unchanged. Strict client parse, generation, C syntax and link plus the one
Native PREPARE/EXECUTE take 5.938328s under the unchanged
120s/2GiB limit; the owned process host takes 0.890407s.
Shared flock is acquired naturally, without forced release or duplicate.

An offline audit of this single trace checks all five setup ACKs, exact
SQL, statement1, parameter count2, INT32/VAR_STRING values, three columns,
the exact row, EOF status0x0002 and ERR0. It sees eight client frames and
15 daemon frames. Existing SQL36, equality/contains7 and the earlier LIKE,
numeric/AND bound, ordering, LIMIT/OFFSET, SUM, IFNULL, COUNT and engine
startup checks pass. No extra Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in fresh storage and a private loopback namespace. FreeLang
implements protocol, authentication, setup, binds and assertions. Private
Python manages validation and owned process/file lifetimes outside the
product. All children are reaped; Node attempts/executions are zero. The
[receipt](evidence/native-shop-products-visible-name-like-gadget-20261122.json) records artifacts and hashes.

Earlier 1064 failures, original COUNT fresh-both TIMEOUT, ordinary empty
SUM NULL, WAL and historical349/349 remain preserved. Full regression and
original71 are not rerun or promoted. SQL core, engine, FreeLang
parser/compiler, daemon/protocol, TLS, ACK and original25 remain unchanged.
