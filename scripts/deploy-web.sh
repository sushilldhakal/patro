#!/usr/bin/env bash
# Website pieces the VM still serves — run by scripts/deploy.sh. The site itself is on Cloudflare
# (deploy.yml); nginx here only answers vedicpatro.com (301s to www, /download, /.well-known).
# GitHub Actions copies .well-known/ and redirects.map over as WEB_DIST_TGZ; nothing is built here.
set -euo pipefail

WEB_ROOT="${WEB_ROOT:-/var/www/vedicpatro}"
REDIRECT_MAP="${REDIRECT_MAP:-/etc/nginx/vedicpatro-redirects.map}"

[[ -n "${WEB_DIST_TGZ:-}" && -f "${WEB_DIST_TGZ}" ]] || { echo "==> No website files from Actions — skipping"; exit 0; }

tmp="$(mktemp -d)"; trap 'rm -rf "${tmp}"' EXIT
tar -xzf "${WEB_DIST_TGZ}" -C "${tmp}"

echo "==> Publishing .well-known → ${WEB_ROOT}"
sudo mkdir -p "${WEB_ROOT}/.well-known"
sudo rsync -a --delete "${tmp}/.well-known/" "${WEB_ROOT}/.well-known/"

# Old addresses answered with one 301 (apps/web/src/lib/app-routes.ts → redirects.map), read by the
# `map` in the live nginx site file. A map that fails `nginx -t` is put back to the previous one.
if [[ -f "${tmp}/redirects.map" ]]; then
  echo "==> Installing redirects.map → ${REDIRECT_MAP}"
  [[ -f "${REDIRECT_MAP}" ]] && sudo cp "${REDIRECT_MAP}" "${REDIRECT_MAP}.prev"
  sudo cp "${tmp}/redirects.map" "${REDIRECT_MAP}"
  if ! sudo nginx -t; then
    echo "nginx -t failed — restoring the previous redirects.map" >&2
    sudo cp "${REDIRECT_MAP}.prev" "${REDIRECT_MAP}"
    sudo nginx -t
  fi
  sudo systemctl reload nginx
fi
