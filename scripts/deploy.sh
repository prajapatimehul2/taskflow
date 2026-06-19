#!/usr/bin/env bash
# Phase 5 (first deploy) and Phase 11 (redeploy).
# Run from the server, inside the repo:  bash scripts/deploy.sh
# Requires a configured .env in the repo root (see deploy/env.production.example).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f .env ]; then
  echo "ERROR: .env not found. Copy deploy/env.production.example to .env first." >&2
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Ensuring database is up"
docker compose -f docker-compose.prod.yml up -d

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Applying database migrations"
pnpm prisma migrate deploy

echo "==> Building"
pnpm build

echo "==> Starting / reloading the app"
if pm2 describe taskflow >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "==> Deployed at $(date)"
