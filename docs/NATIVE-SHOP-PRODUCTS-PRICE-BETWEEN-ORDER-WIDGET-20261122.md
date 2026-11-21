# Native ascending BETWEEN interval returning Widget only

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-price-between-order-widget.fls)
passes 1/1 against committed ASC source HEAD `00c7c73d124659daf06b667ec0f67dee5cc50372`.
It prepares this exact three-column SQL once, with INT32 binds `1500`, `2000`:

```sql
SELECT sku, name, price FROM shop_products WHERE price BETWEEN ? AND ? ORDER BY price
```

Fresh storage contains Widget1500 and Gadget2200, both visible1, plus
cart `(2,20,2,1)`. The received result is exactly one row:
`SKU-1 / Demo Widget / 1500`, ERR0. SKU-2 is absent. The client checks the
actual received rows without filtering, sorting, truncating or constructing
them. No id column is required.

The [two-row ASC reference](../tests/native-shop-products-price-between-order.fls)
retains SHA256 `397f9656b89637e817751acda66b0155da333faa2d9e520988fcfdf806e53c3a`;
the [standalone BETWEEN reference](../tests/native-shop-products-price-between.fls)
retains SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`.
A separate one-row fixture preserves their bytes and expectations.

The cached daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`
comes from Native-qualified producer commit
`00c7c73d124659daf06b667ec0f67dee5cc50372`. All five dependencies are
compared to committed HEAD blobs and the producer receipt, alongside the
full SDK and trace/ELF hashes. Tested ASC SQL SHA256 is
`7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`.

The preexisting uncommitted DESC SQL candidate remains in the working
tree with SHA256
`6bf11a6f856a2f970c851c79d6254ad1ab3d13b8c9afcd72fa4357ae5cb6b1fe`.
Its fixture retains SHA256
`bb74e5d4133f2a44deeed768cd97705075402944962996f8e266ce8b8d5aad66`.
Both are preserved unstaged and excluded from this qualification. DESC
remains HOLD with its 1064, combined AOT_EXIT_124 and GCC_OBJECT_EXIT_124
failures. This ASC trial supplies no DESC PASS and makes no implementation
change.

Strict client parse/generation/C syntax/link plus the single Native
PREPARE/EXECUTE take 6.059411s under the unchanged 120s/2GiB
gate; the owned process host takes 1.088115s. Daemon AOT
is zero. The shared flock is acquired naturally, with no duplicate,
forced release or retry. All tracked working-tree files, including the
held DESC candidate, remain byte-identical through the trial.

An offline audit of that same trace verifies five setup ACKs, the exact
SQL, two INT32 binds, statement1, parameter count2 and the sole row.
Eight client and 15 daemon frames contain no ERR packet. SQL36 and
existing BETWEEN/ORDER, equality/BETWEEN, JOIN, multiply, numeric/AND/LIKE,
ordering, LIMIT/OFFSET, SUM, IFNULL, COUNT and engine startup checks pass.
Startup assertions are checked against a private copy of the committed
ASC SQL blob. No extra Native run is used.

FreeLang implements protocol, authentication, setup, binding and
assertions. Private Python only manages validation and owned processes
and files; native socat relays opaque bytes. The isolated loopback trial
uses fresh storage, reaps all children and records zero Node attempts or
executions. The [receipt](evidence/native-shop-products-price-between-order-widget-20261122.json)
records the tested committed sources separately from the held candidate.

Earlier FAIL cohorts, ordinary empty SUM NULL, WAL and historical349/349
are preserved. Full regression and original71 are not rerun or promoted.
Only this fixture, document and receipt are archived; the held DESC
candidate, engine, parser/compiler, daemon/protocol, TLS, ACK and original25
are unchanged by this task.
