# Native empty product price BETWEEN interval

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [empty-result FreeLang fixture](../tests/native-shop-products-price-between-empty.fls) passes 1/1 on
source HEAD `82ce72ef83c6d80130cc2cc91293eee7475c68b0`. The original positive
[BETWEEN reference fixture](../tests/native-shop-products-price-between.fls) remains
byte-identical, SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`. A separate fixture
binds 1600/2100 and expects zero rows; it does not rewrite the positive
fixture or its two-row expectation.

Fresh storage contains both visible products `(1, SKU-1, Demo Widget,
1500, 1)` and `(2, SKU-2, Demo Gadget, 2200, 1)`, plus cart row
`(2,20,2,1)`. It prepares the same three-column SQL once and binds INT32
`1600`, then `2100`, preserving BETWEEN/AND and comma whitespace:

```sql
SELECT sku, name, price FROM shop_products WHERE price BETWEEN ? AND ?
```

The server returns exactly zero rows and ERR0; neither SKU appears.
The empty result exposes column `result`, followed by column/row EOF
packets with status0x0002 and no intervening row payload. No projected
column-name requirement is imposed on the empty result. The client does
not sort, filter, truncate or construct rows.

The previously qualified daemon ELF is reused after checking all five
source dependencies, the full SDK, producer receipt/trace and ELF hashes.
Producer commit is `82ce72ef83c6d80130cc2cc91293eee7475c68b0`. No product source change or daemon AOT
occurs. Strict client parse, generation, C syntax and link plus the one
Native PREPARE/EXECUTE take 5.954922s under the unchanged
120s/2GiB limit; the owned process host takes 0.880540s.
Shared flock is acquired naturally, with no forced release or duplicate.

An offline audit of the same trace verifies five setup ACKs, exact SQL,
statement1, parameter count2, both INT32 values, empty result framing,
zero rows and ERR0. It sees eight client and 12 daemon frames. SQL36,
BETWEEN4 and existing JOIN, multiply, numeric/AND bounds, equality/LIKE,
ordering, LIMIT/OFFSET, SUM, IFNULL, COUNT and engine startup checks pass.
No additional Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in a private loopback namespace with fresh storage. FreeLang
implements protocol, authentication, setup, binds and assertions.
Private Python manages validation and owned process/file lifetimes outside
the product. All children are reaped; Node attempts/executions are zero.
The [receipt](evidence/native-shop-products-price-between-empty-20261122.json) records artifacts and hashes.

Earlier 1064 failures, original combined daemon AOT_EXIT_124, original
COUNT fresh-both TIMEOUT, ordinary empty SUM NULL, WAL and historical349/349
remain preserved. Full regression and original71 are not rerun or promoted.
SQL core, engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
