# Native product price BETWEEN selecting Gadget

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [single-product FreeLang fixture](../tests/native-shop-products-price-between-gadget.fls) passes 1/1 on
source HEAD `61d614aa6ea370324b8a4719e4ab78931acf31f3`. The original two-row
[BETWEEN reference fixture](../tests/native-shop-products-price-between.fls) remains
byte-identical, SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`. A separate fixture
binds 2000/2200 and expects Gadget only, preserving earlier tests and
expectations.

Fresh storage contains `(1, SKU-1, Demo Widget, 1500, visible=1)` and
`(2, SKU-2, Demo Gadget, 2200, visible=1)`, plus cart row `(2,20,2,1)`.
The client prepares the same three-column SQL once and binds INT32
`2000`, then `2200`, preserving comma/BETWEEN/AND whitespace:

```sql
SELECT sku, name, price FROM shop_products WHERE price BETWEEN ? AND ?
```

The server returns exactly one row `SKU-2 / Demo Gadget / 2200`, columns
`sku,name,price`, with ERR0. The upper boundary is included; SKU-1 is
absent. The client checks received values without sorting, filtering,
truncating or constructing rows.

The qualified daemon ELF is reused after checking five source
dependencies, the full SDK, producer receipt/trace and ELF hashes.
Producer commit is `82ce72ef83c6d80130cc2cc91293eee7475c68b0`. No product source change or daemon
AOT occurs. Strict client parse, generation, C syntax and link plus the
one Native PREPARE/EXECUTE take 5.988444s under the unchanged
120s/2GiB limit; the owned process host takes 0.997405s.
Shared flock is acquired naturally, without forced release or duplicate.

An offline audit of the same trace checks five setup ACKs, exact SQL,
statement1, parameter count2, both INT32 values, three columns, the exact
single row, EOF status0x0002 and ERR0. It sees eight client and 15 daemon
frames. SQL36, BETWEEN4 and existing JOIN, multiply, numeric/AND bounds,
equality/LIKE, ordering, LIMIT/OFFSET, SUM, IFNULL, COUNT and engine
startup checks pass. No additional Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in fresh storage and a private loopback namespace. FreeLang
implements protocol, authentication, setup, binding and assertions.
Private Python manages validation and owned process/file lifetimes
outside the product. All children are reaped; Node attempts/executions
are zero. The [receipt](evidence/native-shop-products-price-between-gadget-20261122.json) records hashes and
artifacts.

Earlier 1064 failures, original combined daemon AOT_EXIT_124, original
COUNT fresh-both TIMEOUT, ordinary empty SUM NULL, WAL and historical349/349
remain preserved. Full regression and original71 are not rerun or
promoted. SQL core, engine, FreeLang parser/compiler, daemon/protocol,
TLS, ACK and original25 remain unchanged.
