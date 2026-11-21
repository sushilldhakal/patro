# Project rules for Claude

Read `AGENTS.md`. In particular: a Rust rewrite of the API server is being
built, but it must NOT go live (no deploy, systemd unit, nginx/Cloudflare
change, production server run, or app pointing at it) until the repository
owner explicitly says so. `apps/api` (Python FastAPI) stays production.
