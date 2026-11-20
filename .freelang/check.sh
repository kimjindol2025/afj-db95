#!/usr/bin/env bash
# Fixed process/file host; check policy remains in the existing FreeLang checker.
set -Eeuo pipefail
ulimit -v 2097152
ulimit -c 0

if [[ "${1-}" == --locked ]]; then
  [[ "$#" -eq 3 ]] || exit 2
  repo_root=$2; sdk=$3
  export LD_LIBRARY_PATH="$sdk/lib"
  "$sdk/verify.sh" >/dev/null
  # Text mode retains the reference's metadata/pure-effect/type exit policy.
  "$sdk/bin/flc" --check "$repo_root/src/tcp-server.fls"
  "$sdk/bin/flc" --check "$repo_root/src/afj-db95.fls"
  "$sdk/verify.sh" >/dev/null
  echo "afj-db95 project check PASS"
  exit 0
fi

sdk=${FREELANG_NATIVE_SDK_ROOT-}
if [[ -z "$sdk" || ! -x "$sdk/bin/flc" || ! -x "$sdk/verify.sh" ]]; then
  echo "AFJ_NATIVE_SDK_REQUIRED" >&2
  exit 2
fi
IFS= read -r -d '' script_path < <(readlink -fz -- "${BASH_SOURCE[0]}")
IFS= read -r -d '' repo_root < <(cd -P -- "${script_path%/*}/.." && printf '%s\0' "$PWD")
IFS= read -r -d '' sdk < <(cd -P -- "$sdk" && printf '%s\0' "$PWD")
exec flock -o /tmp/fl-heavy.lock /bin/bash "$script_path" --locked "$repo_root" "$sdk"
