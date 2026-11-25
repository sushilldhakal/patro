# Deploying the Rust API

**Every push to `main`** runs `.github/workflows/deploy.yml`, which SSHes to the VM and runs
`scripts/deploy.sh`. That script pulls `main` and, when `apps/rust` (which holds the festival
rules and fonts compiled in) changed since the last good deploy, runs `scripts/deploy-rust.sh`:

1. builds `vedic-patro` in release mode on the VM, at `nice 19` so the live servers keep their CPU;
2. swaps `~/patro-rust/bin/vedic-patro` in atomically, keeping the old one as `vedic-patro.prev`;
3. installs `patro-rust.service` and `patro-rust.socket` when they changed (systemd then owns
   127.0.0.1:8000, so a restart queues requests instead of nginx answering 502);
4. restarts `patro-rust` and waits for `/health`;
5. if it never answers, puts the previous binary back (stopping the socket, since an older binary
   binds the port itself) and fails the deploy.

`nginx/` holds copies of the live sites (`/etc/nginx/sites-enabled/*`, 2026-11-26); nothing
installs them. Edit the live file, reload nginx, then copy it here.

**CI** (`.github/workflows/ci.yml`, job `rust`) runs `cargo fmt --check`, clippy with warnings
denied and every crate's tests on each push and pull request. The root package's HTTP golden
tests need the city database and the ephemeris files, so they run on a developer machine.

## One-time staging (not part of the push deploy)

`stage.sh <binary> [data_dir]` creates `~/patro-rust` on the box: the binary, the large data
files (they are not in git), `rust.env` (built on the server from the Python `.env`, so no secret
is copied), and the `patro-rust` systemd unit. The Rust server then listens on `127.0.0.1:8100`
beside Python (8000); nginx still sends users to Python.

## The switch

`cutover.sh` changes nginx's `patro_api` upstream from 8000 to 8100; `rollback.sh` puts it back.
Both take effect on an nginx reload. Python stays installed and running as the fallback until
the owner retires it; when that happens, drop the API step from `scripts/deploy.sh`.


## 2026-11-25: Rust is the only API server
nginx sends `/api` to Rust (8000, the port Python used to have; it was 8100 from the cutover until later that day). The Python service, its deploy step and `rollback.sh` are gone; nothing links to Python any more.

## Shared month results

`PATRO_RS_SHARED_DIR=/var/lib/patro-shared` (in `rust.env`) turns on `/v1/shared/month/{key}`: a
client that computed a month grid PUTs it, and once 3 different callers send the same bytes Rust
writes `month/{key}.json`. nginx serves the GETs straight from that folder
(`nginx-shared-month.conf`, placed before `location /api/` in the `vedicpatro` site), so a stored
month costs no Rust work and no proxy-cache memory, and Cloudflare keeps it (immutable). Only PUTs
reach Rust. The folder is outside `/home/ubuntu` because nginx (www-data) cannot read there.

## Real visitor address, sign-in limits, backups (2026-11-25)

- `nginx-cloudflare-realip.conf` goes in `/etc/nginx/conf.d/`. nginx believes `CF-Connecting-IP`
  only from Cloudflare's ranges, so `$remote_addr` is the real visitor. Every location that reaches
  Rust (the `vedicpatro` `/api/` and shared-month PUT, the sslip host, `rust.vedicpatro.com`) sends
  `CF-Connecting-IP $remote_addr`. Without this, anyone hitting the server directly could fake
  three voters and store a month for everyone. Refresh the ranges from cloudflare.com/ips if they change.
- The same file limits credential POSTs (`/auth/login`, `signup`, social, reset and verify links)
  to 20 a minute per visitor, burst 20, then 429. `/auth/me` and `/auth/refresh` are not counted.
- `patro-pg-backup.timer` runs `scripts/pg-backup.sh` nightly (03:15 Nepal): `pg_dump -Fc` of
  `patro` to `/var/backups/patro` (7 kept) and to the private R2 bucket under
  `backups/postgres/` (30 days). Restore with `pg_restore --clean --if-exists -d patro <file>`.
- The server refuses to start with the account database on and no `JWT_SECRET`.
