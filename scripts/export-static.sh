#!/usr/bin/env bash
# Phase 2 static data: export the read-only API answers (documents, veda, cities) as JSON and
# upload them to R2, served at https://static.vedicpatro.com. Rerun whenever documents.db or
# cities.db changes. Needs the data DBs (apps/api/data) and an rclone remote for R2.
#
#   scripts/export-static.sh            # export + upload (version = date + git sha)
#   DRY_RUN=1 scripts/export-static.sh  # export only
#
# Order: the versioned folder (immutable, cached a year) first, then manifest.json (5 minutes),
# so a client never sees a manifest naming files that are not there yet. Old versions stay for
# clients that read the previous manifest; prune them by hand when you like.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${R2_REMOTE:-r2}"
BUCKET="${R2_STATIC_BUCKET:-vedicpatro-static}"
OUT="${OUT_DIR:-${REPO_DIR}/apps/rust/target/static-export}"
VERSION="${VERSION:-$(date -u +%Y%m%d)-$(git -C "${REPO_DIR}" rev-parse --short HEAD)}"
YEAR="$(date -u +%Y)"

cd "${REPO_DIR}/apps/rust"
rm -rf "${OUT}"
cargo build -j 2 --bin export_static
./target/debug/export_static "${OUT}" "${VERSION}" "$((YEAR - 1))" "$((YEAR + 2))"

if [[ -n "${DRY_RUN:-}" ]]; then
  echo "==> Dry run: ${OUT} (not uploaded)"
  exit 0
fi

echo "==> Uploading v${VERSION} to ${REMOTE}:${BUCKET}"
rclone copy "${OUT}/v${VERSION}" "${REMOTE}:${BUCKET}/v${VERSION}" \
  --transfers 32 --checkers 32 --s3-no-check-bucket \
  --header-upload "Content-Type: application/json; charset=utf-8" \
  --header-upload "Cache-Control: public, max-age=31536000, immutable"
rclone copyto "${OUT}/manifest.json" "${REMOTE}:${BUCKET}/manifest.json" --s3-no-check-bucket \
  --header-upload "Content-Type: application/json; charset=utf-8" \
  --header-upload "Cache-Control: public, max-age=300"
echo "==> Live: https://static.vedicpatro.com/manifest.json → v${VERSION}"
