# Dhakal Patro

Nepali calendar with Surya Panchanga, BS/AD date converter, festivals, public holidays, and Janma Kundali.

## Development

```bash
npm install
cp .env.example .env   # optional — defaults to the bundled API URL
npm run dev
```

## Deploy (Oracle Cloud VM + nginx)

Production runs on a single Oracle Cloud VM: nginx serves the built static
files from `/var/www/vedicpatro` and proxies `/api/` to the FastAPI backend
(see the `patro` repo, `deploy/nginx-vedicpatro.conf`).

Deploys are automated by GitHub Actions (`.github/workflows/deploy.yml`), which
SSHes into the VM on push to `main` and runs `scripts/deploy.sh`. That script
pulls the latest code, runs `npm ci && npm run build`, and publishes `dist/` to
the nginx web root with `rsync --delete`, then reloads nginx.

To deploy manually on the VM:

```bash
bash /home/ubuntu/dhakal-patro/scripts/deploy.sh
```

### Environment variables

The build reads `VITE_*` env vars (baked in at build time). `scripts/deploy.sh`
builds with `VITE_API_BASE_URL=/api` so the app talks to the API on the same
origin through nginx.

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Panchanga API base URL (no trailing slash). Production uses `/api` (same-origin via nginx). |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (optional). |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics measurement ID (optional). |

### Client-side routing

nginx serves prerendered pages at `<route>/index.html` and falls back to the SPA
shell (`/index.html`) for unknown paths — `try_files $uri $uri/index.html
/index.html` — so TanStack Router paths (`/calendar`, `/panchanga`, etc.) work
on refresh and direct links.
