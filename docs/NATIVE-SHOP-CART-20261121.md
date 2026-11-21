# Native shopping-cart prepared INSERT and SELECT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The agreed isolated [FL cart fixture](../tests/native-shop-cart.fls) passes 1/1.
It creates and seeds `shop_products` with the agreed product id 1, then creates
`shop_cart(id INT PRIMARY KEY, product_id INT, qty INT)`. Through the existing
Native MariaDB daemon and case71 transport, it sends these exact statements:

```sql
INSERT INTO shop_cart (id, product_id, qty) VALUES (?, ?, ?)
SELECT id, product_id, qty FROM shop_cart WHERE id=?
```

The prepared INSERT binds integers 1,1,2 once. The prepared SELECT binds integer
1 once and must return exactly one row with id `1`, product_id `1`, qty `2`, and
those three column names in order. All cells are checked as MariaDB text values.
Product setup and all cart packet/result assertions remain FreeLang; the host
only manages fresh files and owned process lifetimes.

The first single cohort passed product setup, cart CREATE and INSERT PREPARE,
then received ERR1064 `unsupported INSERT form`; SELECT was not reached. Its
input and FAIL receipt are retained. The scoped `src/sql-core.fls` fix reuses
the existing quote/depth-aware splitter so parenthesized columns and VALUES
remain groups despite their whitespace. Existing INSERT branches and value
parsing stay in use. Quoted comma/space content is covered by the new
`'Demo, Widget'` parser case. The fixture SHA and both spaced wire SQL strings
are unchanged from the failed cohort; there is no query-specific bypass.

The accepted cohort freshly parses, generates and links both daemon and fixture
in 41.767237 seconds under 120s/2GiB and the shared heavy flock. Its
process/runtime part takes 0.359139 seconds. One Native fixture,
one fresh Native daemon and one installed Native socat opaque byte relay execute,
and all owned children are reaped. Node-family attempts/executions are zero.
The traced private Python process host and outer qualifier are two controllers
outside the product. No automatic retry was made.

All 34 prior SQL assertions pass at daemon startup, plus the two new INSERT
whitespace/quoted-value assertions. The prior projection missing-comma guard
and aggregate/LEFT JOIN checks also pass. The same trace independently verifies
command bytes 3,3,3,22,23,22,23, statement IDs 1/2, both original SQL strings,
all bound integers and the exact cart row. No extra Native run was made for this
audit. The [scoped receipt](evidence/native-shop-cart-20261121.json) records
source, binary, toolchain, trace hashes and the retained initial failure.

This proves the agreed isolated DB cart contract. It does not qualify the live
shop application or deployment. The product fixture, prior SELECT handling,
existing WAL recovery and historical 349/349 evidence are retained; the 349
suite and whole gate were not rerun on this SQL-parser candidate. Original gate
inputs/mapping, FreeLang parser/compiler, daemon entry/protocol, TLS, node, ACK
and original25 remain unchanged.
