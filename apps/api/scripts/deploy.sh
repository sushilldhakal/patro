#!/usr/bin/env bash
# API deploy — run by the repo-root scripts/deploy.sh (GitHub Actions over SSH).
set -euo pipefail

# Called by the repo-root scripts/deploy.sh after it has pulled the monorepo.
REPO_DIR="${REPO_DIR:-/home/ubuntu/patro}"
APP_DIR="${REPO_DIR}/apps/api"
SERVICE_NAME="nepali-holiday-api"

cd "${APP_DIR}"

# ── One-time move to the monorepo layout ─────────────────────────────────────
# The API used to live at the repo root. Its runtime files are not in git
# (cities.db, the .se1 ephemeris, the SQLite caches), so moving the code left
# them behind at the root; carry them over instead of rebuilding them.
for dir in data cache; do
  if [[ -d "${REPO_DIR}/${dir}" ]]; then
    echo "==> Moving runtime files ${REPO_DIR}/${dir} → ${APP_DIR}/${dir}"
    mkdir -p "${APP_DIR}/${dir}"
    shopt -s dotglob nullglob
    for entry in "${REPO_DIR}/${dir}"/*; do
      dest="${APP_DIR}/${dir}/$(basename "${entry}")"
      if [[ ! -e "${dest}" ]]; then
        # Same filesystem: a rename, so the still-running old process keeps
        # writing to the same files until the restart below.
        mv "${entry}" "${dest}"
      elif [[ -d "${entry}" ]]; then
        rsync -a --ignore-existing "${entry}/" "${dest}/"
      fi
    done
    shopt -u dotglob nullglob
    rm -rf "${REPO_DIR:?}/${dir}"
  fi
done
# config/__init__.py loads .env from this directory; the real one stays at the
# repo root (systemd reads it from there too).
for env in .env .env.local; do
  if [[ -f "${REPO_DIR}/${env}" && ! -e "${APP_DIR}/${env}" ]]; then
    ln -s "../../${env}" "${APP_DIR}/${env}"
  fi
done

echo "==> Installing dependencies"
source "${REPO_DIR}/.venv/bin/activate"
pip install --upgrade pip -q
if [[ -f ephemeris_provision/setup.py ]]; then
  pip install -r requirements.txt -q
else
  echo "WARNING: ephemeris_provision/ not in tree — installing requirements without -e hook" >&2
  echo "         Commit ephemeris_provision/ on the branch or rely on install_ephemeris.py below." >&2
  grep -v '^-e ./ephemeris_provision' requirements.txt | pip install -r /dev/stdin -q
fi

if [[ ! -f data/cities.db ]] || ! python -c "from services.geography.cities_db import needs_cities_reimport; raise SystemExit(1 if needs_cities_reimport() else 0)"; then
  echo "==> Building cities.db (GeoNames global + full Nepal coverage)"
  mkdir -p data
  python scripts/import_cities.py
fi

echo "==> Installing Swiss Ephemeris .se1 files (idempotent; also runs via requirements.txt)"
python scripts/install_ephemeris.py --extended

echo "==> Installing systemd units (if changed)"
install_unit() {
  local name="$1" required="$2"
  local src="deploy/${name}" dst="/etc/systemd/system/${name}"
  # Optional units (the Facebook post timer) are only kept up to date where
  # they were installed by hand; this never enables one.
  [[ "${required}" == "1" || -f "${dst}" ]] || return 0
  cmp -s "${src}" "${dst}" && return 0
  if ! sudo -n true 2>/dev/null; then
    echo "WARNING: no passwordless sudo — ${dst} not updated" >&2
    return 0
  fi
  [[ -f "${dst}" ]] && sudo cp "${dst}" "${dst}.bak"
  sudo install -m 644 "${src}" "${dst}"
  echo "    Updated ${dst} (previous copy kept as .bak)"
  UNITS_CHANGED=1
}
UNITS_CHANGED=0
install_unit "${SERVICE_NAME}.service" 1
install_unit vedicpatro-fb-daily.service 0
install_unit vedicpatro-fb-daily.timer 0
install_unit vedicpatro-warm-cache.service 1
install_unit vedicpatro-warm-cache.timer 1
if [[ "${UNITS_CHANGED}" == "1" ]]; then
  sudo systemctl daemon-reload
fi
if sudo -n true 2>/dev/null && ! systemctl is-enabled --quiet vedicpatro-warm-cache.timer 2>/dev/null; then
  sudo systemctl enable --now vedicpatro-warm-cache.timer
fi

# More uvicorn workers than cores + 1 only fight over the CPU (see the unit file).
CORES="$(nproc 2>/dev/null || echo 2)"
ENV_WORKERS="$(grep -E '^WEB_CONCURRENCY=' "${REPO_DIR}/.env" 2>/dev/null | tail -1 | cut -d= -f2 || true)"
if [[ -n "${ENV_WORKERS}" && "${ENV_WORKERS}" -gt $((CORES + 1)) ]]; then
  echo "WARNING: .env sets WEB_CONCURRENCY=${ENV_WORKERS} on ${CORES} cores — use $((CORES + 1))" >&2
fi

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

echo "==> Seeding documents"
# The service restart above resets services/scripture/documents_db.py's in-process
# _seeded flag, so the next request to touch it pays a real reseed (parses every
# data/documents_source/*.json manifest — ~1.5s with the Rigveda corpus). A few
# list requests pay that here, spread over the workers, instead of the first
# visitors. Chapters are not pre-built: documents are cached by Cloudflare only
# (never Redis), so a server-side build would be thrown away.
python - <<'PYEOF' || echo "WARNING: documents seed failed (non-fatal)" >&2
import urllib.request

for _ in range(6):
    with urllib.request.urlopen("http://127.0.0.1:8000/v1/documents", timeout=30) as resp:
        resp.read()
print("Seeded documents")
PYEOF

# Documents are cached at the edge for hours (api/documents.py) and their URLs do
# not change on an edit, so a deploy that changes a manifest purges Cloudflare.
# The free plan has no prefix purge, so this purges the zone; the warm job below
# refills the busy pages. Needs CLOUDFLARE_API_TOKEN (Zone → Cache Purge) and
# CLOUDFLARE_ZONE_ID in .env; without them it only prints a reminder.
LAST_API_SHA="$(cat "${REPO_DIR}/.deploy/api.sha" 2>/dev/null || true)"
DOCS_CHANGED=0
if [[ -z "${LAST_API_SHA}" ]] || ! git -C "${REPO_DIR}" cat-file -e "${LAST_API_SHA}^{commit}" 2>/dev/null \
  || [[ -n "$(git -C "${REPO_DIR}" diff --name-only "${LAST_API_SHA}" HEAD -- apps/api/data/documents_source apps/api/api/documents.py)" ]]; then
  DOCS_CHANGED=1
fi
if [[ "${DOCS_CHANGED}" == "1" ]]; then
  CF_TOKEN="$(grep -E '^CLOUDFLARE_API_TOKEN=' "${REPO_DIR}/.env" 2>/dev/null | cut -d= -f2- || true)"
  CF_ZONE="$(grep -E '^CLOUDFLARE_ZONE_ID=' "${REPO_DIR}/.env" 2>/dev/null | cut -d= -f2- || true)"
  if [[ -n "${CF_TOKEN}" && -n "${CF_ZONE}" ]]; then
    echo "==> Documents changed — purging Cloudflare cache"
    curl -sf -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/purge_cache" \
      -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" \
      --data '{"purge_everything":true}' >/dev/null \
      && echo "    purged" || echo "WARNING: Cloudflare purge failed (non-fatal)" >&2
  else
    echo "NOTE: documents changed but CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID are not in .env;" >&2
    echo "      Cloudflare keeps old chapters for up to ~4 h. Purge in the dashboard if needed." >&2
  fi
fi

# Refill the caches for what people open next (scripts/warm_cache.py). Started,
# not waited for: the first ten-year build takes hours; later runs take minutes.
if sudo -n true 2>/dev/null && systemctl cat vedicpatro-warm-cache.service >/dev/null 2>&1; then
  echo "==> Starting cache warm in the background"
  sudo systemctl start --no-block vedicpatro-warm-cache.service || true
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
