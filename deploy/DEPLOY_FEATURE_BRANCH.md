# Deploy a feature branch to production (without merging to `main`)

Production auto-deploy only runs on **`main`**. To ship **`research/era-patro-api`** +
**`research/era-patro-frontend`** (or any pair of branches) once, push the branches and
run the existing deploy scripts on the Oracle box with **`DEPLOY_REF`**.

`main` on the server is untouched until you deploy with `DEPLOY_REF=main` again.

---

## 1. On your Mac — push both repos

From each repo, commit everything you need live, then push the branch (not `main`):

```bash
# API (repo path on server: /home/ubuntu/patro)
cd /path/to/nepali-holiday-api
git checkout research/era-patro-api
git add -A   # include ephemeris_provision/ if present — see §4
git commit -m "…"   # if needed
git push -u origin research/era-patro-api

# Frontend (repo path on server: /home/ubuntu/dhakal-patro)
cd /path/to/dhakal-patro
git checkout research/era-patro-frontend
git add -A
git commit -m "…"   # if needed
git push -u origin research/era-patro-frontend
```

---

## 2. SSH to the server

```bash
ssh ubuntu@193.123.67.133
```

(Use your usual host / key if different.)

---

## 3. Deploy API first (backend + ephemeris)

```bash
cd /home/ubuntu/patro
DEPLOY_REF=research/era-patro-api bash scripts/deploy.sh
```

This will:

- `git fetch` + reset to **`origin/research/era-patro-api`**
- `pip install -r requirements.txt`
- Run **`python scripts/install_ephemeris.py --extended`** (downloads `.se1` into `data/ephemeris/` — can take several minutes the first time; needs outbound HTTPS to GitHub)
- Restart **`nepali-holiday-api`** and hit `/health`

Watch the log if health fails:

```bash
sudo journalctl -u nepali-holiday-api -n 80 --no-pager
```

Quick check:

```bash
curl -s http://127.0.0.1:8000/health
curl -s "https://vedicpatro.com/api/health"
```

---

## 4. Swiss Ephemeris files on the server

- **`.se1` files are not in git** (see `.gitignore`: `data/ephemeris/`). They are downloaded on the server.
- **`scripts/deploy.sh` always runs** `install_ephemeris.py --extended` after pip — that is enough for live, even if `ephemeris_provision/` is missing.
- For pip to use the optional hook, commit and push the folder on the API branch:

  ```bash
  git add ephemeris_provision/setup.py ephemeris_provision/pyproject.toml ephemeris_provision/__init__.py
  ```

  Do **not** commit `ephemeris_provision/*.egg-info/`.

If extended download fails (network timeout), run manually and restart:

```bash
cd /home/ubuntu/patro
source .venv/bin/activate
python scripts/install_ephemeris.py --extended
sudo systemctl restart nepali-holiday-api
```

Verify a deep year endpoint after deploy (example):

```bash
curl -s "http://127.0.0.1:8000/nepal/panchanga/day?..." | head -c 200
```

---

## 5. Deploy frontend

```bash
cd /home/ubuntu/dhakal-patro
export VITE_GA_MEASUREMENT_ID="G-…"   # optional; or rely on .env on server
DEPLOY_REF=research/era-patro-frontend bash scripts/deploy.sh
```

Build uses **`VITE_API_BASE_URL=/api`** (same origin). Published to **`/var/www/vedicpatro`**.

Verify:

```bash
curl -sI https://vedicpatro.com/ | head -3
curl -s https://vedicpatro.com/sitemap.xml | head
```

Hard-refresh the site in the browser (or private window).

---

## 6. Roll back to `main` (when ready)

```bash
cd /home/ubuntu/patro && DEPLOY_REF=main bash scripts/deploy.sh
cd /home/ubuntu/dhakal-patro && DEPLOY_REF=main bash scripts/deploy.sh
```

No need to change GitHub Actions — the next push to **`main`** will also reset production to `main`.

---

## 7. Optional — manual deploy from your Mac (no server git pull)

If you cannot push a branch but can SSH, build locally and rsync **`dist/`** only:

```bash
cd dhakal-patro
VITE_API_BASE_URL=/api npm run build
rsync -av --delete dist/ ubuntu@193.123.67.133:/var/www/vedicpatro/
```

API code still has to reach the server via git push + `DEPLOY_REF=…` deploy (or rsync the whole `patro` tree — not recommended).

---

## Branch names used for era/patro research

| Repo              | Branch                         | Server directory        |
|-------------------|----------------------------------|-------------------------|
| nepali-holiday-api | `research/era-patro-api`        | `/home/ubuntu/patro`    |
| dhakal-patro       | `research/era-patro-frontend`   | `/home/ubuntu/dhakal-patro` |

Replace `DEPLOY_REF=…` if you use different branch names.
