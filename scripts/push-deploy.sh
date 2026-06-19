#!/usr/bin/env bash
# Deploy the LOCAL project to the EC2 instance (no git remote needed).
# Syncs source over SSH, then installs deps, migrates, builds, and reloads.
#
# Prereq: an SSH alias named 'taskflow' (see ~/.ssh/config) OR set TASKFLOW_HOST.
#   Usage:  bash scripts/push-deploy.sh
set -euo pipefail

HOST="${TASKFLOW_HOST:-taskflow}"
REMOTE_DIR="${TASKFLOW_REMOTE_DIR:-taskflow}"
SSH_OPTS="-o ServerAliveInterval=15 -o ServerAliveCountMax=10"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Syncing source to $HOST:~/$REMOTE_DIR"
# --delete keeps the remote in sync; excluded paths (node_modules, .next, .env)
# are protected from deletion, so the box keeps its deps, build, and secrets.
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.DS_Store' \
  --exclude '._*' \
  -e "ssh $SSH_OPTS" \
  ./ "$HOST:$REMOTE_DIR/"

echo "==> Installing, migrating, building, reloading on the instance"
ssh $SSH_OPTS "$HOST" "bash -lc '
  set -e
  cd ~/$REMOTE_DIR
  pnpm install --frozen-lockfile
  pnpm prisma migrate deploy
  pnpm build
  pm2 reload ecosystem.config.js --update-env
  pm2 save
'"

echo "==> Deployed. App reloaded on $HOST."
