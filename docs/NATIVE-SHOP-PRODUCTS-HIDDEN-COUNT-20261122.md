# Native hidden product COUNT

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The [FreeLang fixture](../tests/native-shop-products-hidden-count.fls) passes
1/1 against committed product HEAD `5bbb8ef49fac0505b0d52589634a36dfd25c57b8`.
Fresh storage contains Widget1500 with visible1, Gadget2200 with visible0,
and cart `(2,20,2,1)`. One PREPARE/EXECUTE binds INT32 `0`:

```sql
SELECT COUNT(*) FROM shop_products WHERE visible=?
```

The server returns exactly one row with text value `1`, payload `0131`,
ERR0. Hidden SKU-2 is counted and visible SKU-1 is excluded. The client
checks the received count without computing it. Metadata names are
unrestricted; the observed name is `COUNT(*)`.

Strict client parse/generation/C syntax/link and the single Native trial
take 5.312942s under the unchanged 120s/2GiB gate. The process host takes
1.089062s. There is one qualifier invocation, one Native attempt, no
retry and zero daemon AOT. Shared flock is acquired naturally and all
owned children are reaped.

Cached daemon ELF SHA256
`51be1324dd0e8a47aa960ae276b1769d32093a467114a8be85b99bf00c3236ae`
comes from Native-qualified producer commit `00c7c73d124659daf06b667ec0f67dee5cc50372`.
All five dependencies match committed HEAD blobs and the producer receipt;
the full SDK and ELF hashes are checked. Tested SQL SHA256 is
`7b8a29255a767abb8ad6eaaf0ccc325af357da686a55a9c1b8306c6ec29f6ef9`.
The held DESC working-tree candidate is excluded from this qualification.

An offline audit of the same trace verifies five setup ACKs, both visibility
seeds, the exact SQL, one parameter, statement1, raw bind0, one text1 row,
eight client packets and 13 daemon packets with ERR0. Existing SQL36,
COUNT WHERE4 and the cached daemon's other scope guards pass. No extra
Native execution is used. FreeLang handles protocol and assertions;
private Python validates and manages processes, while native socat relays
opaque bytes. No Node execution or attempt occurs.

The reference fixture SHA256 `7c432576f531847682642d4bba0d81838f431431b0e5179c3914bceebc1492bd`
and original fixture SHA256 `95a5ca493dbebe90072376c90fd46ba673decdc96d9740055d6c9951a91b48b1`
remain unchanged. DESC SQL candidate `6bf11a6f...`, its failed fixture,
and BEGIN/ROLLBACK failed fixture `1f587d3f...` remain uncommitted HOLD.
There are no product source changes.

Earlier 1064, AOT_EXIT_124, COUNT TIMEOUT, GCC_OBJECT_EXIT_124 and BEGIN
1064 failures remain preserved. The prior visible-COUNT FileNotFound
preflight remains separately UNVERIFIED. This result does not qualify
DESC, transaction rollback, original71, original25 or full regression.
Only this fixture, document and [receipt](evidence/native-shop-products-hidden-count-20261122.json)
are archived.
