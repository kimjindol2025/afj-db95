# Native product SKU COUNT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-sku-count.fls) passes
1/1 against committed product HEAD `3a394bbcf667d5f27a16e0d1af51c38152632603`.
Fresh storage contains Widget1500 and Gadget2200, both visible1, and cart
`(2,20,2,1)`, matching the original fixture seeds. One PREPARE/EXECUTE binds
`SKU-1` as a length-prefixed UTF-8 string (type253):

```sql
SELECT COUNT(*) FROM shop_products WHERE sku=?
```

The server returns exactly one row with text value `1`, payload `0131`,
ERR0. SKU-1 is counted and SKU-2 is excluded. The client checks the received
count without computing it. Metadata names are unrestricted; the observed
name is `COUNT(*)`.

Strict client parse/generation/C syntax/link and the single Native trial
take 5.323503s under the unchanged 120s/2GiB gate. The process host takes
1.080205s. There is one qualifier invocation, one Native attempt, no retry
and zero daemon AOT. Shared flock is acquired naturally and all owned
children are reaped.

Cached daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`
comes from Native-qualified producer commit `00c7c73d124659daf06b667ec0f67dee5cc50372`.
All five dependencies match committed HEAD blobs and the producer receipt;
the full SDK and ELF hashes are checked. Tested SQL SHA256 is
`7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`.
The held DESC working-tree candidate is excluded from this qualification.

An offline audit of the same trace verifies five setup ACKs, both product
seeds, the exact SQL, one parameter, statement1, raw string bind SKU-1 and
one text1 row. Eight client packets and 13 daemon packets contain no ERR.
Existing SQL36, COUNT WHERE4 and the other cached scope guards pass. No
extra Native execution is used. FreeLang handles protocol and assertions;
private Python validates and manages processes, while native socat relays
opaque bytes. No Node execution or attempt occurs.

The original fixture SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`
and visibility reference SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`
remain unchanged. DESC SQL candidate `6bf11a6f...`, BEGIN/ROLLBACK failed
fixture `1f587d3f...`, non-JOIN IFNULL SUM failed fixture `b95a1af9...` and
COUNT LIKE failed fixture `6b256555...` remain uncommitted HOLD.
There are no product source changes.

Earlier 1064, AOT_EXIT_124, COUNT TIMEOUT, GCC_OBJECT_EXIT_124 and BEGIN
1064 failures remain preserved. The prior FileNotFound preflight remains
separately UNVERIFIED. This result does not qualify the held contracts,
original71, original25 or full regression. Only this fixture, document and
[receipt](evidence/native-shop-products-sku-count-20261122.json) are archived.
