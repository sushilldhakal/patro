#!/usr/bin/env bash
# Rust API deploy — run by the repo-root scripts/deploy.sh (GitHub Actions over SSH).
# Builds apps/rust on this box, swaps the binary in atomically, restarts the service and
# checks it answers; if it does not, puts the previous binary back and fails the deploy.
#
# One-time setup is apps/rust/deploy/stage.sh (data files, rust.env, systemd unit). On a box
# where that was never run this step does nothing and succeeds.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/patro}"
RUST_HOME="${RUST_HOME:-/home/ubuntu/patro-rust}"
SERVICE="patro-rust"
PORT="${PATRO_RUST_PORT:-8000}"

if [[ ! -f "${RUST_HOME}/rust.env" ]]; then
  echo "Rust API not staged on this box (${RUST_HOME}/rust.env missing) — skipping."
  echo "Run apps/rust/deploy/stage.sh once to stage it."
  exit 0
fi

# The toolchain is installed once, minimal profile, for this user only.
export PATH="${HOME}/.cargo/bin:${PATH}"
if ! command -v cargo >/dev/null 2>&1; then
  echo "==> Installing the Rust toolchain (first deploy only)"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/rustup-init.sh
  sh /tmp/rustup-init.sh -y --profile minimal --default-toolchain stable
  export PATH="${HOME}/.cargo/bin:${PATH}"
fi

echo "==> Building the Rust API (release, low priority so the live servers keep their CPU)"
cd "${REPO_DIR}/apps/rust"
# Only the server binary: the other workspace members (the Swiss Ephemeris oracle) are not needed.
nice -n 19 cargo build --release -j 2 -p vedic-patro --locked

NEW="${REPO_DIR}/apps/rust/target/release/vedic-patro"
BIN="${RUST_HOME}/bin/vedic-patro"
[[ -x "${NEW}" ]] || { echo "build produced no binary" >&2; exit 1; }

mkdir -p "${RUST_HOME}/bin"
[[ -f "${BIN}" ]] && cp -f "${BIN}" "${BIN}.prev"
cp -f "${NEW}" "${BIN}.new"
chmod +x "${BIN}.new"
mv -f "${BIN}.new" "${BIN}"

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/health"; then return 0; fi
    sleep 1
  done
  return 1
}

# systemd holds the listening socket (patro-rust.socket), so a restart queues requests in
# its backlog instead of nginx answering 502 while the new binary loads. The first deploy
# that carries the units installs them: one stop/start, then every later restart is seamless.
UNITS="${REPO_DIR}/apps/rust/deploy"
units_changed() {
  ! cmp -s "${UNITS}/${SERVICE}.socket" "/etc/systemd/system/${SERVICE}.socket" \
    || ! cmp -s "${UNITS}/${SERVICE}.service" "/etc/systemd/system/${SERVICE}.service"
}
if units_changed || ! systemctl is-active --quiet "${SERVICE}.socket"; then
  echo "==> Installing ${SERVICE}.service and ${SERVICE}.socket"
  sudo cp -f "${UNITS}/${SERVICE}.service" "${UNITS}/${SERVICE}.socket" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable "${SERVICE}.socket" "${SERVICE}" >/dev/null 2>&1
  # The running process holds the port itself; the socket can only bind once it is gone.
  sudo systemctl stop "${SERVICE}"
  sudo systemctl start "${SERVICE}.socket"
fi

echo "==> Restarting ${SERVICE}"
sudo systemctl restart "${SERVICE}"
if healthy; then
  echo "Rust API healthy on ${PORT}."
else
  echo "Rust API did not come up; restoring the previous binary." >&2
  if [[ -f "${BIN}.prev" ]]; then
    cp -f "${BIN}.prev" "${BIN}"
    # A binary from before socket activation binds the port itself: free it first.
    sudo systemctl stop "${SERVICE}.socket" "${SERVICE}"
    sudo systemctl start "${SERVICE}"
    healthy && echo "Previous binary is running again (socket off until the next good deploy)." >&2
  fi
  sudo journalctl -u "${SERVICE}" -n 30 --no-pager >&2 || true
  exit 1
fi
