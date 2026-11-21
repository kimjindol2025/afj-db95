# Native visibility-zero product price BETWEEN

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-visible-price-between-gadget.fls)
passes 1/1 on source HEAD `fc60ddcd83aa08de70b721367601605b4b9483bc`.
It uses the same three-column SQL with INT32 binds `0`, `2000`, `2200`:

```sql
SELECT sku, name, price FROM shop_products WHERE visible=? AND price BETWEEN ? AND ?
```

Fresh storage contains products `(1, SKU-1, Demo Widget, 1500, visible=1)`
and `(2, SKU-2, Demo Gadget, 2200, visible=0)`, plus cart `(2,20,2,1)`.
The server returns exactly one row: `SKU-2 / Demo Gadget / 2200`, ERR0.
SKU-1 is absent. The server applies visibility zero and the inclusive
BETWEEN upper boundary; the client does not filter, sort, truncate or
construct rows. Only the requested sku/name/price columns are required.

Both reference fixtures remain byte-identical. The [positive visibility
fixture](../tests/native-shop-products-visible-price-between.fls) retains
SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`;
the [original standalone fixture](../tests/native-shop-products-price-between.fls)
retains SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`.
This separate fixture preserves their binds and expectations.

The verified daemon ELF from producer commit
`c06d71d9e74cb19fe7e0cabce1c11418fa32d6d3` is reused after checking all
five source dependencies, the full SDK, producer receipt/trace and ELF
hashes. Product source changes and daemon AOT are zero. Strict client
parse, generation, C syntax and link plus one Native PREPARE/EXECUTE take
6.094845s under the unchanged 120s/2GiB gate. The owned process host takes
1.092768s. The shared flock is acquired naturally, with no forced release,
duplicate or retry.

An offline audit of that same trace checks all five setup ACKs, SKU-2
visible0, the exact SQL, three INT32 binds, parameter count3 and statement1.
Eight client and 15 daemon frames contain exactly the expected row and
no ERR packet. Existing SQL36, equality/BETWEEN4, standalone BETWEEN4,
equality/LIKE7 and existing JOIN, multiply, numeric/AND bounds, ordering,
LIMIT/OFFSET, SUM, IFNULL, COUNT and engine startup checks pass. No extra
Native run is used.

One Native FL client, one Native daemon and installed socat opaque relay
execute in a private loopback namespace with fresh storage. FreeLang
implements protocol, authentication, setup, binding and assertions;
private Python only manages validation and owned process/file lifetimes
outside the product. All children are reaped; Node attempts/executions
are zero. The [receipt](evidence/native-shop-products-visible-price-between-gadget-20261122.json)
records hashes and artifacts.

Earlier 1064 failures, original combined AOT_EXIT_124 and COUNT fresh-both
TIMEOUT remain FAIL. Ordinary empty SUM NULL, WAL and historical349/349
are preserved. Full regression and original71 are not rerun or promoted.
SQL core, engine, FreeLang parser/compiler, daemon/protocol, TLS, ACK and
original25 remain unchanged.
