# Native TCP SIGKILL, re-login and pending-row exclusion

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.
Only owned Native processes and fresh synthetic storage were used.

The existing Native evidence did not qualify a live TCP transaction across
SIGKILL and a new login. The independent
[FL fixture](../tests/native-tcp-kill-relogin.fls) now observes that contract.
The original case 35 JavaScript input and the 71-case Native gate mapping remain
unchanged; original 35 remains FAIL at its JS-to-flc parser path. This standalone
result is not an original 35 gate PASS.

The fixture opens a persistent Native TCP connection, logs in, creates its
private table and autocommits row 101 (`durable`). It begins a transaction and
stages row 202 (`pending`), then verifies both rows through the same connection.
That connection stays open while the fixed process host sends SIGKILL to its
owned daemon and waits for exit -9. The host starts the identical daemon ELF
with the same WAL and port. The FL fixture opens a new connection, logs in
again and asserts exactly row 101. The pending row is absent.

| Check | Observation |
|---|---|
| Complete independent contract | 1/1 PASS, one attempt |
| Before kill, transaction owner | 2 exact rows |
| First daemon exit | SIGKILL, -9; kernel trace and wait status checked |
| Re-login after restart | ok:true; returned token used for SELECT |
| Recovered rows | exactly id101/name durable; pending id202 absent |
| Native execution | fixture 1, existing daemon 2 |
| Node executions or attempts | 0/0 |
| Cleanup | fixture exit0; restarted daemon reaped after owned TERM |

The20.061562-second observation includes generation, syntax checking and
linking of the new FL fixture plus the 0.504715-second process/runtime contract.
It uses the 120-second, 2GiB-per-process envelope and the existing shared heavy
lock. The daemon ELF was already built from the same current product sources
and was SHA-256 verified and reused. Its AOT cost is outside this observation;
this is not a fresh two-ELF build qualification. Compiler and GCC options were
unchanged, and the fixture uses the original 20 frozen runtime C inputs.

The FL fixture owns port choice, readiness, all protocol requests and every
row/lifecycle assertion. Its host interface is local control files:

1. The fixture writes `port.txt`, then `port.ready` in a fresh control directory.
2. The fixed host starts the existing `tests/tcp-soak-daemon.fls` Native ELF with
   that port and fresh storage. The fixture waits for TCP and performs its
   committed/pending transaction assertions.
3. `kill.ready` requests SIGKILL of that owned daemon. After reaping it, the host
   restarts the same ELF/WAL/port and atomically publishes `restarted.json`
   containing `signal`, `old_exit`, `old_pid` and `new_pid`.
4. The fixture verifies the host's signal/exit receipt, reauthenticates, checks
   the recovered rows and emits one typed `NATIVE_TCP_KILL_RELOGIN_RESULT`.

The private Python host supplies fixed argv, files and owned process lifetimes;
it implements no database/protocol/row policy. Its one traced Python execution
and the separate outer build/audit controller are explicitly outside product
execution. The collected trace confirms an actual successful kill(SIGKILL),
one daemon killed by that signal, and its signalled wait status. Typed output
alone is not the signal evidence.

Source, binary, runtime-input and trace hashes and exact bounds are in the
[scoped receipt](evidence/native-tcp-sigkill-relogin-20261121.json). Core sources,
the original JS input, protected gate mapping, existing WAL 1e55d06, case 28/30
commits and their evidence are preserved. Existing 349/349 regressions were
retained rather than rerun for this test-only addition. No DCE, compiler change,
service protocol change, production activation or whole 71-case requalification
is part of this result.
