#!/bin/bash
# Puts nginx back on the Python server (8000). Takes effect on reload, in under a second.
set -euo pipefail
PROD=${PROD:-ubuntu@193.123.67.133}
ssh "$PROD" bash -s <<'REMOTE'
set -euo pipefail
sudo sed -i -E '/upstream patro_api \{/,/\}/ s#server 127\.0\.0\.1:8100;#server 127.0.0.1:8000;#' /etc/nginx/sites-enabled/vedicpatro
sudo sed -i -E 's#proxy_pass http://127\.0\.0\.1:8100;#proxy_pass http://127.0.0.1:8000;#' /etc/nginx/sites-enabled/patro-api
sudo nginx -t
sudo systemctl reload nginx
echo "nginx is back on Python (8000)."
REMOTE
