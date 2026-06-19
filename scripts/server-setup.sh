#!/usr/bin/env bash
# Phase 2 (swap) + Phase 3 (base software) + Phase 8 (auto updates).
# Run ONCE on a fresh Amazon Linux 2023 instance:  bash scripts/server-setup.sh
# After it finishes, log out and back in so the docker group applies.
set -euo pipefail

echo "==> Ensuring 2G swap"
if ! sudo swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> System update"
sudo dnf update -y

echo "==> Installing Node 20, git, docker"
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs git docker

echo "==> Enabling docker"
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

echo "==> Installing docker compose plugin"
PLUGIN_DIR=/usr/local/lib/docker/cli-plugins
sudo mkdir -p "$PLUGIN_DIR"
sudo curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o "$PLUGIN_DIR/docker-compose"
sudo chmod +x "$PLUGIN_DIR/docker-compose"

echo "==> Installing pnpm + pm2"
sudo npm i -g pnpm pm2

echo "==> Installing Caddy (official static binary — COPR has no Amazon Linux 2023 repo)"
sudo curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=$( [ "$(uname -m)" = "aarch64" ] && echo arm64 || echo amd64 )" \
  -o /usr/local/bin/caddy
sudo chmod +x /usr/local/bin/caddy
sudo groupadd --system caddy 2>/dev/null || true
id caddy >/dev/null 2>&1 || sudo useradd --system --gid caddy --create-home \
  --home-dir /var/lib/caddy --shell /usr/sbin/nologin caddy
sudo mkdir -p /etc/caddy
sudo tee /etc/systemd/system/caddy.service >/dev/null <<'UNIT'
[Unit]
Description=Caddy
After=network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload

echo "==> Enabling automatic security updates"
sudo dnf install -y dnf-automatic
sudo systemctl enable --now dnf-automatic.timer

echo "==> Done. Log out/in so the docker group takes effect."
