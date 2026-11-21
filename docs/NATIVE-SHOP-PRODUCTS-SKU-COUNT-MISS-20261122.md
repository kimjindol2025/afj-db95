# Native missing product SKU COUNT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-sku-count-miss.fls)
passes 1/1 against committed product HEAD `ebdd1d4ad32bc508f9a9355e857d1f9a50b1e48b`.
The original fixture seeds remain Widget1500 and Gadget2200, both visible1,
and cart `(2,20,2,1)`. One PREPARE/EXECUTE binds the absent SKU `SKU-9` as
length-prefixed UTF-8 (type253):

```sql
SELECT COUNT(*) FROM shop_products WHERE sku=?
```

The server returns exactly one row with text value `0`, payload `0130`,
ERR0. This is an aggregate row, not an empty resultset. NULL, zero result
rows, extra rows and nonzero counts are rejected. Metadata names are
unrestricted; the observed name is `COUNT(*)`. The client uses received
row bytes and does not compute or substitute zero.

Fresh client parse/generation/C syntax/link and that single Native trial
take 5.563174s under the unchanged 120s/2GiB gate. The owned process host
takes 1.092764s. There is one qualifier invocation, one Native attempt,
no retry and zero daemon AOT. Shared flock is acquired naturally, fresh
storage is used, and all owned children are reaped.

Cached daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`
is matched to qualified producer commit `00c7c73d124659daf06b667ec0f67dee5cc50372`,
all five committed HEAD dependencies and the full fixed SDK. Tested SQL
SHA256 is `7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`.
Held DESC candidate `6bf11a6f...` is excluded from this qualification.

An offline audit of the same trace verifies five setup ACKs, exact SQL,
one parameter, statement1, raw string bind SKU-9 and the single text0 row.
Eight client packets and 13 daemon packets contain no ERR. SQL36, COUNT
WHERE4 and the cached scope guards pass. The audit adds no Native run.
FreeLang handles protocol and assertions; private Python only validates
and manages processes, while native socat relays opaque bytes. Node
attempts and executions are zero.

The original fixture SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`
and reference SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`
remain unchanged. DESC, BEGIN/ROLLBACK, non-JOIN IFNULL SUM and COUNT LIKE
remain uncommitted HOLD. Product source changes are zero. Earlier 1064,
AOT_EXIT_124, COUNT TIMEOUT, GCC_OBJECT_EXIT_124 and BEGIN1064 failures and
FileNotFound UNVERIFIED are preserved. This scoped result does not qualify
held contracts, original71, original25, full regression or mall operation.
Only this fixture, document and [receipt](evidence/native-shop-products-sku-count-miss-20261122.json)
are archived.
