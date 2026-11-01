#!/usr/bin/env bash
set -u

# DB95-3: exercise every existing release-gate case through the FX native
# compiler. An unported JS or shell case is an explicit FAIL, never a SKIP.
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
fx_root="${FX_ROOT:?FX_ROOT must name the freelang-v11-fx checkout}"
log_root="${NATIVE_GATE_LOG_DIR:-$(mktemp -d)}"
mkdir -p "$log_root"

runtime_sources=(
  core.c collection.c io.c math.c error.c process.c json.c aliases.c
  user-fns.c gc.c http.c raw_tcp.c websocket.c sqlite.c mariadb.c debug.c
  http_client.c regex.c smtp.c sse.c
)

if [[ "${1:-}" == "--worker" ]]; then
  number="$2" label="$3" rel_path="$4" case_dir="$5" env_text="$6"
  input="$repo_root/$rel_path"
  compiler="${FX_NATIVE_STAGE0:?}"
  mkdir -p "$case_dir"
  export AFJ_DB_WAL="$case_dir/case.wal"
  export AFJ_DB_REMEDIATION_WAL="$case_dir/remediation.wal"
  export AFJ_DB_AUTH_STATE="$case_dir/auth.jsonl"
  export AFJ_DB_AUDIT_LOG="$case_dir/audit.jsonl"
  export AFJ_BOOTSTRAP="$compiler"
  if [[ -n "$env_text" ]]; then
    read -r -a assignments <<< "$env_text"
    for assignment in "${assignments[@]}"; do export "$assignment"; done
  fi
  case "$input" in
    *.js)
      "$compiler" "$input" "$case_dir/case.c" || true
      echo 'NATIVE_JS_SOURCE_NOT_PORTED'
      exit 1
      ;;
    *.sh)
      safe_path="$log_root/native-path"
      PATH="$safe_path" /bin/bash "$input"
      result=$?
      if [[ "$result" -ne 0 ]]; then exit "$result"; fi
      if ! rg -q 'PASS' "$case_dir/output.log"; then
        echo 'NATIVE_PASS_MARKER_MISSING'
        exit 1
      fi
      ;;
    *.fls)
      "$compiler" "$input" "$case_dir/case.c" || exit 1
      gcc -fsyntax-only -Werror=implicit-function-declaration \
        -I "$fx_root/runtime" "$case_dir/case.c" || exit 1
      if [[ "$label" == syntax:* ]]; then exit 0; fi
      sources=()
      for name in "${runtime_sources[@]}"; do
        sources+=("$fx_root/runtime/$name")
      done
      gcc -O2 -w -rdynamic -Werror=implicit-function-declaration \
        -I "$fx_root/runtime" -o "$case_dir/case-bin" \
        "$case_dir/case.c" "${sources[@]}" \
        -lm -lpthread -ldl -lsqlite3 -lssl -lcrypto -lcurl || exit 1
      "$case_dir/case-bin" || exit 1
      if ! rg -q 'PASS' "$case_dir/output.log"; then
        echo 'NATIVE_PASS_MARKER_MISSING'
        exit 1
      fi
      ;;
    *) echo 'NATIVE_SOURCE_UNKNOWN'; exit 1 ;;
  esac
  exit 0
fi

if [[ ! -f "$fx_root/bootstrap/stage0.c" ]]; then
  echo 'NATIVE_FX_CHECKOUT_MISSING'
  exit 2
fi
compiler="${FX_NATIVE_STAGE0:-$log_root/stage0-bin}"
if [[ ! -x "$compiler" ]]; then
  bash "$fx_root/scripts/build-native-stage0.sh" "$compiler" \
    >"$log_root/stage0-build.log" 2>&1 || {
      echo 'NATIVE_STAGE0_BUILD_FAIL'
      exit 2
    }
fi
export FX_NATIVE_STAGE0="$compiler"

safe_path="$log_root/native-path"
mkdir -p "$safe_path"
for name in bash sh dirname pwd mktemp rm cp cat grep sed awk sha256sum \
            head tail seq sleep timeout env tr sort wc openssl mkdir touch \
            basename readlink date tee find cut rg tar gzip; do
  command_path="$(command -v "$name" || true)"
  if [[ "$command_path" == /* && -x "$command_path" ]]; then
    ln -s "$command_path" "$safe_path/$name" 2>/dev/null || true
  fi
done
if PATH="$safe_path" command -v node >/dev/null 2>&1 ||
   PATH="$safe_path" command -v python3 >/dev/null 2>&1; then
  echo 'NATIVE_PATH_INCLUDES_FORBIDDEN_RUNNER'
  exit 2
fi

pass_count=0
fail_count=0
timeout_count=0
case_number=0
while IFS= read -r line; do
  [[ "$line" == run_case\ \"* ]] || continue
  case_number=$((case_number + 1))
  label="$(printf '%s\n' "$line" | sed -n 's/^run_case "\([^"]*\)".*/\1/p')"
  rel_path="$(printf '%s\n' "$line" | sed -n 's/.*"\$repo_root\/\([^"]*\)".*/\1/p')"
  env_text=''
  if [[ "$line" == *' env '* ]]; then
    env_text="${line#* env }"
    env_text="${env_text%% node *}"
  fi
  case_dir="$log_root/case-$case_number"
  mkdir -p "$case_dir"
  case_timeout=120
  [[ "$label" == 'TCP 5m performance envelope' ]] && case_timeout=360
  timeout --foreground "${case_timeout}s" /bin/bash "$0" --worker \
    "$case_number" "$label" "$rel_path" "$case_dir" "$env_text" \
    >"$case_dir/output.log" 2>&1
  result=$?
  if [[ "$result" -eq 0 ]]; then
    status=PASS
    pass_count=$((pass_count + 1))
  else
    status=FAIL
    fail_count=$((fail_count + 1))
    [[ "$result" -eq 124 ]] && timeout_count=$((timeout_count + 1))
  fi
  printf 'NATIVE_CASE=%s status=%s exit=%s label=%s\n' \
    "$case_number" "$status" "$result" "$label"
done < "$repo_root/tests/release-gate.sh"

printf 'NATIVE_GATE_PASS=%s FAIL=%s TIMEOUT=%s SKIP=0 TOTAL=%s\n' \
  "$pass_count" "$fail_count" "$timeout_count" "$case_number"
[[ "$case_number" -eq 71 ]] || exit 2
[[ "$fail_count" -eq 0 ]]
