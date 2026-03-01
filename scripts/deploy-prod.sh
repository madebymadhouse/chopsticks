#!/usr/bin/env bash
set -euo pipefail

BRANCH=${1:-main}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repo"
  exit 1
fi

echo "[deploy] fetching..."
git fetch origin

echo "[deploy] checkout ${BRANCH}"
git checkout -- . && git checkout "${BRANCH}"

git pull --ff-only origin "${BRANCH}"

echo "[deploy] docker compose up (full stack)"
./scripts/stack-up.sh

echo "[deploy] done"
