# Single-server deployment (everything on the Oracle ARM box)

Host the React app, the FastAPI API, and PostgreSQL on one Oracle Cloud Ampere
instance, served on a single domain (`vedicpatro.com`) via nginx.

```
vedicpatro.com ─HTTPS→ nginx ┬─ /      → /var/www/vedicpatro  (React build)
                             └─ /api/* → 127.0.0.1:8000        (FastAPI)
                                              └─ PostgreSQL 127.0.0.1:5432
```

Same origin for app + API ⇒ **no CORS, one TLS cert, one domain.** The browser
calls `/api/...`; nginx strips the prefix and forwards to uvicorn.

Assumes the API is already set up per [AUTH_SETUP.md](AUTH_SETUP.md) (PostgreSQL,
`.env` with `DATABASE_URL` + `JWT_SECRET`, service running on `127.0.0.1:8000`).

---

## 1. Cloudflare DNS

Point the domain at the server (`193.123.67.133`). Use **DNS-only / grey cloud**
so certbot can validate over HTTP and there's no proxy in the way:

```
A   @     193.123.67.133   (DNS only)
A   www   193.123.67.133   (DNS only)
```

Verify it resolves before continuing:
```bash
dig vedicpatro.com +short      # → 193.123.67.133
```

(You can switch the records to orange/proxied later for DDoS protection + a
hidden origin IP — that needs a Cloudflare Origin Certificate on nginx instead
of certbot. Get the simple version working first.)

## 2. Install Node.js on the server (for building the app)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v        # v22.x — ARM build, works on Ampere
```

## 3. Get the frontend repo onto the server and build it

```bash
cd /home/ubuntu
git clone <your-frontend-repo-url> dhakal-patro     # or: git pull, if already cloned
cd dhakal-patro
bash scripts/build-deploy.sh
```

`build-deploy.sh` runs `npm ci`, builds with `VITE_API_BASE_URL=/api`, and
rsyncs `dist/` to `/var/www/vedicpatro`. Re-run it any time you pull new
frontend changes.

## 4. nginx config (serves the app + proxies the API)

```bash
cd /home/ubuntu/patro
sudo cp deploy/nginx-vedicpatro.conf /etc/nginx/sites-available/vedicpatro
sudo ln -sf /etc/nginx/sites-available/vedicpatro /etc/nginx/sites-enabled/vedicpatro
sudo rm -f /etc/nginx/sites-enabled/default        # also removes the old sslip.io site if present
sudo nginx -t && sudo systemctl reload nginx
```

Make sure ports 80 + 443 are open (the API setup already does this; if not):
```bash
PORTS="80 443" bash scripts/oci-firewall.sh
```

## 5. TLS certificate

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d vedicpatro.com -d www.vedicpatro.com \
  --non-interactive --agree-tos -m you@example.com --redirect
```

certbot rewrites the nginx config to add the `:443` server block and an
http→https redirect.

## 6. Point the API's email links at the new domain

In `/home/ubuntu/patro/.env`:
```ini
FRONTEND_URL=https://vedicpatro.com
```
CORS is no longer needed (same origin), so you can drop `CORS_ALLOW_ORIGINS`.
Then restart:
```bash
sudo systemctl restart nepali-holiday-api
```

## 7. Verify the whole stack

```bash
curl -s https://vedicpatro.com/api/health            # API through nginx → {"status":"ok",...}
curl -sI https://vedicpatro.com/ | head -1           # → HTTP/2 200 (the React app)
curl -s https://vedicpatro.com/account -o /dev/null -w '%{http_code}\n'  # → 200 (SPA fallback)
```

Then open `https://vedicpatro.com`, click **Sign in**, create an account, and add
a profile. Grab the verification link from the log until SMTP is configured:
```bash
sudo journalctl -u nepali-holiday-api | grep verify-email | tail -1
```

---

## Updating later

* **Frontend change:** `cd /home/ubuntu/dhakal-patro && git pull && bash scripts/build-deploy.sh`
* **Backend change:** `cd /home/ubuntu/patro && git pull && .venv/bin/pip install -r requirements.txt && sudo systemctl restart nepali-holiday-api`

## Process model

| Component  | How it runs                          | Port            |
|------------|--------------------------------------|-----------------|
| nginx      | systemd (`nginx`)                    | 80, 443 public  |
| FastAPI    | systemd (`nepali-holiday-api`)       | 127.0.0.1:8000  |
| PostgreSQL | systemd (`postgresql`)               | 127.0.0.1:5432  |
| React app  | static files served by nginx         | —               |

Only nginx is exposed publicly; the API and database listen on localhost only.
