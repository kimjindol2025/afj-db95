#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source "$repo_root/tests/bootstrap-path.sh"
bootstrap="$(resolve_afj_bootstrap)"
cd "$repo_root"

for pass in 1 2 3; do
  scratch="$(mktemp -d)"
  printf 'DB95_FIXED_RUN=%s\n' "$pass"
  AFJ_DB_WAL="$scratch/index.wal" \
    AFJ_DB_CATALOG_PAGES="$scratch/index.pages" \
    node "$bootstrap" run tests/silent-batch-index.fls
  DB95_TEST_WAL="$scratch/core.wal" \
    node "$bootstrap" run tests/silent-wal-recovery.fls
  AFJ_DB_WAL="$scratch/tcp.wal" \
    AFJ_DB_CATALOG_PAGES="$scratch/tcp.pages" \
    node "$bootstrap" run tests/silent-tcp-wal-recovery.fls
  printf 'DB95_FIXED_RUN_PASS=%s\n' "$pass"
done

printf 'DB95_THREE_PASS=3/3\n'
