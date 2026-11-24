#!/bin/bash
# THE SWITCH. Points nginx's `patro_api` upstream at the Rust server (8100) instead of Python (8000).
# Reversible in seconds with rollback.sh. Only run after the staged server passed its checks.
set -euo pipefail
PROD=${PROD:-ubuntu@193.123.67.133}
ssh "$PROD" bash -s <<'REMOTE'
set -euo pipefail
f=/etc/nginx/sites-enabled/vedicpatro
sudo cp "$f" "$f.before-rust.$(date +%Y%m%d-%H%M%S)"
sudo sed -i -E '/upstream patro_api \{/,/\}/ s#server 127\.0\.0\.1:8000;#server 127.0.0.1:8100;#' "$f"
sudo sed -i -E 's#proxy_pass http://127\.0\.0\.1:8000;#proxy_pass http://127.0.0.1:8100;#' /etc/nginx/sites-enabled/patro-api
sudo nginx -t
sudo systemctl reload nginx
echo "nginx now sends /api to Rust (8100). Python is still running on 8000 as the fallback."
REMOTE
