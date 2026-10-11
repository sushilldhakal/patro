#!/usr/bin/env node
/**
 * Contract check against the API itself. Every request the two apps make
 * (test/golden/*.json, recorded by url-golden.mjs) must be an operation the
 * FastAPI app declares (contracts/openapi.json, written by
 * apps/api/scripts/export_openapi.py): same path, same method, and every query
 * parameter the operation requires.
 *
 * Extra query parameters are not an error: cache-busters (`cv`, `sv`, `gv`,
 * `ev`) exist only to key the CDN, and the era/instant parameters are read
 * through dependencies OpenAPI does not list.
 *
 *   npm test -w @vedic-patro/api-client
 *
 * After changing a route in apps/api, regenerate the spec with
 * `python scripts/export_openapi.py` (in apps/api) and commit it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(here, "../contracts/openapi.json"), "utf8"));

/**
 * Requests the apps make on purpose that the API does not serve yet. Each is
 * written to fail soft (see the caller) — listed so a typo cannot hide here.
 */
const NOT_YET_SERVED = new Map([
  ["GET /profiles/sky-favourites", "apps/*/lib/sky3d/sky-bookmarks.ts — local copy until the route exists"],
  ["PUT /profiles/sky-favourites", "apps/*/lib/sky3d/sky-bookmarks.ts — local copy until the route exists"],
]);

/** The URL prefix nginx strips before the request reaches FastAPI. */
const API_PREFIX = /^(?:https?:\/\/[^/]+)?\/api(?=\/)/;

const operations = [];
for (const [template, ops] of Object.entries(spec.paths)) {
  const re = new RegExp(`^${template.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{[^}]+\\?\}|\{[^}]+\}/g, "[^/]+")}$`);
  for (const [method, op] of Object.entries(ops)) {
    const required = (op.parameters ?? []).filter((p) => p.in === "query" && p.required).map((p) => p.name);
    operations.push({ template, re, method: method.toUpperCase(), required });
  }
}

function parse(record) {
  const m = record.match(/^(GET|POST|PUT|PATCH|DELETE) (\S+)/);
  const method = m ? m[1] : "GET";
  const url = m ? m[2] : record.split(" ")[0];
  const u = new URL(url, "https://host.invalid");
  return { method, path: u.pathname.replace(API_PREFIX, ""), params: [...new Set(u.searchParams.keys())] };
}

let failures = 0;
let checked = 0;
const seen = new Set();
for (const app of ["web", "mobile"]) {
  const golden = JSON.parse(readFileSync(join(here, "golden", `${app}.json`), "utf8"));
  for (const [call, records] of Object.entries(golden)) {
    for (const record of records) {
      const { method, path, params } = parse(record);
      const key = `${method} ${path}?${params.sort().join("&")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      checked++;
      const notYet = NOT_YET_SERVED.get(`${method} ${path}`);
      if (notYet) continue;
      const candidates = operations.filter((o) => o.re.test(path));
      const op = candidates.find((o) => o.method === method);
      if (!op) {
        failures++;
        const allowed = candidates.map((o) => o.method).join(", ");
        console.error(`${app} ${call}: ${method} ${path} — ${allowed ? `route allows ${allowed}` : "no such route"}`);
        continue;
      }
      const missing = op.required.filter((p) => !params.includes(p));
      if (missing.length) {
        failures++;
        console.error(`${app} ${call}: ${method} ${op.template} requires ?${missing.join(", ?")}`);
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} request(s) do not match apps/api's OpenAPI document.`);
  process.exit(1);
}
console.log(`openapi: ${checked} distinct requests match ${operations.length} API operations`);
