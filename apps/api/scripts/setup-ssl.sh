#!/usr/bin/env bash
# nginx + Let's Encrypt SSL for nepali-holiday-api.
# Requires DNS pointing at this VM (or use sslip.io — see PATRO_API_DOMAIN below).
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/patro}"
SERVICE_NAME="nepali-holiday-api"
PUBLIC_IP="${PUBLIC_IP:-$(curl -sf ifconfig.me || true)}"

if [[ -z "${PATRO_API_DOMAIN:-}" && -n "${PUBLIC_IP}" ]]; then
  PATRO_API_DOMAIN="$(echo "${PUBLIC_IP}" | tr '.' '-').sslip.io"
fi

if [[ -z "${PATRO_API_DOMAIN:-}" ]]; then
  echo "Set PATRO_API_DOMAIN (e.g. api.yourdomain.com or 84-235-248-118.sslip.io)"
  exit 1
fi

echo "==> Using API domain: ${PATRO_API_DOMAIN}"
echo "    Ensure an A record points this hostname to ${PUBLIC_IP:-your VM IP}"

cd "${APP_DIR}"

echo "==> Installing nginx and certbot"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Configuring nginx"
sudo sed "s/__PATRO_API_DOMAIN__/${PATRO_API_DOMAIN}/g" deploy/nginx-patro.conf \
  | sudo tee /etc/nginx/sites-available/patro-api >/dev/null
sudo ln -sf /etc/nginx/sites-available/patro-api /etc/nginx/sites-enabled/patro-api
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo "==> Binding uvicorn to localhost only (nginx handles public traffic)"
sudo sed -i 's/--host 0.0.0.0 --port 8000/--host 127.0.0.1 --port 8000/' \
  "/etc/systemd/system/${SERVICE_NAME}.service"
sudo systemctl daemon-reload
sudo systemctl restart "${SERVICE_NAME}"

echo "==> Opening ports 80 and 443 (host iptables)"
PORTS="80 443" bash scripts/oci-firewall.sh

echo "==> Issuing TLS certificate"
sudo certbot --nginx \
  -d "${PATRO_API_DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

echo "==> Updating .env with API domain"
if grep -q '^PATRO_API_DOMAIN=' .env 2>/dev/null; then
  sed -i "s/^PATRO_API_DOMAIN=.*/PATRO_API_DOMAIN=${PATRO_API_DOMAIN}/" .env
else
  echo "PATRO_API_DOMAIN=${PATRO_API_DOMAIN}" >> .env
fi

echo ""
echo "SSL setup complete."
echo "  API: https://${PATRO_API_DOMAIN}/health"
echo ""
echo "Also open TCP 80 and 443 in Oracle NSG + Security List if not already done."
