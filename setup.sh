#!/usr/bin/env bash
# One-time Oracle Cloud VM bootstrap for nepali-holiday-api.
# Run as ubuntu: bash setup.sh
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:sushilldhakal/patro.git}"
APP_DIR="${APP_DIR:-/home/ubuntu/patro}"
SERVICE_NAME="nepali-holiday-api"

echo "==> Installing system packages"
sudo apt-get update -qq
sudo apt-get install -y python3 python3-pip python3-venv git curl

echo "==> Cloning repository"
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "    Repository already exists at ${APP_DIR}, pulling latest"
  git -C "${APP_DIR}" pull origin main
else
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

echo "==> Creating virtual environment"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Configuring environment"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "    Created .env from .env.example — review ${APP_DIR}/.env"
fi
mkdir -p cache

echo "==> Installing systemd service"
sudo cp deploy/nepali-holiday-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo "==> Opening port 8000 (UFW + OCI host iptables)"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 8000/tcp comment "Nepali Holiday API" || true
fi
bash scripts/oci-firewall.sh

echo "==> Service status"
sudo systemctl --no-pager status "${SERVICE_NAME}"

PUBLIC_IP="$(curl -sf ifconfig.me 2>/dev/null || echo 'YOUR_VM_IP')"
echo ""
echo "Setup complete. API: http://${PUBLIC_IP}:8000/health"
echo ""
echo "Next: enable HTTPS (required for GitHub Pages demo):"
echo "  bash scripts/setup-ssl.sh"
echo "  # or: PATRO_API_DOMAIN=api.yourdomain.com bash scripts/setup-ssl.sh"
