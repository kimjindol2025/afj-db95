# Existing Native MariaDB packet-codec unit

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The unchanged existing [FL unit](../tests/mariadb-wire-codec.fls) passes 1/1
on HEAD `b1b5c36cbfec94803cf97d0845bddda7bb67c832`. Its four assertions verify a complete packet,
sequence 7, decoded payload `SELECT 1` and encoded `Kim` buffer length 4.
The exact original PASS marker is required, with exit zero.

One fresh strict parse, C generation, syntax check, link and Native unit
execution took 6.090041 seconds inside the 120-second envelope and 2GiB
limit. The shared heavy flock serialized this one trial. Source, fixture, SDK,
compiler and GCC options remained unchanged. No retry was made.
All 14 exec records have decoded terminal statuses: one Native unit ELF,
two compiler and two GCC executions. Node-family attempts/executions and traced
Python executions are zero. One private Python qualifier is outside the trace.

Original JS case 64 is an adapter/proxy integration using a synthetic upstream,
a handshake probe and a standard-client query returning `1\tKim\n`. This
existing four-assertion FL codec unit does not execute that integration. Its
1/1 PASS qualifies the explicitly listed Native unit assertions; original 64
FAIL and the original JS input are preserved. Neither original gate runner
changed and case 66 was not run. No JS implementation was ported.

The [scoped receipt](evidence/native-mariadb-packet-unit-20261121.json) records
exact input, dependency, binary, toolchain and trace hashes. Existing Native
wire, authentication rejection, prepared, WAL and 349/349 evidence is retained.
The old suite and whole gate were not rerun for this evidence-only archive.
No source or test implementation changed.
