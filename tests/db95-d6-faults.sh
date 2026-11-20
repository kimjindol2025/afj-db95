#!/usr/bin/env bash
# D6: deterministic DB95 fault injection. Isolated DB only.
set -u
AFJ=/home/kim/.tmp/db95-iso/afj195
NODE=/home/kim/kim/platform/freelang-afj/bootstrap.js
ROOT=/home/kim/.tmp/db95-d6
mkdir -p "$ROOT"
run() { env AFJ_DB_WAL="$1" AFJ_DB_PORT=43999 ${2:-} node "$NODE" run "$AFJ/tests/$3" 2>&1; }
probe() {
  echo "--- probe $1"
  run "$1" '' db95-wal-probe.fls | grep -E 'RESULT |ROW |WAL_CORRUPT|CATALOG|error' | tail -6
}
base() { # create fresh wal with 3 commits + optional checkpoint page
  local d="$ROOT/$1"; rm -rf "$d"; mkdir -p "$d"
  run "$d/wal" '' db95-195-fixture-write.fls >/dev/null 2>&1
  echo "$d"
}
tamper_manifest() { python3 - "$1" <<'PY'
import json,sys,hashlib
p=sys.argv[1]; d=json.load(open(p))
data=json.loads(d['payload']['data']); data['wal-size']=999999
d['payload']['data']=json.dumps(data)
d['length']=len(d['payload']['data'].encode())
d['checksum']=hashlib.sha256(d['payload']['data'].encode()).hexdigest()
json.dump(d,open(p,'w')); print('MANIFEST_SIZE_TAMPERED')
PY
}

echo '===== F1: memory applied, WAL write failed (no prepare/commit for last change) ====='
D=$(base f1)
python3 - "$D/wal" <<'PY'
import sys
p=sys.argv[1]; l=open(p).read().splitlines(); open(p,'w').write('\n'.join(l[:-2])+'\n')
print('LAST_PREPARE_AND_COMMIT_REMOVED')
PY
probe "$D/wal"
echo "expect rows=2 revision=3 (uncommitted change absent)"

echo '===== F2: prepare recorded, then crash ====='
D=$(base f2)
python3 - "$D/wal" <<'PY'
import sys
p=sys.argv[1]; l=open(p).read().splitlines(); open(p,'w').write('\n'.join(l[:-1])+'\n')
PY
probe "$D/wal"
echo "expect rows=1 revision=2 (prepared insert not exposed)"

echo '===== F3: commit fsynced, crash before response ====='
D=$(base f3)
probe "$D/wal"
echo "expect rows=2 revision=3 (commit replayed once, no duplicate)"

echo '===== F4: checkpoint table-page write interrupted ====='
D=$(base f4); P="$D/pages"
run "$D/wal" "AFJ_DB_CATALOG_PAGES=$P" db95-wal-checkpoint.fls >/dev/null 2>&1
echo 'garbage' > "$P.tables/0000000000000001.page"
probe "$D/wal"; echo "note: probe has no catalog env; checking catalog read explicitly"
env AFJ_DB_WAL="$D/wal" AFJ_DB_CATALOG_PAGES="$P" AFJ_DB_PORT=43999 node "$NODE" run "$AFJ/tests/db95-wal-probe.fls" 2>&1 | grep -E 'RESULT |CORRUPT|error' | tail -4

echo '===== F5: checkpoint manifest write interrupted ====='
D=$(base f5); P="$D/pages"
run "$D/wal" "AFJ_DB_CATALOG_PAGES=$P" db95-wal-checkpoint.fls >/dev/null 2>&1
tamper_manifest "$P"
env AFJ_DB_WAL="$D/wal" AFJ_DB_CATALOG_PAGES="$P" AFJ_DB_PORT=43999 node "$NODE" run "$AFJ/tests/db95-wal-probe.fls" 2>&1 | grep -E 'RESULT |CORRUPT|error' | tail -4

echo '===== F6: WAL missing / partial / size mismatch ====='
D=$(base f6); P="$D/pages"
run "$D/wal" "AFJ_DB_CATALOG_PAGES=$P" db95-wal-checkpoint.fls >/dev/null 2>&1
cp "$D/wal" "$D/wal.bak"; rm "$D/wal"
echo -n 'missing: '; env AFJ_DB_WAL="$D/wal" AFJ_DB_CATALOG_PAGES="$P" AFJ_DB_PORT=43999 node "$NODE" run "$AFJ/tests/db95-wal-probe.fls" 2>&1 | grep -E 'RESULT |CORRUPT' | tail -1
mv "$D/wal.bak" "$D/wal"; tamper_manifest "$P"
echo -n 'size-mismatch: '; env AFJ_DB_WAL="$D/wal" AFJ_DB_CATALOG_PAGES="$P" AFJ_DB_PORT=43999 node "$NODE" run "$AFJ/tests/db95-wal-probe.fls" 2>&1 | grep -E 'RESULT |CORRUPT' | tail -1
echo 'D6_DONE'
