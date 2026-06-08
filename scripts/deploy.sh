#!/usr/bin/env bash
# Remote deploy script — called by GitHub Actions over SSH.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/patro}"
SERVICE_NAME="nepali-holiday-api"

cd "${APP_DIR}"

echo "==> Pulling latest code"
git fetch origin main
git reset --hard origin/main

echo "==> Installing dependencies"
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo "==> Restarting service"
sudo systemctl restart "${SERVICE_NAME}"

echo "==> Waiting for service"
sleep 2
sudo systemctl is-active --quiet "${SERVICE_NAME}"

echo "==> Health check"
curl -sf "http://127.0.0.1:8000/health" | head -c 200
echo ""

if systemctl is-active --quiet nginx 2>/dev/null; then
  sudo nginx -t
  sudo systemctl reload nginx
fi

if [[ -f .env ]] && grep -q '^PATRO_API_DOMAIN=' .env; then
  DOMAIN="$(grep '^PATRO_API_DOMAIN=' .env | cut -d= -f2-)"
  curl -sf "https://${DOMAIN}/health" | head -c 200 || true
  echo ""
fi

echo "Deploy successful."
