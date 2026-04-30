#!/usr/bin/env bash
set -euo pipefail

# Usage: sudo bash scripts/deploy.sh <domain> [email-for-certbot]
# Example: sudo bash scripts/deploy.sh regex.emilhorstmann.de mail@example.com

DOMAIN=${1:-}
EMAIL=${2:-}

if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo bash scripts/deploy.sh <domain> [email-for-certbot]"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Repo root: $REPO_ROOT"

ensure_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command '$1' not found. Install it and re-run." >&2
    exit 2
  fi
}

echo "1) Installing frontend deps and building"
cd "$REPO_ROOT"
if [ -f package.json ]; then
  npm install
  npm run build
else
  echo "No package.json found in $REPO_ROOT" >&2
  exit 3
fi

echo "2) Copy build to webroot"
sudo mkdir -p /var/www/regex-study/dist
sudo rsync -a dist/ /var/www/regex-study/dist/

echo "3) Ensure nginx is installed"
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y nginx
fi

echo "4) Deploy nginx site from repo"
if [ -f "$REPO_ROOT/nginx.conf" ]; then
  sudo cp "$REPO_ROOT/nginx.conf" /etc/nginx/sites-available/regex-study
else
  echo "Warning: $REPO_ROOT/nginx.conf not found — skipping copy" >&2
fi
sudo mkdir -p /etc/nginx/sites-enabled
sudo ln -sf /etc/nginx/sites-available/regex-study /etc/nginx/sites-enabled/regex-study

echo "5) Test and reload nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "6) Create systemd service for backend"
NODE_BIN=$(command -v node || true)
if [ -z "$NODE_BIN" ]; then
  echo "Node not found; installing node is recommended for running backend." >&2
else
  SERVICE_PATH=/etc/systemd/system/regex-study-backend.service
  sudo tee "$SERVICE_PATH" > /dev/null <<EOF
[Unit]
Description=regex-study backend
After=network.target

[Service]
WorkingDirectory=$REPO_ROOT/server
ExecStart=$NODE_BIN $REPO_ROOT/server/index.js
Restart=on-failure
User=root
Environment=NODE_ENV=production
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now regex-study-backend.service || true
fi

echo "7) Optional: obtain TLS certificate with certbot"
if [ -n "$EMAIL" ]; then
  if ! command -v certbot >/dev/null 2>&1; then
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
  fi
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" || true
else
  echo "No email provided — skipping automatic certbot run. To obtain certificate run:" \
       "sudo certbot --nginx -d $DOMAIN"
fi

echo "8) Open firewall for nginx (optional)"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 'Nginx Full' || true
fi

echo "Finished. Quick checks:"
echo "- Visit: https://$DOMAIN"
echo "- Backend (local): http://localhost:3001/api/courses"
echo "- Nginx status: sudo systemctl status nginx --no-pager"
echo "- Backend service status: sudo systemctl status regex-study-backend.service --no-pager"

exit 0
