#!/usr/bin/env node
/**
 * Pre-release checklist for `npm run release*`. Read-only: it builds and submits nothing.
 *
 *   npm run release:check
 *
 * Failures (✗) stop you; warnings (!) are worth a look. Exits non-zero on any failure.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..", "..");
const run = (cmd, cwd = root) => execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const fail = (m) => { failed++; console.log(`  ✗ ${m}`); };
const step = (m) => console.log(`\n${m}`);

const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")).expo;
const eas = JSON.parse(readFileSync(join(root, "eas.json"), "utf8"));

step("App config");
ok(`version ${app.version} (users see this; build numbers are raised automatically)`);
app.ios?.bundleIdentifier ? ok(`iOS bundle id ${app.ios.bundleIdentifier}`) : fail("ios.bundleIdentifier missing");
app.android?.package ? ok(`Android package ${app.android.package}`) : fail("android.package missing");
existsSync(join(root, app.icon ?? "")) ? ok("app icon exists") : fail(`icon not found: ${app.icon}`);
for (const p of ["production"]) eas.build?.[p] ? ok(`eas build profile "${p}"`) : fail(`eas.json build profile "${p}" missing`);
for (const p of ["production", "production-track"]) eas.submit?.[p] ? ok(`eas submit profile "${p}"`) : fail(`eas.json submit profile "${p}" missing`);
const track = eas.submit?.production?.android;
track?.track === "internal" && track?.releaseStatus === "draft"
  ? ok("default Android submit = internal track, draft (nothing public)")
  : warn(`default Android submit is ${track?.track}/${track?.releaseStatus} — expected internal/draft`);

step("Source");
try {
  const branch = run("git rev-parse --abbrev-ref HEAD", repo);
  const dirty = run("git status --porcelain", repo).split("\n").filter((l) => l && !l.startsWith("??"));
  const ahead = run("git rev-list --count @{u}..HEAD", repo);
  branch === "main" ? ok("on main") : warn(`on "${branch}", not main`);
  dirty.length ? fail(`${dirty.length} uncommitted change(s) — EAS packs your local files, commit them first`) : ok("working tree clean");
  ahead !== "0" ? warn(`${ahead} commit(s) not pushed`) : ok("everything pushed");
} catch (e) { warn(`git check skipped: ${String(e.message).split("\n")[0]}`); }

step("Release material");
const notes = join(root, "store", `release-notes-${app.version}.md`);
existsSync(notes) ? ok(`release notes for ${app.version}`) : warn(`no store/release-notes-${app.version}.md`);
const reply = join(root, "store", "app-review-reply.md");
if (existsSync(reply) && /TODO/.test(readFileSync(reply, "utf8"))) warn("store/app-review-reply.md still has TODOs (demo account? screen recording?) — App Review needs them");

step("Production API (the app talks to it)");
try {
  const res = await fetch("https://www.vedicpatro.com/api/health", { signal: AbortSignal.timeout(15000) });
  res.ok ? ok(`api health ${res.status}`) : fail(`api health returned ${res.status}`);
} catch (e) { fail(`api unreachable: ${e.message}`); }

step("Types");
try { run("npx tsc --noEmit"); ok("typecheck passes"); } catch (e) { fail("typecheck failed — run `npx tsc --noEmit` in apps/mobile"); }

step("EAS account + next build numbers");
try {
  ok(`logged in as ${run("npx eas whoami").split("\n").pop()}`);
  for (const p of ["android", "ios"]) {
    const out = run(`npx eas build:version:get -p ${p} -e production --non-interactive`);
    ok(`${out.split("\n").pop()} (last used; the next build adds 1)`);
  }
} catch (e) { fail("not logged in to EAS — run `npx eas login`"); }

step("Credentials (cannot be checked from here — confirm once)");
warn("Google Play: service-account key uploaded to EAS (Credentials → Android → Google Service Account Key for EAS Submit)");
warn("Apple: EAS has your App Store Connect API key / Apple login (first iOS submit will prompt for it)");

console.log(failed ? `\n${failed} problem(s) — fix before releasing.\n` : "\nReady. Run: npm run release   (iOS + Android)\n");
process.exit(failed ? 1 : 0);
