#!/usr/bin/env bash
# Website deploy — run by scripts/deploy.sh. Builds apps/web (with the shared
# packages it uses) and publishes it to the nginx web root.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/patro}"
WEB_DIR="${REPO_DIR}/apps/web"
WEB_ROOT="${WEB_ROOT:-/var/www/vedicpatro}"
# The website's old standalone checkout, for its .env on the first deploy.
OLD_WEB_DIR="${OLD_WEB_DIR:-/home/ubuntu/dhakal-patro}"

cd "${REPO_DIR}"

if [[ ! -f "${WEB_DIR}/.env" && -f "${OLD_WEB_DIR}/.env" ]]; then
  echo "==> Copying ${OLD_WEB_DIR}/.env → apps/web/.env (one-time move to the monorepo)"
  cp "${OLD_WEB_DIR}/.env" "${WEB_DIR}/.env"
fi

env_value() {
  [[ -f "${WEB_DIR}/.env" ]] && grep "^$1=" "${WEB_DIR}/.env" | head -1 | cut -d= -f2- | tr -d '"' || true
}

echo "==> Installing dependencies (website + shared packages only)"
npm ci --workspace=@vedic-patro/web --include-workspace-root --no-audit --no-fund

echo "==> Building production bundle (API base = /api, same-origin)"
BUILD_ENV=(VITE_API_BASE_URL=/api)
google_client_id="$(env_value VITE_GOOGLE_CLIENT_ID)"
[[ -n "${google_client_id}" ]] && BUILD_ENV+=(VITE_GOOGLE_CLIENT_ID="${google_client_id}")

ga_id="${VITE_GA_MEASUREMENT_ID:-}"
[[ -n "${ga_id}" ]] || ga_id="$(env_value VITE_GA_MEASUREMENT_ID)"
if [[ -z "${ga_id}" && -f "${WEB_ROOT}/index.html" ]]; then
  # The measurement ID is public (it is in every page); reuse the live one.
  ga_id="$(grep -o 'googletagmanager.com/gtag/js?id=G-[A-Z0-9]*' "${WEB_ROOT}/index.html" | head -1 | sed 's/.*id=//' || true)"
fi
[[ -n "${ga_id}" ]] && BUILD_ENV+=(VITE_GA_MEASUREMENT_ID="${ga_id}")

(cd "${WEB_DIR}" && env "${BUILD_ENV[@]}" npm run build)

if grep -q 'googletagmanager.com/gtag/js' "${WEB_DIR}/dist/index.html" 2>/dev/null; then
  echo "==> Google Analytics gtag snippet present in build"
else
  echo "WARNING: Google Analytics gtag snippet missing from dist/index.html." >&2
  echo "         Set VITE_GA_MEASUREMENT_ID in apps/web/.env or the repo's Actions secrets." >&2
fi

echo "==> Publishing apps/web/dist/ → ${WEB_ROOT}"
sudo mkdir -p "${WEB_ROOT}"
sudo rsync -a --delete "${WEB_DIR}/dist/" "${WEB_ROOT}/"

echo "==> Verifying published build"
test -f "${WEB_ROOT}/index.html" || { echo "index.html missing after publish" >&2; exit 1; }
test -f "${WEB_ROOT}/robots.txt" || { echo "robots.txt missing after publish" >&2; exit 1; }
test -f "${WEB_ROOT}/llms.txt" || { echo "llms.txt missing after publish" >&2; exit 1; }

if systemctl is-active --quiet nginx 2>/dev/null; then
  echo "==> Reloading nginx"
  sudo nginx -t
  sudo systemctl reload nginx
fi
