#!/usr/bin/env node
// Today's gold and silver (rupees per gram) from GoldAPI, appended to the published history.
//   GOLDAPI_KEY=… node scripts/metals-daily.mjs <out_dir>      (the Metals daily workflow)
// Writes <out_dir>/history.json: { updated_at, days: [{ date, gold24k, gold22k, silver }] }, oldest
// first, one row per Kathmandu date (a rerun on the same day replaces that day's row).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "out";
const key = process.env.GOLDAPI_KEY;
if (!key) throw new Error("GOLDAPI_KEY is not set");
const PUBLISHED = "https://static.vedicpatro.com/metals/history.json";
const KEEP_DAYS = 800;

async function metal(code) {
  const res = await fetch(`https://www.goldapi.io/api/${code}/NPR`, { headers: { "x-access-token": key } });
  if (!res.ok) throw new Error(`GoldAPI ${code} answered ${res.status}: ${await res.text()}`);
  const b = await res.json();
  if (typeof b.price_gram_24k !== "number" || typeof b.price_gram_22k !== "number") throw new Error(`GoldAPI ${code}: no price`);
  return b;
}

const [gold, silver] = await Promise.all([metal("XAU"), metal("XAG")]);
// Kathmandu's date (+05:45).
const date = new Date(Date.now() + 345 * 60_000).toISOString().slice(0, 10);
const round = (v) => Math.round(v * 10_000) / 10_000;
const row = { date, gold24k: round(gold.price_gram_24k), gold22k: round(gold.price_gram_22k), silver: round(silver.price_gram_24k) };

let days = [];
const prev = await fetch(PUBLISHED, { cache: "no-store" });
if (prev.ok) days = (await prev.json()).days ?? [];
else if (prev.status !== 404) throw new Error(`reading the published history answered ${prev.status}`);
days = [...days.filter((d) => d.date !== date), row].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP_DAYS);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "history.json"), JSON.stringify({ updated_at: new Date().toISOString(), days }));
console.log(`metals ${date}: gold24k ${row.gold24k}/g, silver ${row.silver}/g (${days.length} days)`);
