# Native product name COUNT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-name-count.fls) passes
1/1 against committed product HEAD `72cb2a8ac15fb4eaa3b051674f78abb0c0e64a61`.
Fresh storage contains the original Widget1500 and Gadget2200 seeds, both
visible1, and cart `(2,20,2,1)`. One PREPARE/EXECUTE binds `Demo Widget` as
length-prefixed UTF-8 (type253, 11 bytes):

```sql
SELECT COUNT(*) FROM shop_products WHERE name=?
```

The server returns exactly one row with text value `1`, payload `0131`,
ERR0. Demo Widget is counted and Demo Gadget is excluded. The client checks
received bytes without computing the count. Metadata names are unrestricted;
the observed name is `COUNT(*)`. NULL, zero, extra rows and empty resultsets
are rejected. SQL spaces and the space inside the bound name are preserved.

Fresh client parse/generation/C syntax/link and that single Native trial
take 5.821915s under the unchanged 120s/2GiB gate. The process host takes
1.082895s. There is one qualifier invocation, one Native attempt, no retry
and zero daemon AOT. Shared flock is acquired naturally and all owned
children are reaped. No 240s preparation stage or gcc-only stage is run.

Cached daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`
is checked against Native-qualified producer commit
`00c7c73d124659daf06b667ec0f67dee5cc50372`, all five committed HEAD dependencies
and the full fixed SDK. Tested SQL SHA256 is
`7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`.
Held DESC source `6bf11a6f...` is excluded from this qualification.

An offline audit of the same trace verifies five setup ACKs, exact SQL,
one parameter, statement1, raw string bind Demo Widget and one text1 row.
Eight client and 13 daemon packets contain no ERR. SQL36, COUNT WHERE4 and
the cached scope guards pass. The audit adds no Native run. FreeLang handles
protocol and assertions; private Python validates and manages processes,
while native socat relays opaque bytes. Node attempts and executions are zero.

Original fixture SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`
and reference SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`
remain unchanged. Product code changes are zero. `protocol.fls`,
`tcp-server.fls` and `auth.fls` remain byte-identical. P01 product application,
ACK, TLS and Node-shell work are not opened. DESC, BEGIN/ROLLBACK, non-JOIN
IFNULL SUM and COUNT LIKE remain uncommitted HOLD. Earlier 1064, AOT_EXIT_124,
COUNT TIMEOUT, GCC_OBJECT_EXIT_124 and BEGIN1064 failures, plus FileNotFound
UNVERIFIED, are preserved. This scoped result does not qualify held contracts,
original71, original25, full regression or mall operation. Only this fixture,
document and [receipt](evidence/native-shop-products-name-count-20261122.json)
are archived.
