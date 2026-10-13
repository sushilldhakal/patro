#!/usr/bin/env node
/**
 * One-command release: bump the version, build iOS + Android on EAS, submit them.
 *
 *   npm run release                 asks which bump (patch / minor / major / none)
 *   npm run release -- minor        1.1.0 -> 1.2.0   (also: patch, major, none, or an exact 1.4.0)
 *   npm run release:ios | release:android
 *   npm run release -- patch --dry-run     show the plan, change nothing
 *
 * What it does:
 *   1. runs the read-only preflight (scripts/release-check.mjs) — stops on failure
 *   2. shows the plan: version  X -> Y  and the next iOS / Android build numbers, asks to confirm
 *   3. writes the new `version` into app.json and commits it ("release: vY") + tags mobile-vY
 *   4. `eas build --auto-submit` (iOS -> TestFlight, Android -> internal track, draft)
 *   5. pushes the commit and tag so git matches what shipped
 *
 * The build number is separate: EAS raises it by itself for every build (remote versioning,
 * `autoIncrement`), so it is never edited by hand and never goes backwards.
 *
 * Flags: --platform ios|android|all  --submit-profile <name>  --yes  --no-push  --dry-run
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(root, "..", "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const positional = args.find((a, i) => !a.startsWith("--") && !(args[i - 1] ?? "").match(/^--(platform|submit-profile)$/));
const platform = opt("platform", "all");
const submitProfile = opt("submit-profile", null);
const dry = flag("dry-run");
const sh = (cmd, cwd = root) => execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const die = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };

if (!["all", "ios", "android"].includes(platform)) die(`--platform must be all, ios or android (got "${platform}")`);

/** Pure helper (exported for tests): the next version string for a bump request. */
export function nextVersion(current, request) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`current version "${current}" is not x.y.z`);
  const [maj, min, pat] = m.slice(1).map(Number);
  if (request === "patch") return `${maj}.${min}.${pat + 1}`;
  if (request === "minor") return `${maj}.${min + 1}.0`;
  if (request === "major") return `${maj + 1}.0.0`;
  if (request === "none") return current;
  if (/^\d+\.\d+\.\d+$/.test(request)) return request;
  throw new Error(`unknown bump "${request}" — use patch, minor, major, none or x.y.z`);
}

/**
 * Write `next` into app.json and keep the workspace's package.json and its package-lock entry
 * (read by `npm ci`) in step. Exported for tests. Returns false if app.json has no version.
 */
export function applyVersion({ appPath, pkgPath, lockPath, current, next }) {
  const raw = readFileSync(appPath, "utf8");
  const updated = raw.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`);
  if (updated === raw && current !== next) return false;
  writeFileSync(appPath, updated);
  for (const file of [pkgPath, lockPath]) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const data = JSON.parse(text);
    const target = file === lockPath ? data.packages?.["apps/mobile"] : data;
    if (target && target.version === current) {
      target.version = next;
      const indent = /^\{\n( +)"/.exec(text)?.[1].length ?? 2;
      writeFileSync(file, JSON.stringify(data, null, indent) + (text.endsWith("\n") ? "\n" : ""));
    }
  }
  return true;
}

async function main() {
  const appPath = join(root, "app.json");
  const raw = readFileSync(appPath, "utf8");
  const current = JSON.parse(raw).expo.version;

  // 1. preflight
  console.log("→ Preflight\n");
  const pre = spawnSync("node", [join(root, "scripts", "release-check.mjs")], { stdio: "inherit" });
  if (pre.status !== 0) die("Preflight failed — fix the ✗ items above, then run again.");

  // 2. which bump?
  let request = positional;
  if (!request) {
    if (!process.stdin.isTTY) die("No bump given. Run `npm run release -- patch|minor|major|none` (or x.y.z).");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    request = (await rl.question(`Current version ${current}. Bump [patch/minor/major/none or x.y.z] (patch): `)).trim() || "patch";
    rl.close();
  }
  let next;
  try { next = nextVersion(current, request); } catch (e) { die(e.message); }
  const bumped = next !== current;

  const builds = {};
  for (const p of ["android", "ios"]) {
    if (platform !== "all" && platform !== p) continue;
    const last = Number(/(\d+)\s*$/.exec(sh(`npx eas build:version:get -p ${p} -e production --non-interactive`))?.[1]);
    builds[p] = { last, next: last + 1 };
  }

  console.log("\n→ Plan");
  console.log(`  version      ${current}  →  ${next}${bumped ? "" : "   (unchanged — rebuilding the same version)"}`);
  if (builds.ios) console.log(`  iOS build    ${builds.ios.last}  →  ${builds.ios.next}   (automatic)`);
  if (builds.android) console.log(`  Android code ${builds.android.last}  →  ${builds.android.next}   (automatic)`);
  console.log(`  platforms    ${platform}`);
  console.log(`  submit to    ${submitProfile ? `profile "${submitProfile}"` : "iOS → TestFlight · Android → internal track (draft)"}`);
  if (bumped && !existsSync(join(root, "store", `release-notes-${next}.md`))) {
    console.log(`  note         store/release-notes-${next}.md does not exist yet`);
  }
  if (dry) { console.log("\n(dry run — nothing changed)\n"); return; }

  if (!flag("yes")) {
    if (!process.stdin.isTTY) die("Not a terminal — pass --yes to confirm.");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const a = (await rl.question("\nProceed? [y/N] ")).trim().toLowerCase();
    rl.close();
    if (a !== "y" && a !== "yes") die("Cancelled. Nothing was changed.");
  }

  // 3. write + commit the version so the build (and git) carry it
  if (bumped) {
    if (!applyVersion({ appPath, pkgPath: join(root, "package.json"), lockPath: join(repo, "package-lock.json"), current, next })) {
      die("Could not find \"version\" in app.json.");
    }
    sh(`git add app.json package.json ../../package-lock.json`, root);
    sh(`git commit -m "release: mobile v${next}\n\nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`, root);
    sh(`git tag mobile-v${next}`, root);
    console.log(`\n✓ app.json → ${next}, committed and tagged mobile-v${next}`);
  }

  // 4. build + submit
  const eas = ["eas", "build", "--platform", platform, "--profile", "production",
    submitProfile ? `--auto-submit-with-profile=${submitProfile}` : "--auto-submit"];
  console.log(`\n→ npx ${eas.join(" ")}\n`);
  const build = spawnSync("npx", eas, { cwd: root, stdio: "inherit" });
  if (build.status !== 0) {
    console.error("\n✗ The EAS build/submit did not finish cleanly.");
    if (bumped) console.error(`  The version commit is still there. To undo it: git reset --hard HEAD~1 && git tag -d mobile-v${next}`);
    console.error("  Fix the problem and rerun (use `none` to keep this version).\n");
    process.exit(build.status ?? 1);
  }

  // 5. keep git in step with what shipped
  if (!flag("no-push") && bumped) {
    try { sh(`git push origin HEAD --follow-tags`, repo); console.log(`\n✓ pushed v${next} and its tag`); }
    catch (e) { console.log(`\n! Could not push (${String(e.message).split("\n")[0]}). Run: git push origin HEAD --follow-tags`); }
  }
  console.log(`\n✓ Release ${next} submitted. iOS: finish in TestFlight → App Store Connect. Android: promote the draft in Play Console.\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
