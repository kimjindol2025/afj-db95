# Native shop product lookup through PREPARE

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The first agreed catalog/products fixture passes 1/1 through the existing
Native MariaDB daemon and case71 PREPARE transport. No actual shop database
seed was available, so this result uses the explicitly agreed isolated
`shop_products` schema: `id INT PRIMARY KEY`, `sku TEXT`, `name TEXT`, `price INT`.
The [FL fixture](../tests/native-shop-products-select.fls) creates that table
and inserts `(1,'SKU-1','Demo Widget',1500)`, then sends exactly:

```sql
SELECT id, sku, name, price FROM shop_products WHERE id=?
```

Bind is integer 1. The one EXECUTE must return exactly the four named columns,
in that order, and one matching row. The captured result is id `1`, sku
`SKU-1`, name `Demo Widget`, price `1500` (MariaDB text result cells).
The original case71 `native_bound_products` fixture is unchanged and supplies
no shop result; only its proven Native transport pattern is reused.

The first single cohort failed with ERR1064 `unsupported SELECT form` after
successful CREATE, seed and PREPARE acknowledgements. Its exact input and FAIL
receipt are retained. `src/sql-core.fls` previously expected a compact column
list in one token. The scoped fix validates a plain identifier list and handles
its comma whitespace inside SQL parsing. Missing commas remain invalid;
expressions, quoted values and other forms keep their original token stream.
The existing SELECT branches and operators remain in use. There is no product
query special case and no FreeLang parser/compiler, daemon-entry or protocol
change. The fixture SHA is identical before and after the SQL-core fix, and
its wire SQL retains the requested spaces after commas.

The accepted cohort freshly parses, generates and links both daemon and fixture
in 39.993161 seconds under the original 120s/2GiB bounds and shared heavy
flock. Its process/runtime part is 0.346970 seconds. One Native fixture,
one freshly built Native daemon and one installed Native socat byte relay run;
all owned children are reaped. Node-family attempts/executions are zero. The
traced private Python process host and outer qualifier are two controllers
outside product execution. No automatic retry was made.

At daemon startup all 32 existing SQL assertions pass, along with two new spaced
projection assertions, the new missing-comma rejection and the existing
aggregate/LEFT JOIN checks. The existing execution trace independently verifies
CREATE/seed/PREPARE/EXECUTE command bytes 3,3,22,23, exact original SQL, bind1,
column names and the one product row. No extra Native run was made for this
audit. The [scoped receipt](evidence/native-shop-products-select-20261121.json)
records source, binary, toolchain and trace hashes and the prior failure.

This qualifies the agreed isolated DB product-lookup contract. The live shop
application and deployment are outside this observation. Existing WAL recovery,
349/349 and other Native evidence is preserved; the 349 suite and whole gate
were not rerun on this SQL-parser candidate. Original gate inputs and mapping,
TLS, node, ACK and original25 remain unchanged.
