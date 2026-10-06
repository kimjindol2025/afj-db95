#!/usr/bin/env bash
set -eu

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
bootstrap="${AFJ_BOOTSTRAP:-}"
if [[ -z "$bootstrap" || ! -f "$bootstrap" ]]; then
  echo "AFJ_BOOTSTRAP_REQUIRED"
  exit 2
fi

runtime_dir="$(mktemp -d "$repo_root/.canary-runtime.XXXXXX")"
trap 'rm -rf "$runtime_dir"' EXIT
current="$runtime_dir/current.tar.gz"
previous="$runtime_dir/previous.tar.gz"

AFJ_BOOTSTRAP="$bootstrap" "$repo_root/.freelang/artifact.sh" "$current" >/dev/null
current_hash="$(sha256sum "$current" | awk '{print $1}')"
AFJ_BOOTSTRAP="$bootstrap" "$repo_root/.freelang/smoke.sh" >/dev/null
AFJ_BOOTSTRAP="$bootstrap" node "$repo_root/tests/production-native-tls.js"
cp "$current" "$previous"
previous_hash="$(sha256sum "$previous" | awk '{print $1}')"
"$repo_root/.freelang/rollback.sh" "$previous" >/dev/null

if [[ "$current_hash" == "$previous_hash" ]]; then
  echo "afj-db95 local canary/rollback PASS"
else
  echo "CANARY_ROLLBACK_HASH_MISMATCH"
  exit 1
fi
