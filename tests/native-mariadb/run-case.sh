#!/usr/bin/env bash
# Fixed literal argv/file/owned-process host; policy is in control.fls.
set -Eeuo pipefail
umask 077
ulimit -v 2097152
ulimit -c 0

mode=${1-}
if [[ "$mode" == --work ]]; then
  output=$2; root=$3; harness=$4; sdk=$5
  export LD_LIBRARY_PATH="$sdk/lib" LIBRARY_PATH="$sdk/lib" LD_RUN_PATH="$sdk/lib"
  export AFJ_DB_MODE=development AFJ_DB_ROOT_PASSWORD=development-only
  export AFJ_NATIVE_MARIADB_OUTPUT="$output"
  export AFJ_NATIVE_MARIADB_LOG="$output/daemon.stdout"
  export AFJ_NATIVE_MARIADB_START_FILE="$output/start-ms.txt"
  date +%s%3N >"$AFJ_NATIVE_MARIADB_START_FILE"
  for label in daemon control; do
    if [[ "$label" == daemon ]]; then input="$root/tests/native-mariadb-daemon.fls"
    else input="$harness/control.fls"; fi
    timeout --foreground 120s "$sdk/bin/flc" --parse-json "$input" >"$output/$label.parse.json" 2>"$output/$label.parse.stderr"
    timeout --foreground 120s "$sdk/bin/flc" "$input" "$output/$label.c" >"$output/$label.generate.stdout" 2>"$output/$label.generate.stderr"
    set +e
    grep -qE '\[CGC-ERR\]|\[IR-ERR\]' "$output/$label.generate.stdout"
    compile_scan_status=$?
    set -e
    [[ "$compile_scan_status" -eq 1 ]] || exit 1
    timeout --foreground 180s gcc -O2 -w -rdynamic -Werror=implicit-function-declaration \
      -I "$sdk/include" -o "$output/$label-bin" "$output/$label.c" \
      -Wl,--whole-archive "$sdk/lib/runtime.a" -Wl,--no-whole-archive \
      -lm -lpthread -ldl -lsqlite3 -lssl -lcrypto "$sdk/lib/libcurl.so.4" \
      >"$output/$label.link.stdout" 2>"$output/$label.link.stderr"
  done
  export FL_FILE_BASE="$output"
  export AFJ_NATIVE_MARIADB_PORT
  AFJ_NATIVE_MARIADB_PORT=$(AFJ_NATIVE_MARIADB_ACTION=port "$output/control-bin")
  [[ "$AFJ_NATIVE_MARIADB_PORT" =~ ^[0-9]+$ ]] || exit 2
  daemon_pid=; active_pid=
  cleanup() {
    rc=$?
    trap - EXIT TERM INT
    if [[ -n "$active_pid" ]]; then kill -TERM "$active_pid" 2>/dev/null || true; fi
    if [[ -n "$daemon_pid" ]]; then kill -TERM "$daemon_pid" 2>/dev/null || true; fi
    wait 2>/dev/null || true
    exit "$rc"
  }
  trap cleanup EXIT
  trap 'exit 143' TERM
  trap 'exit 130' INT
  : >"$output/daemon.stdout"
  "$output/daemon-bin" >"$output/daemon.stdout" 2>"$output/daemon.stderr" & daemon_pid=$!
  AFJ_NATIVE_MARIADB_ACTION=ready "$output/control-bin" >"$output/ready.stdout" 2>"$output/ready.stderr" & active_pid=$!
  set +e
  wait -n -p finished_pid "$daemon_pid" "$active_pid"; child_status=$?
  set -e
  [[ "$finished_pid" == "$active_pid" && "$child_status" -eq 0 ]] || exit 1
  active_pid=
  for step in create insert select; do
    AFJ_NATIVE_MARIADB_ACTION=argv AFJ_NATIVE_MARIADB_STEP="$step" "$output/control-bin" >"$output/$step.argv"
    mapfile -d '' -t client_argv <"$output/$step.argv"
    [[ "${#client_argv[@]}" -eq 16 && "${client_argv[0]}" == DB95_MARIADB_ARGV/1 && "${client_argv[-1]}" == DB95_MARIADB_END/1 ]] || exit 2
    unset 'client_argv[0]' 'client_argv[-1]'
    "${client_argv[@]}" </dev/null >"$output/$step.stdout" 2>"$output/$step.stderr" & active_pid=$!
    set +e
    wait -n -p finished_pid "$daemon_pid" "$active_pid"; child_status=$?
    set -e
    printf '%s\n' "$child_status" >"$output/$step.status"
    [[ "$finished_pid" == "$active_pid" && "$child_status" -eq 0 ]] || exit 1
    active_pid=
  done
  AFJ_NATIVE_MARIADB_ACTION=result "$output/control-bin" >"$output/result.stdout" 2>"$output/result.stderr"
  cat -- "$output/result.stdout"
  exit 0
fi

script_parent=${BASH_SOURCE[0]%/*}
[[ "$script_parent" != "${BASH_SOURCE[0]}" ]] || script_parent=.
IFS= read -r -d '' harness < <(cd -P -- "$script_parent" && printf '%s\0' "$PWD")
if [[ "$mode" == --locked ]]; then
  output=$2; root=$3; sdk=$4
  "$sdk/verify.sh" >"$output/sdk.before.stdout" 2>"$output/sdk.before.stderr"
  mkdir -- "$output/native-path"
  for name in bash sh gcc as ld timeout env mkdir cat grep date mariadb; do
    command_path=$(type -P "$name")
    [[ "$command_path" == /* && -x "$command_path" ]] || exit 2
    ln -s -- "$command_path" "$output/native-path/$name"
  done
  set +e
  bwrap --die-with-parent --unshare-pid --unshare-net --ro-bind / / --dev-bind /dev /dev --proc /proc --tmpfs /tmp \
    --bind "$output" "$output" --clearenv --setenv PATH "$output/native-path" \
    --setenv LANG C.UTF-8 --setenv LC_ALL C.UTF-8 --chdir "$root" -- \
    timeout --foreground --kill-after=3s 120s /bin/bash "$harness/run-case.sh" --work "$output" "$root" "$harness" "$sdk"
  result=$?
  set -e
  printf 'NATIVE_MARIADB_HOST_EXIT=%s\n' "$result" >"$output/status.txt"
  "$sdk/verify.sh" >"$output/sdk.after.stdout" 2>"$output/sdk.after.stderr"
  exit "$result"
fi

[[ "$#" -eq 1 && "$mode" == /* && ! -e "$mode" && ! -L "$mode" ]] || { printf 'Usage: run-case.sh NEW_ABSOLUTE_OUTPUT_DIRECTORY\n' >&2; exit 2; }
: "${FREELANG_NATIVE_SDK_ROOT:?Activate the matching Native SDK env.sh}"
sdk=$FREELANG_NATIVE_SDK_ROOT; output=$mode
IFS= read -r -d '' root < <(cd -P -- "${AFJ_DB95_REPO_ROOT:-$harness/../..}" && printf '%s\0' "$PWD")
[[ -x "$sdk/bin/flc" && -f "$sdk/lib/runtime.a" ]] || exit 2
mkdir -- "$output"
IFS= read -r -d '' output < <(cd -P -- "$output" && printf '%s\0' "$PWD")
exec flock -o /tmp/fl-heavy.lock /bin/bash "$harness/run-case.sh" --locked "$output" "$root" "$sdk"
