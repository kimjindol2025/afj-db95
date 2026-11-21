# Native visible product COUNT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-visible-count.fls) passes
1/1 against committed product HEAD `4a8a764fa0970879aaa2fd10b9b8aa9c427284af`.
Fresh storage contains Widget1500 with visible1, Gadget2200 with visible0,
and cart `(2,20,2,1)`. The fixture prepares this SQL once and binds INT32 `1`:

```sql
SELECT COUNT(*) FROM shop_products WHERE visible=?
```

The server returns exactly one row with text value `1`, payload `0131`,
ERR0. The hidden SKU-2 is excluded. The client requires one column and one
row, but no particular metadata name; observed metadata is `COUNT(*)`.
NULL, zero, extra rows and client computation of the count are rejected.

The [visible-product reference](../tests/native-shop-products-visible-price-between.fls)
retains SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`;
the [standalone original](../tests/native-shop-products-price-between.fls)
retains SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`.
A separate COUNT fixture preserves those files. Existing COUNT client
framing is reused with the product schema, visibility seeds and query.

The cached daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`
comes from Native-qualified producer commit `00c7c73d124659daf06b667ec0f67dee5cc50372`.
All five dependencies are checked against committed HEAD blobs and the
producer receipt, together with the full SDK and trace/ELF hashes. Tested
SQL source SHA256 is
`7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`.
The uncommitted DESC SQL candidate SHA256
`6bf11a6f856a2f970c851c79d6254ad1ab3d13b8c9afcd72fa4357ae5cb6b1fe`
and its fixture SHA256
`bb74e5d4133f2a44deeed768cd97705075402944962996f8e266ce8b8d5aad66`
remain unstaged HOLD and are excluded from this qualification.

An initial private controller had a duplicated `products` path segment
and stopped before any compiler or Native execution. That record remains
UNVERIFIED and is not a product FAIL. Its path/environment/result-prefix
wiring was corrected and statically checked before the authorized first
Native trial. There are two qualifier invocations and exactly one Native
trial; no executed Native FAIL is retried.

Strict client parse/generation/C syntax/link plus that single Native
PREPARE/EXECUTE take 5.546333s under the unchanged 120s/2GiB gate.
The owned process host takes 1.068584s. Daemon AOT is zero.
Shared flock is acquired naturally; there is no duplicate or forced
release. All tracked working-tree bytes, including the held DESC
candidate, remain identical through the trial.

An offline audit of the same trace verifies five setup ACKs, visible1 and
visible0 seeds, the exact SQL, one parameter, statement1, raw bind1 and the
single text1 row. Eight client and 13 daemon frames contain no ERR.
SQL36, existing COUNT WHERE4 and the other BETWEEN/ORDER, JOIN, multiply,
bounds/AND/LIKE, LIMIT/OFFSET, SUM, IFNULL and engine startup checks pass.
Startup checks use a private copy of committed SQL. No extra Native run
is used.

FreeLang handles framing, authentication, setup, binding and assertions.
Private Python only validates and manages owned processes/files; native
socat relays opaque bytes. The isolated loopback trial uses fresh storage,
reaps all children and records zero Node attempts/executions. The
[receipt](evidence/native-shop-products-visible-count-20261122.json)
records the committed sources separately from the held candidate and the
initial preflight error.

Earlier 1064, AOT_EXIT_124, COUNT TIMEOUT and GCC_OBJECT_EXIT_124 failures,
ordinary empty SUM NULL, WAL and historical349/349 are preserved. Full
regression and original71 are not rerun or promoted. Only this fixture,
document and receipt are archived; product implementation and the held
DESC candidate are unchanged.
