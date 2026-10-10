#!/usr/bin/env bash
# Remote deploy script — called by GitHub Actions over SSH on push to main.
# Pulls latest main, builds the React app, and publishes it to the nginx web root.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/dhakal-patro}"
WEB_ROOT="${WEB_ROOT:-/var/www/vedicpatro}"
DEPLOY_REF="${DEPLOY_REF:-main}"

cd "${APP_DIR}"

echo "==> Pulling latest code (${DEPLOY_REF})"
git fetch origin "${DEPLOY_REF}"
git reset --hard "origin/${DEPLOY_REF}"

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building production bundle (API base = /api, same-origin)"
BUILD_ENV=(VITE_API_BASE_URL=/api)
if [[ -f .env ]] && grep -q '^VITE_GOOGLE_CLIENT_ID=' .env; then
  BUILD_ENV+=(VITE_GOOGLE_CLIENT_ID="$(grep '^VITE_GOOGLE_CLIENT_ID=' .env | cut -d= -f2- | tr -d '"')")
fi
if [[ -n "${VITE_GA_MEASUREMENT_ID:-}" ]]; then
  BUILD_ENV+=(VITE_GA_MEASUREMENT_ID="$VITE_GA_MEASUREMENT_ID")
elif [[ -f .env ]] && grep -q '^VITE_GA_MEASUREMENT_ID=' .env; then
  BUILD_ENV+=(VITE_GA_MEASUREMENT_ID="$(grep '^VITE_GA_MEASUREMENT_ID=' .env | cut -d= -f2- | tr -d '"')")
fi
env "${BUILD_ENV[@]}" npm run build

if grep -q 'googletagmanager.com/gtag/js' dist/index.html 2>/dev/null; then
  echo "==> Google Analytics gtag snippet present in build"
else
  echo "WARNING: Google Analytics gtag snippet missing from dist/index.html." >&2
  echo "         Set VITE_GA_MEASUREMENT_ID in server .env or GitHub Actions secrets." >&2
fi

echo "==> Publishing dist/ → ${WEB_ROOT}"
sudo mkdir -p "${WEB_ROOT}"
sudo rsync -a --delete dist/ "${WEB_ROOT}/"

echo "==> Verifying published build"
test -f "${WEB_ROOT}/index.html" || { echo "index.html missing after publish" >&2; exit 1; }
test -f "${WEB_ROOT}/robots.txt" || { echo "robots.txt missing after publish" >&2; exit 1; }
test -f "${WEB_ROOT}/llms.txt" || { echo "llms.txt missing after publish" >&2; exit 1; }

if systemctl is-active --quiet nginx 2>/dev/null; then
  echo "==> Reloading nginx"
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "Deploy successful."
