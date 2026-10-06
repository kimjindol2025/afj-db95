#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_ROOT="${FREELANG_INTERNAL_ROOT:-/home/kim/kim/projects/.internal/afj-db95}"
CURRENT="$DEPLOY_ROOT/current"
PREVIOUS="$DEPLOY_ROOT/previous"

if [[ ! -L "$CURRENT" || ! -L "$PREVIOUS" ]]; then
  echo 'INTERNAL_ROLLBACK=BLOCKED'
  echo 'CAUSE=current and previous internal releases are both required'
  exit 2
fi

CURRENT_TARGET="$(readlink -f -- "$CURRENT")"
PREVIOUS_TARGET="$(readlink -f -- "$PREVIOUS")"
ln -sfn "$CURRENT_TARGET" "$PREVIOUS.tmp.$$"
mv -Tf "$PREVIOUS.tmp.$$" "$PREVIOUS"
ln -s "$PREVIOUS_TARGET" "$CURRENT.tmp.$$"
mv -Tf "$CURRENT.tmp.$$" "$CURRENT"

echo "INTERNAL_ROLLBACK_TARGET=$CURRENT"
echo "INTERNAL_ROLLBACK_COMMIT=$(basename -- "$(readlink -f -- "$CURRENT")")"
echo 'INTERNAL_ROLLBACK=PASS'
