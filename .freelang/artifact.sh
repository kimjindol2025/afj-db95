#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
output="${1:-$repo_root/dist/afj-db95-artifact.tar.gz}"
mkdir -p "$(dirname "$output")"
tar -czf "$output" \
  --exclude=.git \
  --exclude=.release-gate-runtime.* \
  -C "$repo_root" README.md AGENTS.md src tests docs .freelang
sha256sum "$output"
