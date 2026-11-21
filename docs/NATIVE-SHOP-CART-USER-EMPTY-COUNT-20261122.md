# Native empty cart COUNT functional recovery

STATUS=SCOPED_RECOVERY_PASS; ORIGINAL_FRESH_BOTH_GATE=TIMEOUT_FAIL;
COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged [FL COUNT fixture](../tests/native-shop-cart-user-empty-count.fls)
passes 1/1 in the separately authorized completed-daemon recovery cohort.
Fresh storage has the two agreed products and only cart row `(2,20,2,1)`;
user 10 has no cart row. The fixture prepares and executes this exact SQL
once with INT32 bind `10`:

```sql
SELECT COUNT(*) FROM shop_cart WHERE user_id=?
```

The server returns exactly one text value `0`, row payload `01 30`, with
no ERR or NULL row. The fixture rejects zero result rows and uses neither
IFNULL nor a client-generated zero. Its SHA, setup, SQL spaces, binding
and expected value remain unchanged across all three authorized cohorts.

`src/sql-core.fls` adds the bounded COUNT(*) WHERE equality form with an
internal default result label `COUNT(*)`. Four new checks reject AND,
ORDER BY, COUNT(column) and AS-with-WHERE forms. Existing COUNT AS and
grouped LEFT JOIN parsing paths remain. In `src/engine.fls`, only COUNT's
initial group value in `engine-aggregate-count` changes: explicit COUNT(*)
with no grouping and no input rows starts with `__all__` count 0. The
nonempty/grouped COUNT loop and mapping and the complete SUM/IFNULL paths
remain byte-identical. No other engine function changes.

The original fresh-both-AOT 120s/2GiB cohort remains FAIL with exit 124 at
120.036687 seconds. It never executed the Native client or daemon. Its
daemon ELF completed in 119.713015 seconds; client parse was interrupted
before producing a test ELF. Existing timed trace decomposition is
flc 15.454642 + gcc excluding ld 104.304286 + ld 0.222287 + other 0.055472
= 120.036687 seconds. Launch-to-runner time, including shared-lock waiting,
was 28.985121 seconds outside that gate. The retained receipt preserves
the complete decomposition and timeout evidence. This recovery does not
promote that fresh-both gate to PASS.

After separate authorization, the completed candidate daemon ELF is reused
with exact hash `8720cfded21cd575234fd0d5ef1c8928c4016a9daa345d4c0c43ff813688390f`.
The producer trace shows successful daemon parse, generation, C syntax and
link exits. Generated C, ELF, all five dependencies and all fixed SDK bytes
match their recorded hashes. Daemon flc/gcc/ld are not rerun. Only the new
client ELF is built before one Native execution in fresh storage. Elapsed
time is 4.763664 seconds for client AOT and runtime, excluding completed
daemon AOT; process-host time is 0.451555 seconds. The recovery limit
is still 120s/2GiB. No budget extension or automatic retry occurs.

One Native FL client, one completed Native daemon and installed Native
socat opaque byte relay execute. All framing, authentication, setup,
binding and assertions are FreeLang. Two private Python controllers outside
the product only qualify the trial and manage owned process/file lifetimes.
All owned children are reaped; Node-family attempts/executions are zero.

An offline audit of that single recovery trace verifies five setup ACKs,
only the user-20 cart seed, exact SQL, parameter count 1, statement ID 1,
INT32 bind 10 and one `COUNT(*)` column with text `0`. There are eight
client frames, 13 daemon frames and zero ERR. The trace contains only two
flc and two gcc calls, all for the client. Existing 36 SQL assertions,
JOIN/multiply/ORDER guards, SUM6, SUM-WHERE4, IFNULL6, COUNT-WHERE4 and
legacy grouped/nonempty COUNT engine checks pass at startup. No extra
Native execution is used for the audit. The
[scoped receipt](evidence/native-shop-cart-user-empty-count-20261122.json)
records source, SDK, binary, trace, audit and prior failure hashes.

The original 1064 failure, fresh-both timeout, prior shopping proofs,
plain-SUM NULL record, WAL and historical 349/349 evidence remain preserved.
Full regression and the original 71 gate are not rerun or promoted.
FreeLang parser/compiler, daemon/protocol, TLS, ACK and original25 remain
unchanged.
