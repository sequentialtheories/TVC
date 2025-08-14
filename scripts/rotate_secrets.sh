#!/usr/bin/env bash
set -euo pipefail

REQUIRED_ENVS=("NEW_KEY" "TARGET_ENV")
for var in "${REQUIRED_ENVS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required env: $var" >&2
    exit 1
  fi
done

exit 0
