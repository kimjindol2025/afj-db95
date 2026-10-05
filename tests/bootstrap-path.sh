#!/usr/bin/env bash

resolve_afj_bootstrap() {
  local candidate="${AFJ_BOOTSTRAP:-}"
  if [ -z "$candidate" ] && [ -n "${FREELANG_AFJ_ROOT:-}" ]; then
    candidate="$FREELANG_AFJ_ROOT/bootstrap.js"
  fi
  if [ -z "$candidate" ] || [ ! -f "$candidate" ]; then
    echo "AFJ bootstrap not found; set AFJ_BOOTSTRAP or FREELANG_AFJ_ROOT" >&2
    return 2
  fi
  printf '%s\n' "$candidate"
}
