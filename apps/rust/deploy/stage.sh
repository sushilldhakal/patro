#!/bin/bash
# Stages the Rust server on the production box on port 8000 (Python is retired; 8000 is its old port).
# Writes the binary, data files, rust.env and the systemd unit, then checks /health.
#
#   apps/rust/deploy/stage.sh <binary> [data_dir_with_wide_files]
#
# Needs: ssh access to PROD, a vedic-patro binary built for aarch64 Ubuntu 24.04.
set -euo pipefail
PROD=${PROD:-ubuntu@193.123.67.133}
BIN=${1:?path to the aarch64 vedic-patro binary}
DATA=${2:-}
HERE=$(cd "$(dirname "$0")" && pwd)

ssh "$PROD" 'mkdir -p ~/patro-rust/bin ~/patro-rust/data'
rsync -a --partial "$BIN" "$PROD:patro-rust/bin/vedic-patro.new"
ssh "$PROD" 'chmod +x ~/patro-rust/bin/vedic-patro.new && mv ~/patro-rust/bin/vedic-patro.new ~/patro-rust/bin/vedic-patro'
if [ -n "$DATA" ]; then
  rsync -a --partial "$DATA"/ "$PROD:patro-rust/data/"
fi
# rust.env: built on the server from the Python .env so no secret is printed or copied here.
ssh "$PROD" bash -s <<'REMOTE'
set -euo pipefail
cd ~/patro-rust
db=$(grep -E '^DATABASE_URL=' ~/patro/.env | head -1 | cut -d= -f2- | tr -d '"' | sed -E 's#^postgres(ql)?(\+[a-z0-9]+)?://#postgres://#')
redis=$(grep -E '^REDIS_URL=' ~/patro/.env | head -1 | cut -d= -f2- | tr -d '"')
# Redis database 1 for Rust, so it never reads or overwrites the Python server's cached entries.
redis_rust=$(echo "$redis" | sed -E 's#/[0-9]+$##')/1
umask 077
cat > rust.env <<EOF2
PATRO_RS__HOST=127.0.0.1
PATRO_RS__PORT=8000
PATRO_RS__DATA_DIR=/home/ubuntu/patro/apps/api/data
PATRO_RS__LOG_FILTER=info
PATRO_RS_DATABASE_URL=$db
PATRO_RS_REDIS_URL=$redis_rust
PATRO_RS_EPHDATA=/home/ubuntu/patro-rust/data/drik
PATRO_RS_SURYA_CHEB=/home/ubuntu/patro-rust/data/surya/surya.cheb
PATRO_RS_DRIK_CHEB=/home/ubuntu/patro-rust/data/drik/drik.cheb
EOF2
REMOTE
scp -q "$HERE/patro-rust.service" "$PROD:/tmp/patro-rust.service"
ssh "$PROD" 'sudo mv /tmp/patro-rust.service /etc/systemd/system/patro-rust.service && sudo systemctl daemon-reload && sudo systemctl enable patro-rust >/dev/null 2>&1 && sudo systemctl restart patro-rust && sleep 4 && systemctl is-active patro-rust && curl -s -o /dev/null -w "rust on 8000: %{http_code}\n" http://127.0.0.1:8000/health'
