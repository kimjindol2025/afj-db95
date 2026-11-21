# Native BETWEEN with ascending price order

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-price-between-order.fls)
passes 1/1 on source base HEAD `53fbdcc6b377c2003c9f6befd0695499797450e7`. It prepares
this exact three-column SQL and binds INT32 `1500`, `2200` once:

```sql
SELECT sku, name, price FROM shop_products WHERE price BETWEEN ? AND ? ORDER BY price
```

Fresh storage contains products `(1, SKU-1, Demo Widget, 1500, visible=1)`
and `(2, SKU-2, Demo Gadget, 2200, visible=1)`, plus cart `(2,20,2,1)`.
The received response is exactly two rows in order: `SKU-1 / Demo Widget /
1500`, then `SKU-2 / Demo Gadget / 2200`, ERR0. The client checks the
received order directly without sorting, filtering or constructing rows.
No id column is required.

The fixture SHA256
`397f9656b89637e817751acda66b0155da333faa2d9e520988fcfdf806e53c3a`
is unchanged from the initial 1064 failure. The [standalone reference](../tests/native-shop-products-price-between.fls)
retains SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`.
The initial Native 0/1 remains preserved as 1064/HY000 `unsupported SELECT
form`; this approved later trial supplies a separate scoped PASS.

Only `src/sql-core.fls` changes. A helper validates a numeric BETWEEN
followed by `ORDER BY` of the same bare column, reuses the existing
BETWEEN AST and attaches its order key. The selection route tries this
helper after ordinary BETWEEN. All 49 other existing function bodies are
byte-identical; four rejection checks preserve the narrow scope (missing
BY, another order key, DESC, extra LIMIT). Existing BETWEEN, standalone
ordering and all earlier guards are retained. The engine is unchanged.

The first combined daemon preparation still fails at 240.062565s under
its 240s/2GiB limit, before a daemon ELF or Native trial. Its complete C
SHA256 is `cb7eacdc2519da42a046bff298eb7a2d56882786c4be7c1b0765d53e6c52edd7`.
Separate explicit approvals then compile that same C to an object
(gcc 222.383538s, exit0; full stage 222.425652s) and link only that object
(ld 0.239160s, exit0; full stage 0.278100s). The compiler and linker flags,
SDK and source bytes are checked. Neither preparation stage executes the
Native client or daemon. The original combined timeout remains FAIL.

This final trial reuses the linked daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`.
Strict client parse/generation/C syntax/link and the single Native
PREPARE/EXECUTE take 6.254243s under the unchanged 120s/2GiB
gate; the process host takes 1.196268s. Daemon AOT during
that gate is zero. Shared flock is acquired naturally; there is one trial,
no duplicate, retry or forced release.

An offline audit of that same trace verifies five setup ACKs, the exact
SQL, two INT32 binds, statement1, parameter count2 and the ordered row
payloads. There are eight client and 16 daemon frames, no ERR packet.
SQL36, four new BETWEEN/ORDER rejection checks and existing BETWEEN,
equality/BETWEEN, JOIN, multiply, bounds/AND/LIKE, ordering, LIMIT/OFFSET,
SUM, IFNULL, COUNT and engine startup checks pass. No extra Native run is
used. All five daemon source dependencies, full SDK and object/link
receipts and traces are checked.

FreeLang handles protocol, authentication, setup, binding and assertions.
Private Python only manages validation and owned processes/files; native
socat relays opaque bytes. The isolated loopback trial uses fresh storage,
reaps all children and records zero Node attempts/executions. The
[receipt](evidence/native-shop-products-price-between-order-20261122.json)
contains artifact hashes and preparation provenance.

Earlier 1064, both original combined AOT_EXIT_124 failures and COUNT
fresh-both TIMEOUT remain FAIL. Ordinary empty SUM NULL, WAL and
historical349/349 are preserved. Full regression and original71 are not
rerun or promoted. Engine, FreeLang parser/compiler, daemon/protocol, TLS,
ACK and original25 remain unchanged.
