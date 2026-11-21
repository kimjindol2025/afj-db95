# Native MariaDB prepared wire packet frames

STATUS=SCOPED_PASS; COMMERCIAL_READINESS=HOLD; DEPLOYMENT=NO.

The new independent [FL packet test](../tests/native-mariadb-prepared-packets.fls)
passes 1/1 with 30/30 assertions on HEAD `30805723ab74106d4d946af6fe9dda21b350610e`.
It uses the existing MariaDB codec directly and constructs three frames:

- PREPARE, opcode 22 and sequence 0, with two INSERT placeholders.
- PREPARE acknowledgement, sequence 1, 12-byte payload, two parameters and
  statement ID `0x01020304`, whose bytes must be `04 03 02 01`.
- EXECUTE, opcode 23 and sequence 0, 32-byte payload, the same statement ID,
  flags 0, iteration 1, empty null bitmap, new-types flag 1 and types 3/253.

Each frame's length bytes, sequence and completeness are checked. Bound values
must encode integer 513 as `01 02 00 00` and string `packet-bind` with length 11.
The existing parameter decoder must consume exactly all 32 payload bytes,
return those two values with their expected types, and the existing SQL binder
must produce `INSERT INTO packet_products (id,sku) VALUES (513,'packet-bind')`.
The output contains the exact typed result and the test's PASS marker.

Fresh strict parse, C generation, syntax check, link and one Native unit ELF
execution take 7.840209 seconds under the unchanged 120s/2GiB bounds and
shared heavy flock. No retry was made. All 14 exec records have decoded
terminal statuses; Node-family attempts/executions and traced Python executions
are zero. One private Python qualifier is outside the product trace. All source
and SDK bytes remained unchanged during the trial.

This is a codec/frame contract. It executes no live daemon and no case 71
client, and uses no previous PREPARE result to supply its PASS. The existing
codec and daemon implementation remain unchanged. Original case 66 is a JS
adapter-to-JSON-upstream prepared integration; that path remains unverified
and its FAIL is preserved. The JS test, adapter and both protected gate runners
remain unchanged. No JS implementation was ported.

The [scoped receipt](evidence/native-mariadb-prepared-packets-20261121.json)
records the source, binary, toolchain and trace hashes. Existing Native codec,
wire, authentication-rejection, case 71 client, WAL and 349/349 evidence remains
separate and preserved. The old suite and whole gate were not rerun for this
new independent packet test. No parser, compiler, runtime or TLS code changed.
