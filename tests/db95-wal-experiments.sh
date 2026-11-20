#!/usr/bin/env bash
# DB95 WAL integrity experiments — isolated DB only. Never touches AFJ_DB_WAL defaults.
set -u
AFJ=/home/kim/.tmp/db95-iso/afj
NODE=/home/kim/kim/platform/freelang-afj/bootstrap.js
ROOT=/home/kim/.tmp/db95-wal-exp
mkdir -p "$ROOT"

run() { # <wal> <script> [extra env via ENVX]
  local wal="$1" script="$2"
  env AFJ_DB_WAL="$wal" AFJ_DB_PORT=43999 AFJ_DB_MODE=development ${ENVX:-} \
    node "$NODE" run "$AFJ/tests/$script" 2>&1
}
probe() {
  echo "--- probe: $1"
  run "$1" db95-wal-probe.fls | grep -E 'RESULT |ROW |WAL_CORRUPT|Error|error' | tail -8
}
fresh() {
  local d="$ROOT/$1"; rm -rf "$d"; mkdir -p "$d"; echo "$d"
}

echo '===== E1: concurrent writers ====='
D=$(fresh e1); W="$D/wal"
run "$W" db95-195-fixture-write.fls | tail -1
ENVX='WRITER_ID=3' run "$W" db95-wal-writer.fls >"$D/w3.log" 2>&1 &
p1=$!
ENVX='WRITER_ID=4' run "$W" db95-wal-writer.fls >"$D/w4.log" 2>&1 &
p2=$!
wait $p1 $p2
tail -1 "$D/w3.log"; tail -1 "$D/w4.log"
probe "$W"
echo "expected: rows=4 revision=5, no duplicates"

echo '===== E2: checkpoint prefix mismatch ====='
D=$(fresh e2); W="$D/wal"; P="$D/pages"
run "$W" db95-195-fixture-write.fls | tail -1
ENVX="AFJ_DB_CATALOG_PAGES=$P" run "$W" db95-wal-checkpoint.fls | tail -1
ENVX='WRITER_ID=9' run "$W" db95-wal-writer.fls | tail -1
python3 - "$P" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p))
data=json.loads(d['payload']['data'])
old=data['wal-prefix']
data['wal-prefix']='0'*64
d['payload']['data']=json.dumps(data)
# page-set checksum covers payload string; recompute SHA-256 of new payload
import hashlib
d['length']=len(d['payload']['data'].encode())
d['checksum']=hashlib.sha256(d['payload']['data'].encode()).hexdigest()
json.dump(d,open(p,'w'))
print('PREFIX_TAMPERED old=%s new=%s' % (old[:12], data['wal-prefix'][:12]))
PY
probe "$W"
echo "expected if prefix ignored: rows=3 revision=4 (full replay, no duplicates)"

echo '===== E3: prepare without commit ====='
D=$(fresh e3); W="$D/wal"
run "$W" db95-195-fixture-write.fls | tail -1
python3 - "$W" <<'PY'
import sys
p=sys.argv[1]
lines=open(p).read().splitlines()
open(p,'w').write('\n'.join(lines[:-1])+'\n')
print('LAST_COMMIT_REMOVED prepare_count=%d' % sum('"type":"prepare"' in l for l in lines[:-1]))
PY
probe "$W"

echo '===== E4: WAL corruption / truncation ====='
D=$(fresh e4); W="$D/wal"
run "$W" db95-195-fixture-write.fls | tail -1
python3 - "$W" <<'PY'
import sys
p=sys.argv[1]; b=bytearray(open(p,'rb').read())
b[len(b)//2]=ord('X') if b[len(b)//2]!=ord('X') else ord('Y')
open(p,'wb').write(b)
print('CORRUPTED_MIDDLE byte=%d' % (len(b)//2))
PY
probe "$W"
D2=$(fresh e4b); W2="$D2/wal"
run "$W2" db95-195-fixture-write.fls | tail -1
python3 - "$W2" <<'PY'
import sys
p=sys.argv[1]; b=open(p,'rb').read()
open(p,'wb').write(b.rstrip(b'\n')[:-40])
print('TRUNCATED_TAIL bytes=%d' % len(open(p,'rb').read()))
PY
probe "$W2"

echo '===== E5: growth / disk-limit ====='
D=$(fresh e5); W="$D/wal"
run "$W" db95-195-fixture-write.fls | tail -1
s0=$(stat -c %s "$W")
for i in $(seq 1 8); do ENVX="WRITER_ID=$((i + 10))" run "$W" db95-wal-writer.fls >/dev/null 2>&1; done
s1=$(stat -c %s "$W")
echo "WAL_GROWTH bytes ${s0} -> ${s1} monotonic=$([ "$s1" -gt "$s0" ] && echo YES || echo NO)"
D2=$(fresh e5b); W2="$D2/wal"
run "$W2" db95-195-fixture-write.fls >/dev/null 2>&1
echo -n 'DISK_LIMIT_ULIMIT: '
( ulimit -f 1; ENVX='WRITER_ID=limited' run "$W2" db95-wal-writer.fls 2>&1 | tail -2 ) || echo "writer_exit=$?"
echo "RESULT_DONE"
