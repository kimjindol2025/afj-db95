#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
"$repo_root/.freelang/tcp-smoke.sh"
printf 'PASS db95-2-tcp-smoke\n'
