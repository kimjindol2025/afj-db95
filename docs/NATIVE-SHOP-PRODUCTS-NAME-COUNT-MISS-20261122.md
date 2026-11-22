# Native missing product name COUNT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-name-count-miss.fls)
passes 1/1 against committed product HEAD `0f9f45b2615ef0826b66c08b8310c85ff0fd19ae`. Both original products
remain seeded: Widget1500 and Gadget2200, visible1, plus cart `(2,20,2,1)`.
One PREPARE/EXECUTE binds `No Such Item` as type253 UTF-8, 12 bytes:

```sql
SELECT COUNT(*) FROM shop_products WHERE name=?
```

The server returns exactly one row with text value `0`, payload `0130`,
ERR0. NULL, zero result rows, extra rows and nonzero counts are rejected.
Metadata names are unrestricted; the observed name is `COUNT(*)`.
The client checks received bytes and does not compute or substitute zero.
Spaces in SQL and the bound name remain intact.

The absent name is the same value declared by the
[earlier lookup fixture](../tests/native-shop-products-missing-name.fls)
in commit `64caeb0c`. That file remains byte-identical, SHA256
`6922830ea1bd28207de574248e60cc1452232dfefeb63a12f32cc74b460af3d4`.
The fixture and receipt also preserve original `95a5ca49...` and visibility
reference `7c432576...`.

The daemon ELF from the immediately preceding name COUNT qualification
is reused byte-for-byte, SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`.
Its canonical producer is `00c7c73d124659daf06b667ec0f67dee5cc50372`.
All five committed HEAD dependencies and the full fixed SDK are checked.
Tested SQL SHA256 is `7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`;
held DESC candidate `6bf11a6f...` is excluded from qualification.

Fresh client strict parse/generation/C syntax/link plus the single Native
trial take 5.516199s under the unchanged 120s/2GiB gate; process host
time is 1.088713s. Daemon AOT and gcc-only stages are zero. One shared
flock is acquired naturally, with no forced release or duplicate launch.
Fresh storage is used and all owned children are reaped.

An offline audit of the same trace verifies five setup ACKs, exact SQL,
one parameter, statement1, the raw 12-byte string bind and one text0 row.
Eight client and 13 daemon frames contain no ERR. SQL36, COUNT WHERE4 and
the cached scope guards pass. The audit adds no Native run. FreeLang handles
protocol and assertions; private Python validates and manages processes,
and native socat relays opaque bytes. Node attempts and executions are zero.

Product code changes are zero. `protocol.fls`, `tcp-server.fls` and
`auth.fls` remain unchanged. BEGIN, DESC, non-JOIN IFNULL SUM and COUNT LIKE
remain HOLD. Earlier 1064, AOT_EXIT_124, COUNT TIMEOUT, GCC_OBJECT_EXIT_124
and BEGIN1064 failures, plus FileNotFound UNVERIFIED, remain preserved.
Original71 and full mall operation are not promoted. Only this fixture,
document and [receipt](evidence/native-shop-products-name-count-miss-20261122.json)
are archived.
