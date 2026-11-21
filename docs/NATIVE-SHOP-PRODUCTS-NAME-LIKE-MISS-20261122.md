# Native product-name LIKE search with no match

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-name-like-miss.fls)
passes 1/1 on product HEAD `2827806b`, with no product implementation changes.
Fresh storage contains `(1, SKU-1, Demo Widget, 1500, visible=1)`,
`(2, SKU-2, Demo Gadget, 2200, visible=1)` and cart row `(2,20,2,1)`.
It uses the same prepared SQL as the successful name search:

```sql
SELECT sku, name, price FROM shop_products WHERE name LIKE ?
```

The single VAR_STRING bind is `%NoSuch%`. The Native server returns exactly
zero rows and ERR0; both products are absent. Wire header `01`, metadata
`[result]` and two EOF payloads `fe00000200` describe the empty result.
The fixture accepts valid empty metadata, rejects any row, and does not
filter, truncate or fabricate a result.

The prior successful Native daemon ELF is reused only after checking its
SHA, all five dependency source hashes and full SDK file map against the
current committed product. Daemon AOT executions are zero. The unchanged
120s/2GiB gate includes the client parse, generation, C syntax, link and
one Native PREPARE/EXECUTE; it completes in 5.624830 seconds.
Owned runtime-host time is 0.695168 seconds. The source,
fixture, SDK and daemon bytes remain unchanged throughout.

One Native FL client, one cached Native daemon and installed socat opaque
byte relay execute. Framing, authentication, setup, binding and assertions
are FreeLang. Two private Python controllers outside the product qualify
the trial and manage owned process/file lifetimes. All owned children are
reaped, Node attempts/executions are zero, and the shared flock is acquired
naturally without forced release, duplicate execution or automatic retry.

An offline audit of that single trace checks five setup ACKs, the exact SQL,
statement 1, one VAR_STRING `%NoSuch%`, zero row frames and ERR0. It sees
eight client frames and 12 daemon frames. SQL36, existing JOIN/multiply/ORDER,
SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4, LIMIT4, OFFSET4, LIKE6 and engine
COUNT startup checks pass. No extra Native run is used. The
[receipt](evidence/native-shop-products-name-like-miss-20261122.json)
records source, SDK, cached producer, build/run traces, binaries and audits.

The LIKE hit proof, original LIKE1064, prior page proofs, original COUNT
fresh-both TIMEOUT FAIL, plain-SUM NULL, WAL and historical 349/349 evidence
remain preserved. Full regression and original 71 gates are not rerun or
promoted. SQL core, engine, FreeLang parser/compiler, daemon/protocol,
TLS, ACK and original25 remain unchanged.
