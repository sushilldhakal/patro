#!/usr/bin/env node
/**
 * Regenerates public/sitemap.xml from src/lib/public-indexable-paths.ts
 * Run: npx tsx scripts/generate-sitemap.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITEMAP_ENTRIES } from "../src/lib/public-indexable-paths.ts";

const SITE = "https://www.vedicpatro.com";
const lastmod = new Date().toISOString().slice(0, 10);

const urls = SITEMAP_ENTRIES.map(
  (r) => `  <url>
    <loc>${SITE}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, "..", "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${SITEMAP_ENTRIES.length} URLs → public/sitemap.xml`);
