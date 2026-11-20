#!/usr/bin/env bash
# Fixed argv/file/process host. All protocol, workload, readiness and result
# policy is FreeLang. Only owned synthetic children run inside a PID namespace.
set -Eeuo pipefail
umask 077
ulimit -v 2097152
ulimit -c 0

mode=${1-}
if [[ "$mode" == --runtime ]]; then
  shift
  case_name=$1; output=$2
  export AFJ_NATIVE_SERVICE_CASE="$case_name"
  export AFJ_NATIVE_SERVICE_LOG="$output/daemon.stdout"
  export AFJ_NATIVE_SERVICE_CLIENT_LOG="$output/client.stdout"
  export AFJ_DB_PORT
  AFJ_DB_PORT=$(AFJ_NATIVE_SERVICE_ACTION=port "$output/control-bin")
  [[ "$AFJ_DB_PORT" =~ ^[0-9]+$ ]] || exit 2
  export AFJ_DB_MODE=development AFJ_DB_BIND_HOST=127.0.0.1
  export AFJ_DB_WAL="$output/storage/tcp.wal"
  if [[ "$case_name" == soak ]]; then
    export AFJ_SOAK_MS=300000 AFJ_SOAK_P95_LATENCY_MS=15000 AFJ_SOAK_MAX_LATENCY_MS=20000
    export AFJ_DB_RATE_MAX_REQUESTS=10000 AFJ_DB_RATE_WINDOW_MS=60000
  fi
  mkdir -- "$output/storage"
  : >"$output/daemon.stdout"
  daemon_pid=; active_pid=
  cleanup() {
    rc=$?
    trap - EXIT TERM INT
    # Every PID in this namespace belongs to this fixture. Its namespace
    # owner additionally destroys all children when the outer wrapper exits.
    if [[ -n "$active_pid" ]]; then kill -TERM "$active_pid" 2>/dev/null || true; fi
    if [[ -n "$daemon_pid" ]]; then kill -TERM "$daemon_pid" 2>/dev/null || true; fi
    wait 2>/dev/null || true
    exit "$rc"
  }
  trap cleanup EXIT
  trap 'exit 143' TERM
  trap 'exit 130' INT
  "$output/daemon-bin" >"$output/daemon.stdout" 2>"$output/daemon.stderr" & daemon_pid=$!
  FL_FILE_BASE="$output" AFJ_NATIVE_SERVICE_ACTION=ready "$output/control-bin" >"$output/ready.stdout" 2>"$output/ready.stderr" & active_pid=$!
  set +e
  wait -n -p finished_pid "$daemon_pid" "$active_pid"; result=$?
  set -e
  [[ "$finished_pid" == "$active_pid" && "$result" -eq 0 ]] || exit 1
  active_pid=
  "$output/client-bin" >"$output/client.stdout" 2>"$output/client.stderr" & active_pid=$!
  set +e
  wait -n -p finished_pid "$daemon_pid" "$active_pid"; result=$?
  set -e
  [[ "$finished_pid" == "$active_pid" && "$result" -eq 0 ]] || exit 1
  active_pid=
  AFJ_NATIVE_SERVICE_ACTION=result "$output/control-bin" >"$output/result.stdout" 2>"$output/result.stderr"
  exit 0
fi

if [[ "$mode" == --inside ]]; then
  shift
  case_name=$1; output=$2; root=$3; harness=$4; sdk=$5
  export LD_LIBRARY_PATH="$sdk/lib" LIBRARY_PATH="$sdk/lib" LD_RUN_PATH="$sdk/lib"
  if [[ "$case_name" == soak ]]; then daemon_source="$root/tests/tcp-soak-daemon.fls"; client_source="$harness/tcp-long-soak-client.fls"; seconds=360
  else daemon_source="$root/tests/tcp-daemon.fls"; client_source="$harness/tcp-concurrency-client.fls"; seconds=120; fi
  for label in daemon client control; do
    if [[ "$label" == daemon ]]; then input="$daemon_source"
    elif [[ "$label" == client ]]; then input="$client_source"
    else input="$harness/control.fls"; fi
    timeout --foreground 120s "$sdk/bin/flc" --parse-json "$input" >"$output/$label.parse.json" 2>"$output/$label.parse.stderr"
    timeout --foreground 120s "$sdk/bin/flc" "$input" "$output/$label.c" >"$output/$label.generate.stdout" 2>"$output/$label.generate.stderr"
    if grep -qE '\[CGC-ERR\]|\[IR-ERR\]' "$output/$label.generate.stdout"; then exit 1; fi
    timeout --foreground 180s gcc -O2 -w -rdynamic -Werror=implicit-function-declaration \
      -I "$sdk/include" -o "$output/$label-bin" "$output/$label.c" \
      -Wl,--whole-archive "$sdk/lib/runtime.a" -Wl,--no-whole-archive \
      -lm -lpthread -ldl -lsqlite3 -lssl -lcrypto "$sdk/lib/libcurl.so.4" \
      >"$output/$label.link.stdout" 2>"$output/$label.link.stderr"
  done
  printf 'NATIVE_SERVICE_BUILD=COMPLETE\n' >"$output/build-status.txt"
  cat -- "$output/build-status.txt"
  # The separate 120/360-second runtime observations include port choice, daemon startup,
  # all requests, typed result checking and cleanup. AOT preparation is a
  # separately recorded stage; it is never called a fresh-build360 soak PASS.
  printf 'NATIVE_SERVICE_RUNTIME=STARTED\n' >"$output/runtime-status.txt"
  timeout --foreground --kill-after=3s "${seconds}s" bash "$harness/run-case.sh" --runtime "$case_name" "$output"
  cat -- "$output/result.stdout"
  exit 0
fi

script_parent=${BASH_SOURCE[0]%/*}
[[ "$script_parent" != "${BASH_SOURCE[0]}" ]] || script_parent=.
IFS= read -r -d '' harness < <(cd -P -- "$script_parent" && printf '%s\0' "$PWD")
if [[ "$mode" == --locked ]]; then
  shift
  case_name=$1; output=$2; root=$3; sdk=$4
  "$sdk/verify.sh" >"$output/sdk.before.stdout" 2>"$output/sdk.before.stderr"
  mkdir -- "$output/native-path"
  for name in bash sh gcc as ld timeout env mkdir cat grep; do
    command_path=$(type -P "$name")
    [[ "$command_path" == /* && -x "$command_path" ]] || exit 2
    ln -s -- "$command_path" "$output/native-path/$name"
  done
  set +e
  bwrap --die-with-parent --unshare-pid --unshare-net --ro-bind / / --dev-bind /dev /dev --proc /proc --tmpfs /tmp \
    --bind "$output" "$output" --clearenv --setenv PATH "$output/native-path" \
    --setenv LANG C.UTF-8 --setenv LC_ALL C.UTF-8 --chdir "$root" \
    -- /bin/bash "$harness/run-case.sh" --inside "$case_name" "$output" "$root" "$harness" "$sdk"
  result=$?
  set -e
  printf 'NATIVE_SERVICE_HOST_EXIT=%s\n' "$result" >"$output/status.txt"
  "$sdk/verify.sh" >"$output/sdk.after.stdout" 2>"$output/sdk.after.stderr"
  exit "$result"
fi

[[ "$#" -eq 2 && ( "$mode" == concurrency || "$mode" == soak ) ]] || { printf 'Usage: run-case.sh {concurrency|soak} NEW_ABSOLUTE_OUTPUT_DIRECTORY\n' >&2; exit 2; }
case_name=$mode; output=$2
[[ "$output" == /* && ! -e "$output" && ! -L "$output" ]] || exit 2
: "${FREELANG_NATIVE_SDK_ROOT:?Activate the matching Native SDK env.sh}"
sdk=$FREELANG_NATIVE_SDK_ROOT
IFS= read -r -d '' root < <(cd -P -- "${AFJ_DB95_REPO_ROOT:-$harness/../..}" && printf '%s\0' "$PWD")
[[ -x "$sdk/bin/flc" && -f "$sdk/lib/runtime.a" ]] || exit 2
mkdir -- "$output"
IFS= read -r -d '' output < <(cd -P -- "$output" && printf '%s\0' "$PWD")
exec flock -o /tmp/fl-heavy.lock /bin/bash "$harness/run-case.sh" --locked "$case_name" "$output" "$root" "$sdk"
