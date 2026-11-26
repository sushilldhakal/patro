#!/usr/bin/env node
// Today's gold and silver rates as FENEGOSIDA (Federation of Nepal Gold & Silver Dealers'
// Associations) publishes them, appended to the history on static.vedicpatro.com.
//   node scripts/metals-daily.mjs <out_dir>                  (the Metals daily workflow)
//   node scripts/metals-daily.mjs <out_dir> --backfill 365   (once: fill earlier days, one a time)
// Writes <out_dir>/history.json: { updated_at, days: [{ date, gold_tola, gold_10g, silver_tola,
// silver_10g }] } in rupees, oldest first, one row per Kathmandu date (a rerun replaces the day).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "out";
const SOURCE = "https://api.fenegosida.org/api/website/v1/Dashboard/today";
const PUBLISHED = "https://static.vedicpatro.com/metals/history.json";
const KEEP_DAYS = 800;
const HISTORY = "https://api.fenegosida.org/api/website/v1/Dashboard/datewisehistory?date=";
const backfillAt = process.argv.indexOf("--backfill");
const backfillDays = backfillAt > 0 ? Number(process.argv[backfillAt + 1]) || 0 : 0;

const res = await fetch(SOURCE, { headers: { "User-Agent": "Mozilla/5.0 (vedicpatro metals-daily)" } });
if (!res.ok) throw new Error(`FENEGOSIDA answered ${res.status}`);
const rates = await res.json();

/** The rate whose Nepali label mentions both words, today's and yesterday's. */
function rate(metal, unit) {
  const r = rates.find((x) => x.rateType?.includes(metal) && x.rateType?.includes(unit));
  if (!r || !(r.todayBaseRatePerGram > 0)) throw new Error(`FENEGOSIDA: no ${metal} ${unit} rate`);
  return r;
}
const goldTola = rate("छापावाल सुन", "तोला");
const gold10 = rate("छापावाल सुन", "१० ग्राम");
const silverTola = rate("चाँदी", "तोला");
const silver10 = rate("चाँदी", "१० ग्राम");

// FENEGOSIDA's dates are UTC instants; the rate belongs to that Kathmandu day (+05:45).
const npDate = (iso) => new Date(Date.parse(iso) + 345 * 60_000).toISOString().slice(0, 10);
const row = (pick, iso) => ({
  date: npDate(iso),
  gold_tola: pick(goldTola),
  gold_10g: pick(gold10),
  silver_tola: pick(silverTola),
  silver_10g: pick(silver10),
});
const today = row((r) => r.todayBaseRatePerGram, goldTola.todayDate);
const yesterday = row((r) => r.yestardayBaseRatePerGram, goldTola.yestardayDate);

let days = [];
const prev = await fetch(PUBLISHED, { cache: "no-store" });
if (prev.ok) days = ((await prev.json()).days ?? []).filter((d) => typeof d.gold_tola === "number");
else if (prev.status !== 404) throw new Error(`reading the published history answered ${prev.status}`);
// Yesterday from the same answer fills the day before the history began (or a missed run).
const byDate = new Map(days.map((d) => [d.date, d]));
if (!byDate.has(yesterday.date)) byDate.set(yesterday.date, yesterday);
byDate.set(today.date, today);

// FENEGOSIDA's day-by-day history ({ todayDate, rateType, baseRatePerGram }), for days not held yet.
// Days with no rate (Saturdays, holidays) come back empty and are skipped.
for (let back = 1; back <= backfillDays; back += 1) {
  const date = new Date(Date.parse(`${today.date}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10);
  if (byDate.has(date)) continue;
  const r = await fetch(`${HISTORY}${date}`, { headers: { "User-Agent": "Mozilla/5.0 (vedicpatro metals-daily)" } });
  const body = r.ok ? await r.text() : "";
  const list = body.trim().startsWith("[") ? JSON.parse(body) : [];
  const pick = (metal, unit) => list.find((x) => x.rateType?.includes(metal) && x.rateType?.includes(unit))?.baseRatePerGram;
  const day = { date, gold_tola: pick("छापावाल सुन", "तोला"), gold_10g: pick("छापावाल सुन", "१० ग्राम"), silver_tola: pick("चाँदी", "तोला"), silver_10g: pick("चाँदी", "१० ग्राम") };
  if ([day.gold_tola, day.gold_10g, day.silver_tola, day.silver_10g].every((v) => v > 0)) byDate.set(date, day);
  await new Promise((done) => setTimeout(done, 250)); // one request at a time, gently
}
days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-KEEP_DAYS);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "history.json"), JSON.stringify({ updated_at: new Date().toISOString(), source: "fenegosida", days }));
console.log(`metals ${today.date}: gold Rs ${today.gold_tola}/tola, silver Rs ${today.silver_tola}/tola (${days.length} days)`);
