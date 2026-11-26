#!/usr/bin/env node
// Turns the nginx-shaped build (dist/) into a Cloudflare Pages upload (dist-pages/):
//  - no dist/server (SSR bundle, prerender only) and no redirects.map (nginx only)
//  - _redirects from redirects.map, _headers from the nginx cache rules (apps/rust/deploy/nginx/vedicpatro.conf)
//  - X.html beside every X/index.html, so Pages answers /x itself instead of 308-ing to /x/
//    (nginx serves /x and 301s /x/ → /x; Pages does the same when x.html exists).
// /panchanga (share cards for crawlers) and /download (store redirect) run as Pages Functions
// (apps/web/functions), limited to those two paths by _routes.json so every other request stays free.
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(webDir, "dist");
const out = join(webDir, "dist-pages");

if (!existsSync(join(dist, "index.html"))) throw new Error("run `npm run build` first: dist/index.html missing");
rmSync(out, { recursive: true, force: true });
cpSync(dist, out, {
  recursive: true,
  filter: (src) => src !== join(dist, "server") && src !== join(dist, "redirects.map"),
});

// nginx map line: "/from" "/to$is_args$args";  — Pages keeps the query string on its own.
function pagesRedirects(mapText) {
  const lines = [];
  for (const line of mapText.split("\n")) {
    const m = line.match(/^"([^"]+)" "([^"]+)";$/);
    if (!m) continue;
    const to = m[2].replace("$is_args$args", "");
    const from = encodeURI(m[1]);
    lines.push(`${from} ${to} 301`);
    if (from !== m[1]) lines.push(`${m[1]} ${to} 301`);
  }
  return lines;
}

const redirects = pagesRedirects(readFileSync(join(dist, "redirects.map"), "utf8"));
if (redirects.length === 0) throw new Error("redirects.map gave no redirects");
writeFileSync(join(out, "_redirects"), `${redirects.join("\n")}\n`);

writeFileSync(
  join(out, "_headers"),
  `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/*
  Cache-Control: public, max-age=2592000
/sky/*
  Cache-Control: public, max-age=604800
/sky3d/*
  Cache-Control: public, max-age=604800
/favicon.svg
  Cache-Control: public, max-age=2592000, immutable
/loader.svg
  Cache-Control: public, max-age=2592000, immutable
/robots.txt
  Cache-Control: public, max-age=86400
/sitemap.xml
  Cache-Control: public, max-age=86400
/.well-known/*
  Content-Type: application/json
  Cache-Control: public, max-age=3600
`,
);

writeFileSync(join(out, "_routes.json"), JSON.stringify({ version: 1, include: ["/panchanga", "/download"], exclude: [] }));

let htmlCopies = 0;
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    const index = join(path, "index.html");
    if (existsSync(index) && !existsSync(`${path}.html`)) {
      cpSync(index, `${path}.html`);
      htmlCopies += 1;
    }
    walk(path);
  }
};
walk(out);

let files = 0;
const count = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) count(path);
    else {
      files += 1;
      if (statSync(path).size > 25 * 1024 * 1024) throw new Error(`${path} is over the 25 MiB Pages limit`);
    }
  }
};
count(out);
if (files > 20000) throw new Error(`${files} files: over the 20,000 Pages limit`);
console.log(`dist-pages: ${files} files, ${redirects.length} redirects, ${htmlCopies} x.html copies`);
