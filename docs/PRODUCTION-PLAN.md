# Production plan — monorepo on `main`, 10 workers, Redis cache

Server: `ubuntu@193.123.67.133` (Ubuntu 24.04, **2 vCPU, 11 GB RAM**, 45 GB disk, Postgres 100 conns).
Repo on the server: `/home/ubuntu/patro` (the monorepo). Deploy: GitHub Actions → SSH → `scripts/deploy.sh` on every push to `main`.

## What I found on the server (read-only audit)

| Item | State |
|---|---|
| `/home/ubuntu/patro` | Monorepo checkout on `main`; web already served from it |
| `/home/ubuntu/dhakal-patro` | Old standalone site, 815 MB. **Nothing references it** (nginx, systemd, cron all clean). Safe to retire |
| API service | `nepali-holiday-api`, uvicorn on `127.0.0.1:8000`, `WEB_CONCURRENCY=2` |
| nginx | `vedicpatro.com` + `www` → `127.0.0.1:8000`; `worker_connections 768` |
| Redis | **Was not installed.** The API code also had no Redis support at all |
| Memory | 1.6 GB used; ~10 GB reclaimable cache. Room for 10 workers + Redis |

## Done already

1. **Redis 7.0.15 installed on the server.** `127.0.0.1` only, `maxmemory 1gb`, `allkeys-lru`, no disk persistence (it is a cache). Config backed up at `/etc/redis/redis.conf.bak-<date>`.
2. **API code (this branch):**
   - `services/redis_cache.py` — optional shared cache. No `REDIS_URL` or Redis down → silent fallback to Postgres/disk, exactly as before. A failure bypasses Redis for 30 s instead of slowing every request.
   - `services/response_cache.py` — read order **Redis → Postgres → disk**, backfills Redis on a lower-tier hit, writes to Redis on build. A **cross-worker build lock** means one process builds a missing key and the others wait for it (verified: 4 processes racing → 1 build).
   - `services/startup.py` — the startup cache warm now runs in **one** worker per 15 min, not all 10 (otherwise 10× the boot work on 2 cores).
   - `database/db.py` — per-worker pool `3 + 2`, so 10 workers ≤ 50 of Postgres's 100 connections (SQLAlchemy's default 15 × 10 would have exceeded it).
   - `.env.example`, `deploy/nepali-holiday-api.service` (starts after Redis, default 10 workers), `tests/test_redis_cache.py`.

## Env values (the knobs)

Put these in `/home/ubuntu/patro/.env` — they override the systemd default:

```
WEB_CONCURRENCY=10
DB_POOL_SIZE=3
DB_MAX_OVERFLOW=2
REDIS_URL=redis://127.0.0.1:6379/0
```

The **server `.env` has not been changed yet.** Setting `WEB_CONCURRENCY=10` before the new code is deployed would restart the live site with 10 workers that each run the old startup warm. Do it as part of the rollout below.

## Rollout (after merging `monorepo` → `main`)

1. **Merge** `monorepo` into `main`. The push triggers the deploy: `git reset --hard origin/main`, `pip install -r requirements.txt` (adds `redis`), installs the updated systemd unit, restarts the API. Until `REDIS_URL` is set the app behaves exactly as today.
2. **Add the four env lines above** to the server `.env`, then `sudo systemctl restart nepali-holiday-api`.
3. **Verify** (below).
4. **Retire the old site:** after a few days of clean traffic, `mv /home/ubuntu/dhakal-patro /home/ubuntu/dhakal-patro.old`, delete once you are sure. Update/remove the old repo's deploy workflow on GitHub so it cannot redeploy.

## Verify

```bash
systemctl status nepali-holiday-api --no-pager | head           # active, 10 worker processes
redis-cli dbsize                                                 # grows after the first requests
redis-cli info stats | grep -E "keyspace_(hits|misses)"          # hit ratio should climb
curl -s -o /dev/null -w "%{time_total}s\n" https://vedicpatro.com/api/v1/panchanga/2083/6?full=true   # run twice; 2nd should be ms
journalctl -u nepali-holiday-api -n 50 --no-pager | grep -iE "redis|warm"   # one worker warms; others "already claimed"
free -h; uptime                                                  # memory headroom, load average
```

Load check before announcing: `hey`/`wrk` ~50 concurrent requests at a cached URL, then a few distinct cold URLs.

## Sizing — read this before trusting "10"

- **10 workers on 2 vCPUs** is fine for *cache hits* (cheap, I/O-bound) — that is the common case with Redis + Cloudflare in front. It does **not** make *cold builds* faster: those are CPU-bound, and only ~2 can truly run at once. A burst of different uncached years/cities will still queue.
- Memory: ~100–300 MB per worker ≈ 1–3 GB, plus Redis ≤ 1 GB. The 11 GB box has the room.
- If cold-build traffic is real, the lever is **more vCPUs** (resize the VM), not more workers. Watch `uptime` load average: sustained > 2 means CPU-bound.
- Redis `maxmemory` can go up to ~3 GB if the working set (cities × years) outgrows 1 GB — check `redis-cli info stats | grep evicted_keys`.

## Rollback

- **Code:** `git revert` the merge on `main` (redeploys), or on the server `cd /home/ubuntu/patro && git reset --hard <previous sha> && sudo systemctl restart nepali-holiday-api`.
- **Redis only:** remove `REDIS_URL` from `.env` and restart — the API falls back to Postgres/disk instantly. Redis can stay installed and idle.
- **Workers:** set `WEB_CONCURRENCY=2` and restart.

## Open items / decisions

- **CPU:** stay on 2 vCPU, or resize if cold-build load shows up in `uptime`.
- **Cloudflare purge** after any deploy that bumps `CACHE_PAYLOAD_VERSION` (edge keeps old JSON up to `s-maxage`). Redis/Postgres keys are version-prefixed, so they self-invalidate.
- **Redis has no password** — it is bound to localhost only and the host is single-tenant. If other services are ever added to the box, add `requirepass` and put it in `REDIS_URL`.
- **Pre-existing failing test:** `tests/test_panchanga_cache.py::test_row_from_a_prior_cache_version_is_treated_as_stale` fails on `main` too (not caused by this work).
- **Secrets hygiene:** the server `.env` holds live secrets (SMTP, OAuth, FB token). Keep it out of git and out of the EAS upload (both already exclude it).
