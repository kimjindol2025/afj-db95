#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${AFJ_BOOTSTRAP:-}"
if [[ -z "$bootstrap" || ! -f "$bootstrap" ]]; then
  echo "AFJ_BOOTSTRAP_REQUIRED"
  exit 2
fi

node "$bootstrap" run "$repo_root/tests/collation-contract.fls"
node "$bootstrap" run "$repo_root/tests/metrics-contract.fls"
AFJ_BOOTSTRAP="$bootstrap" "$repo_root/.freelang/tcp-smoke.sh"
echo "afj-db95 artifact smoke PASS"
