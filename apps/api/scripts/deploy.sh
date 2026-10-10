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

if [[ ! -f data/cities.db ]] || ! python -c "from services.cities_db import needs_cities_reimport; raise SystemExit(1 if needs_cities_reimport() else 0)"; then
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
if [[ "${UNITS_CHANGED}" == "1" ]]; then
  sudo systemctl daemon-reload
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

echo "==> Warming documents cache"
# The service restart above resets services/documents_db.py's in-process
# _seeded flag, so the next request to touch it pays a real reseed (parses
# every data/documents_source/*.json manifest — ~1.5s with the Rigveda
# corpus) plus, per document, a cache-miss build the first time its content
# hash changes. Without this, that cost lands on whichever real visitor's
# request happens to be first — which is exactly the "why is this page
# taking 5-8s" complaint. Paying it here, synchronously, as part of the
# deploy instead, means every real visitor after this point hits an
# already-warm cache. Best-effort: a warm-up failure never fails the deploy.
python - <<'PYEOF' || echo "WARNING: cache warm-up failed (non-fatal)" >&2
import urllib.request

BASE = "http://127.0.0.1:8000/v1"


def get_json(path: str):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as resp:
        import json

        return json.loads(resp.read())


docs = get_json("/documents")["documents"]
for doc in docs:
    slug = doc["slug"]
    detail = get_json(f"/documents/{slug}")
    if doc["has_chapters"] and not doc.get("inline_chapters"):
        for chapter in detail["chapters"]:
            number = chapter["number"]
            if number is not None:
                get_json(f"/documents/{slug}/chapters/{number}")

print(f"Warmed {len(docs)} documents")
PYEOF

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
