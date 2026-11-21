# Native TCP shared peer request budget

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Only owned Native processes, private loopback networking and fresh synthetic
storage were used.

The existing case 55 FL fixture supplies peer addresses to the handler directly.
The new independent [FL fixture](../tests/native-tcp-peer-rate-limit.fls) instead
opens two real TCP connections to the existing Native daemon, verifies distinct
Native handles and sends four pings without a login or extra probe request.
The fixed host configures max 3 requests per 60000ms window. The kernel trace
contains two accepted peers from 127.0.0.1 with distinct remote ports.

| Request | Connection | Observed response |
|---|---|---|
| 1 | first | ok:true |
| 2 | second | ok:true |
| 3 | first | ok:true |
| 4 | second | ok:false, error:RATE_LIMITED |

The complete shared-budget contract passes 1/1 in one attempt. A per-connection
budget of 3 would allow the fourth request, so these two connections exercise
shared peer accounting. No peer address is injected by the fixture or host.
This result covers the requested same-peer flow; it is not a whole service
release qualification.

The 19.379153-second observation includes generation, syntax checking and
linking of the new FL fixture plus the 0.215897-second runtime/process contract.
The existing daemon ELF from `tests/tcp-soak-daemon.fls` was reused after checking
its SHA and all current product-source dependencies. Its AOT cost is outside
this observation. The trial retained 120s, 2GiB per process and the existing shared
heavy lock. Compiler and GCC options and the original 20 runtime C inputs stayed
unchanged. No retry was made.

The fixture chooses a free port and writes `port.txt`, then `port.ready`, in a
fresh host-provided control directory. The fixed process host starts the existing
daemon on that port with max 3/window 60000 and fresh storage, waits for the fixture
and reaps its owned daemon after TERM. All readiness, packet order and response
assertions are FreeLang. The private host has no network requests or rate policy;
its one traced Python execution and the separate outer build/audit controller
are explicitly outside product execution. Native fixture 1 and daemon 1 execute;
Node executions and attempts are 0/0.

The [scoped receipt](evidence/native-tcp-peer-budget-20261121.json) records source,
binary, runtime-input and trace hashes and exact bounds. Original 56 JavaScript,
original 35 JavaScript and the protected Native 71-case mapping stay unchanged;
those original gate failures are not promoted by this standalone result. The
Native kill/re-login proof in be7e54ed, WAL 1e55d06 and existing 349/349 regressions
are preserved. The old regression suite was not rerun for this test-only addition.
No core implementation, compiler, DCE, GCC flag, production service or deployment
change is part of this result.
