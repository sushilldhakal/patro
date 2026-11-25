# Deploying the Rust API

**Every push to `main`** runs `.github/workflows/deploy.yml`, which SSHes to the VM and runs
`scripts/deploy.sh`. That script pulls `main` and, when `apps/rust`, `apps/api/rules` or
`apps/api/assets` changed since the last good deploy, runs `scripts/deploy-rust.sh`:

1. builds `vedic-patro` in release mode on the VM, at `nice 19` so the live servers keep their CPU;
2. swaps `~/patro-rust/bin/vedic-patro` in atomically, keeping the old one as `vedic-patro.prev`;
3. restarts `patro-rust` and waits for `/health`;
4. if it never answers, puts the previous binary back and fails the deploy.

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
