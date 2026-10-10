#!/usr/bin/env node
/**
 * URL contract test. Runs every request function of both apps (calls-*.ts)
 * against a fake fetch and compares the URLs they request with golden/*.json.
 *
 * Request URLs are a contract: the CDN caches by URL and the mobile app's
 * offline download stores responses under the exact URL its screens ask for,
 * so a refactor must not change one by accident.
 *
 *   npm test -w @vedic-patro/api-client                 compare
 *   npm test -w @vedic-patro/api-client -- --update     accept the current URLs
 */
import { build } from "esbuild";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const update = process.argv.includes("--update");
const work = mkdtempSync(join(tmpdir(), "url-golden-"));

const stubs = {
  "react-native": `export const Platform = { OS: "ios", select: (o) => o.ios ?? o.default }; export default {};`,
  "expo-constants": `export default { expoConfig: { extra: { apiBaseUrl: "https://www.vedicpatro.com/api", apiVersion: "v1" } } };`,
  // Requests still go through fetch, so the URL is recorded the same way.
  "@/lib/offline/offline-http": `export async function offlineAwareGet(path, doFetch, errorFor) { const res = await doFetch(); if (!res.ok) throw errorFor(res); return res.json(); }`,
};

const tryFile = (p) =>
  [p, `${p}.ts`, `${p}.tsx`, `${p}/index.ts`, `${p}/index.tsx`, `${p}.json`].find((f) => existsSync(f) && !f.endsWith("/"));

async function urlsFor(app) {
  const appRoot = app === "web" ? `${root}/apps/web/src` : `${root}/apps/mobile`;
  const plugin = {
    name: "workspace-resolve",
    setup(b) {
      b.onResolve({ filter: /.*/ }, (args) => {
        if (stubs[args.path]) return { path: args.path, namespace: "stub" };
        if (args.path.startsWith("@/")) {
          const f = tryFile(`${appRoot}/${args.path.slice(2)}`);
          if (f) return { path: f };
        }
        if (args.path.startsWith("@vedic-patro/")) {
          const [, pkg, ...rest] = args.path.split("/");
          const f = tryFile(`${root}/packages/${pkg}/src/${rest.length ? rest.join("/") : "index"}`);
          if (f) return { path: f };
        }
        return undefined;
      });
      b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({ contents: stubs[args.path], loader: "js" }));
    },
  };
  const entry = join(work, `entry-${app}.ts`);
  writeFileSync(
    entry,
    `import { calls } from ${JSON.stringify(join(here, `calls-${app}.ts`))};
globalThis.__DEV__ = false;
const seen = [];
globalThis.fetch = async (url, init) => {
  seen.push(init?.method ? \`\${init.method} \${url}\${init.body ? " " + init.body : ""}\` : String(url));
  return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
};
const out = {};
for (const [name, f] of calls) {
  seen.length = 0;
  // Parsing the fake "{}" response may throw after the request was recorded; only URLs matter.
  try { await f(); } catch {}
  out[name] = [...seen];
}
console.log(JSON.stringify(out, null, 1));
`,
  );
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    plugins: [plugin],
    logLevel: "error",
    define: { "import.meta.env": "{}" },
    jsx: "automatic",
    loader: { ".svg": "empty", ".png": "empty", ".jpg": "empty" },
    external: ["react", "react-dom", "three", "expo-*"],
  });
  const bundle = join(work, `bundle-${app}.mjs`);
  writeFileSync(bundle, result.outputFiles[0].text);
  return JSON.parse(execFileSync("node", [bundle], { maxBuffer: 1 << 26 }).toString());
}

let failed = 0;
for (const app of ["web", "mobile"]) {
  const got = await urlsFor(app);
  const goldenPath = join(here, "golden", `${app}.json`);
  if (update) {
    writeFileSync(goldenPath, `${JSON.stringify(got, null, 1)}\n`);
    console.log(`updated golden/${app}.json (${Object.keys(got).length} calls)`);
    continue;
  }
  const want = JSON.parse(readFileSync(goldenPath, "utf8"));
  const names = new Set([...Object.keys(want), ...Object.keys(got)]);
  let diffs = 0;
  for (const name of names) {
    const a = JSON.stringify(want[name] ?? null);
    const b = JSON.stringify(got[name] ?? null);
    if (a === b) continue;
    diffs++;
    console.error(`${app} ${name}\n  golden: ${a}\n  now:    ${b}`);
  }
  if (diffs) failed += diffs;
  else console.log(`${app}: ${names.size} calls, URLs unchanged`);
}
if (failed) {
  console.error(`\n${failed} request URL(s) changed. If intended, run with --update and say why in the commit.`);
  process.exit(1);
}
