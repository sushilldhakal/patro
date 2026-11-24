#!/usr/bin/env bash
# Monorepo deploy — GitHub Actions runs this on the VM over SSH on every push
# to main. Pulls once, then deploys whichever apps changed since their last
# successful deploy (recorded in .deploy/<app>.sha):
#   apps/api                      → apps/api/scripts/deploy.sh   (FastAPI service)
#   apps/web, packages/*, locks   → scripts/deploy-web.sh        (static site)
#   apps/rust, festival rules     → scripts/deploy-rust.sh       (Rust API: build, swap, health check)
# The mobile app ships through EAS, not this script.
# FORCE_DEPLOY=all|api|web|rust deploys regardless of changes.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/patro}"
DEPLOY_REF="${DEPLOY_REF:-main}"
STATE_DIR="${REPO_DIR}/.deploy"

cd "${REPO_DIR}"

# Pull, then re-run the freshly pulled copy of this script (bash keeps reading
# the file it started with, so new steps would otherwise wait a deploy).
if [[ "${DEPLOY_PULLED:-0}" != "1" ]]; then
  echo "==> Pulling latest code (${DEPLOY_REF})"
  git fetch origin "${DEPLOY_REF}"
  git reset --hard "origin/${DEPLOY_REF}"
  export DEPLOY_PULLED=1
  exec bash "${REPO_DIR}/scripts/deploy.sh" "$@"
fi

mkdir -p "${STATE_DIR}"
HEAD_SHA="$(git rev-parse HEAD)"

# True when anything under the given paths changed since this app's last
# successful deploy, or when there is no usable record of one.
changed_since_last_deploy() {
  local app="$1"; shift
  local last
  last="$(cat "${STATE_DIR}/${app}.sha" 2>/dev/null || true)"
  [[ -n "${last}" ]] || return 0
  git cat-file -e "${last}^{commit}" 2>/dev/null || return 0
  [[ -n "$(git diff --name-only "${last}" HEAD -- "$@")" ]]
}

force="${FORCE_DEPLOY:-}"

if [[ "${force}" == "all" || "${force}" == "api" ]] || changed_since_last_deploy api apps/api; then
  echo "==> Deploying API"
  bash apps/api/scripts/deploy.sh
  echo "${HEAD_SHA}" > "${STATE_DIR}/api.sha"
else
  echo "==> API unchanged — skipping"
fi

if [[ "${force}" == "all" || "${force}" == "web" ]] \
  || changed_since_last_deploy web apps/web packages package.json package-lock.json; then
  echo "==> Deploying website"
  bash scripts/deploy-web.sh
  echo "${HEAD_SHA}" > "${STATE_DIR}/web.sha"
else
  echo "==> Website unchanged — skipping"
fi

# The Rust API. The festival rules in apps/api/rules are compiled into it, so a change there
# rebuilds it too. Until the Rust server takes traffic it runs beside Python on 8100 and this
# step keeps it current; deploy-rust.sh skips itself on a box where it was never staged.
if [[ "${force}" == "all" || "${force}" == "rust" ]] \
  || changed_since_last_deploy rust apps/rust apps/api/rules apps/api/assets; then
  echo "==> Deploying Rust API"
  bash scripts/deploy-rust.sh
  echo "${HEAD_SHA}" > "${STATE_DIR}/rust.sha"
else
  echo "==> Rust API unchanged — skipping"
fi

echo "Deploy successful."
