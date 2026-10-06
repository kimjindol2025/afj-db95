#!/usr/bin/env bash
set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${AFJ_BOOTSTRAP:-}"
if [[ -z "$bootstrap" || ! -f "$bootstrap" ]]; then
  echo "AFJ_BOOTSTRAP_REQUIRED"
  exit 2
fi

node "$bootstrap" check "$repo_root/src/tcp-server.fls"
node "$bootstrap" check "$repo_root/src/afj-db95.fls"
echo "afj-db95 project check PASS"
