# Native empty visible product price BETWEEN interval

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [empty-result FreeLang fixture](../tests/native-shop-products-visible-price-between-empty.fls) passes 1/1 on
source HEAD `c06d71d9e74cb19fe7e0cabce1c11418fa32d6d3`. Both earlier fixtures are
byte-identical: the [positive visibility/BETWEEN fixture](../tests/native-shop-products-visible-price-between.fls)
SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`, and the
[standalone BETWEEN fixture](../tests/native-shop-products-price-between.fls) SHA256
`95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`. A separate empty-result fixture binds
1/2000/2200, preserving their expectations and bytes.

Fresh storage contains `(1, SKU-1, Demo Widget, 1500, visible=1)` and
`(2, SKU-2, Demo Gadget, 2200, visible=0)`, plus cart row `(2,20,2,1)`.
It prepares the same three-column SQL once and binds INT32 `1`, `2000`
and `2200`, preserving comma/BETWEEN/AND whitespace:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND price BETWEEN ? AND ?
```

The server returns exactly zero rows and ERR0. Visible Widget is below
the lower bound; Gadget is inside the price range but invisible. Neither
SKU appears. Empty result metadata is `result`; no projected column-name
requirement is imposed on zero rows. Both EOF packets carry status0x0002
with no intervening row payload. The client does not sort, filter,
truncate or construct rows.

The qualified daemon ELF is reused after checking all five source
dependencies, the full SDK, producer receipt/trace and ELF hashes.
Producer commit is `c06d71d9e74cb19fe7e0cabce1c11418fa32d6d3`. No product source change or daemon
AOT occurs. Strict client parse, generation, C syntax and link plus the
one Native PREPARE/EXECUTE take 6.035621s under the unchanged
120s/2GiB limit; the owned process host takes 1.114542s.
Shared flock is acquired naturally, without forced release or duplicate.

An offline audit of this same trace checks five setup ACKs, invisible
SKU-2 seed0, exact SQL, statement1, parameter count3, three INT32 values,
empty result framing, zero rows and ERR0. It sees eight client and 12
daemon frames. SQL36, equality/BETWEEN4, standalone BETWEEN4 and existing
JOIN, multiply, numeric/AND bounds, equality/LIKE, ordering, LIMIT/OFFSET,
SUM, IFNULL, COUNT and engine startup checks pass. No extra Native run is
used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in fresh storage and a private loopback namespace. FreeLang
implements protocol, authentication, setup, binding and assertions.
Private Python manages validation and owned process/file lifetimes
outside the product. All children are reaped; Node attempts/executions
are zero. The [receipt](evidence/native-shop-products-visible-price-between-empty-20261122.json) records hashes and
artifacts.

Earlier 1064 failures, original combined daemon AOT_EXIT_124, original
COUNT fresh-both TIMEOUT, ordinary empty SUM NULL, WAL and historical349/349
remain preserved. Full regression and original71 are not rerun or
promoted. SQL core, engine, FreeLang parser/compiler, daemon/protocol,
TLS, ACK and original25 remain unchanged.
