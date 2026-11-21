# Native visible product name contains search with no matches

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-visible-name-like-miss.fls) passes 1/1 on source HEAD
`24878a82cdff2b1f77473a4a201b3594cae87b09`. Fresh storage contains both visible products
`(1, SKU-1, Demo Widget, 1500, 1)` and `(2, SKU-2, Demo Gadget, 2200, 1)`,
plus cart row `(2,20,2,1)`. It prepares this SQL once and binds INT32 `1`
followed by VAR_STRING `%NoSuch%`:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND name LIKE ?
```

The server returns exactly zero rows and ERR0. Neither SKU appears.
The empty result exposes column `result`; metadata is not used to require
nonempty-product column names. Both EOF packets carry status0x0002, with
no row payload between them. The client does not filter, truncate, sort or
construct rows. Original SQL whitespace is preserved.

The previously qualified daemon ELF is reused after checking all five
source dependencies, full SDK, producer receipt/trace and ELF hashes.
Producer commit is `24878a82cdff2b1f77473a4a201b3594cae87b09`. No daemon AOT or product source change
occurs. Strict client parse, generation, C syntax and link plus the single
Native PREPARE/EXECUTE take 5.809949s under the unchanged
120s/2GiB limit; the owned process host takes 0.893474s.
Shared flock is acquired naturally, without forced release or duplicate.

An offline audit of the same trace verifies all five setup ACKs, exact
original SQL, statement1, parameter count2, INT32/VAR_STRING values,
empty result framing, zero rows and ERR0. It sees eight client frames and
12 daemon frames. Existing SQL36, equality/contains7 and earlier LIKE,
numeric/AND bounds, ordering, OFFSET/LIMIT, SUM, IFNULL, COUNT and engine
startup checks pass. No additional Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in a private loopback namespace with fresh storage. FreeLang
implements authentication, protocol, setup, binding and assertions.
Private Python manages validation and owned process/file lifetimes outside
the product. All children are reaped; Node attempts/executions are zero.
The [receipt](evidence/native-shop-products-visible-name-like-miss-20261122.json) records artifacts and hashes.

Earlier 1064 failures, original COUNT fresh-both TIMEOUT, ordinary empty
SUM NULL, WAL and historical349/349 remain preserved. Full regression and
original71 are not rerun or promoted. SQL core, engine, FreeLang
parser/compiler, daemon/protocol, TLS, ACK and original25 remain unchanged.
