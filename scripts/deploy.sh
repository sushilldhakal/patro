#!/usr/bin/env bash
# Remote deploy script — called by GitHub Actions over SSH.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/patro}"
SERVICE_NAME="nepali-holiday-api"
DEPLOY_REF="${DEPLOY_REF:-main}"

cd "${APP_DIR}"

echo "==> Pulling latest code (${DEPLOY_REF})"
git fetch origin "${DEPLOY_REF}"
git reset --hard "origin/${DEPLOY_REF}"

echo "==> Installing dependencies"
source .venv/bin/activate
pip install --upgrade pip -q
if [[ -f ephemeris_provision/setup.py ]]; then
  pip install -r requirements.txt -q
else
  echo "WARNING: ephemeris_provision/ not in tree — installing requirements without -e hook" >&2
  echo "         Commit ephemeris_provision/ on the branch or rely on install_ephemeris.py below." >&2
  grep -v '^-e ./ephemeris_provision' requirements.txt | pip install -r /dev/stdin -q
fi

if [[ ! -f data/cities.db ]] || ! python -c "from services.cities_db import needs_cities_reimport; raise SystemExit(1 if needs_cities_reimport() else 0)"; then
  echo "==> Building cities.db (GeoNames global + full Nepal coverage)"
  mkdir -p data
  python scripts/import_cities.py
fi

echo "==> Installing Swiss Ephemeris .se1 files (idempotent; also runs via requirements.txt)"
python scripts/install_ephemeris.py --extended

echo "==> Restarting service"
sudo systemctl restart "${SERVICE_NAME}"

echo "==> Waiting for service"
sudo systemctl is-active --quiet "${SERVICE_NAME}"

echo "==> Health check"
health_ok=0
for attempt in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:8000/health" >/tmp/patro-health.json; then
    health_ok=1
    head -c 200 /tmp/patro-health.json
    echo ""
    break
  fi
  if ! sudo systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo "Service not active (attempt ${attempt}/30)" >&2
    sudo journalctl -u "${SERVICE_NAME}" -n 40 --no-pager >&2 || true
    exit 1
  fi
  sleep 2
done

if [[ "${health_ok}" -ne 1 ]]; then
  echo "Health check failed after 30 attempts" >&2
  sudo journalctl -u "${SERVICE_NAME}" -n 40 --no-pager >&2 || true
  exit 1
fi

if [[ -f .env ]] && grep -qE '^DATABASE_URL=' .env; then
  if ! grep -qE '^GOOGLE_CLIENT_ID=' .env; then
    echo "WARNING: DATABASE_URL is set but GOOGLE_CLIENT_ID is missing — /auth/google returns 503" >&2
  fi
fi

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
