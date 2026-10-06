#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
COMMIT="${FREELANG_INTERNAL_COMMIT:-$(git -C "$ROOT" rev-parse HEAD)}"
BRANCH="${FREELANG_INTERNAL_BRANCH:-$(git -C "$ROOT" branch --show-current)}"
BOOTSTRAP="${AFJ_BOOTSTRAP:-/home/kim/kim/platform/freelang-afj/bootstrap.js}"
DEPLOY_ROOT="${FREELANG_INTERNAL_ROOT:-/home/kim/kim/projects/.internal/afj-db95}"
RELEASES="$DEPLOY_ROOT/releases"
CURRENT="$DEPLOY_ROOT/current"
PREVIOUS="$DEPLOY_ROOT/previous"
SHARED_DB="$DEPLOY_ROOT/shared/db"
RELEASE="$RELEASES/$COMMIT"

if [[ ! -f "$BOOTSTRAP" ]]; then
  echo 'INTERNAL_DEPLOY=BLOCKED'
  echo "CAUSE=AFJ bootstrap not found: $BOOTSTRAP"
  exit 2
fi
if [[ "$(git -C "$ROOT" rev-parse HEAD)" != "$COMMIT" ]]; then
  echo 'INTERNAL_DEPLOY=BLOCKED'
  echo 'CAUSE=working tree HEAD changed during deployment'
  exit 3
fi
if [[ -n "$(git -C "$ROOT" status --short)" && "${FREELANG_ALLOW_DIRTY_INTERNAL_DEPLOY:-0}" != 1 ]]; then
  echo 'INTERNAL_DEPLOY=BLOCKED'
  echo 'CAUSE=worktree is dirty; deploy a committed tree'
  exit 4
fi

export AFJ_BOOTSTRAP="$BOOTSTRAP"
echo 'INTERNAL_CHECK=START'
bash "$ROOT/.freelang/check.sh"
echo 'INTERNAL_CHECK=PASS'
echo 'INTERNAL_SMOKE=START'
bash "$ROOT/.freelang/smoke.sh"
echo 'INTERNAL_SMOKE=PASS'

mkdir -p "$RELEASES" "$SHARED_DB"
if [[ ! -e "$RELEASE" ]]; then
  mkdir "$RELEASE"
  tar --exclude='./.git' --exclude='./.freelang/db' -cf - -C "$ROOT" . | tar -xf - -C "$RELEASE"
  mkdir -p "$RELEASE/.freelang"
  ln -s "$SHARED_DB" "$RELEASE/.freelang/db"
fi

if [[ -L "$CURRENT" || -e "$CURRENT" ]]; then
  CURRENT_TARGET="$(readlink -f -- "$CURRENT")"
  if [[ "$CURRENT_TARGET" != "$RELEASE" ]]; then
    ln -sfn "$CURRENT_TARGET" "$PREVIOUS.tmp.$$"
    mv -Tf "$PREVIOUS.tmp.$$" "$PREVIOUS"
  fi
fi

ln -s "$RELEASE" "$CURRENT.tmp.$$"
mv -Tf "$CURRENT.tmp.$$" "$CURRENT"
printf '%s\n' \
  "commit=$COMMIT" \
  "branch=$BRANCH" \
  "source=$ROOT" \
  "current=$CURRENT" \
  "deployed_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  > "$DEPLOY_ROOT/active.env"

echo "INTERNAL_DEPLOY_TARGET=$CURRENT"
echo "INTERNAL_DEPLOY_COMMIT=$COMMIT"
echo "INTERNAL_DB=$SHARED_DB"
