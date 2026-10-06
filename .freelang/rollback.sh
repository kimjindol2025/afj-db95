#!/usr/bin/env bash
set -u

previous="${1:-}"
if [[ -z "$previous" || ! -f "$previous" ]]; then
  echo "PREVIOUS_ARTIFACT_REQUIRED"
  exit 2
fi
sha256sum "$previous"
echo "afj-db95 rollback artifact selected; deployment owner must activate it"
