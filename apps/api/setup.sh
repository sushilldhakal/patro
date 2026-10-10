#!/usr/bin/env bash
# One-time Oracle Cloud VM bootstrap for nepali-holiday-api.
# Run as ubuntu: bash setup.sh
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:sushilldhakal/patro.git}"
REPO_DIR="${REPO_DIR:-/home/ubuntu/patro}"
APP_DIR="${REPO_DIR}/apps/api"
SERVICE_NAME="nepali-holiday-api"

echo "==> Installing system packages"
sudo apt-get update -qq
sudo apt-get install -y python3 python3-pip python3-venv git curl

echo "==> Cloning repository"
if [[ -d "${REPO_DIR}/.git" ]]; then
  echo "    Repository already exists at ${REPO_DIR}, pulling latest"
  git -C "${REPO_DIR}" pull origin main
else
  git clone "${REPO_URL}" "${REPO_DIR}"
fi

cd "${APP_DIR}"

echo "==> Creating virtual environment"
# The virtualenv and .env live at the repo root (monorepo); the API runs from apps/api.
python3 -m venv "${REPO_DIR}/.venv"
source "${REPO_DIR}/.venv/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Configuring environment"
if [[ ! -f "${REPO_DIR}/.env" ]]; then
  cp .env.example "${REPO_DIR}/.env"
  echo "    Created .env from .env.example — review ${REPO_DIR}/.env"
fi
ln -sfn ../../.env .env
mkdir -p cache data
if [[ ! -f data/cities.db ]] || ! python -c "from services.cities_db import needs_cities_reimport; raise SystemExit(1 if needs_cities_reimport() else 0)"; then
  echo "==> Building cities.db (GeoNames global + full Nepal coverage)"
  python scripts/import_cities.py
fi

echo "==> Installing Swiss Ephemeris .se1 files (idempotent; also runs via requirements.txt)"
python scripts/install_ephemeris.py --extended

echo "==> Installing systemd service"
sudo cp deploy/nepali-holiday-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

# The API listens on 127.0.0.1:8000 only — nginx is the public entry point,
# so port 8000 is deliberately not opened in the firewall.

echo "==> Service status"
sudo systemctl --no-pager status "${SERVICE_NAME}"

PUBLIC_IP="$(curl -sf ifconfig.me 2>/dev/null || echo 'YOUR_VM_IP')"
echo ""
echo "Setup complete. API (on this host): http://127.0.0.1:8000/health — public traffic goes through nginx (${PUBLIC_IP})"
echo ""
echo "Next: enable HTTPS (required for GitHub Pages demo):"
echo "  bash scripts/setup-ssl.sh"
echo "  # or: PATRO_API_DOMAIN=api.yourdomain.com bash scripts/setup-ssl.sh"
