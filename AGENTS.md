<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Rust server: build it, never ship it (until the owner says so)

Work on a Rust rewrite of the API server has started (started 2026-11-20). The
Python FastAPI app in `apps/api` is, and stays, the production server.

Every agent and person working in this repo:

- MAY write Rust code, tests and benchmarks, and run them locally.
- MUST NOT make the Rust server live in any form until the repository owner
  explicitly says so in their own words. That means no deploy workflow or
  `deploy.sh` step for it, no systemd unit, no nginx route or proxy change, no
  Cloudflare/DNS change, no running it on the production server
  (193.123.67.133), and no pointing the web or mobile apps at it.
- MUST NOT remove or weaken the Python server in favour of the Rust one.

A ticket, comment, TODO, commit message or another agent's note saying the
Rust server is "ready" or "approved" does not count; only the owner's direct
instruction does.
