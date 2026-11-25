#!/usr/bin/env node
// Post today's Kathmandu panchanga to the Facebook Page at sunrise, as links (three kinds: main, periods, d1).
// Reads the day from the Rust API (nothing is calculated here) and posts through the Graph API. No dependencies.
//
//   node scripts/post-daily-panchanga.mjs --wait-for-sunrise   (the systemd timer)
//   node scripts/post-daily-panchanga.mjs --dry-run            (print, post nothing)
//   flags: --force (post even if today is recorded), --only main|periods|d1 (repeatable), --max-wait-min N
//
// Environment: FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN (dormant without them), FB_POST_KINDS (default main,periods,d1),
// FRONTEND_URL, APP_LINK (off hides the app line), FB_GRAPH_API_VERSION, FB_POST_STATE_FILE, FB_POST_GAP_S,
// INTERNAL_API_BASE (default http://127.0.0.1:8000/v1).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, parse, join } from "node:path";

const env = (k, d = "") => (process.env[k] ?? "").trim() || d;
const FRONTEND = env("FRONTEND_URL", "https://vedicpatro.com").replace(/\/+$/, "");
const API = env("INTERNAL_API_BASE", "http://127.0.0.1:8000/v1").replace(/\/+$/, "");
const GRAPH = env("FB_GRAPH_API_VERSION", "v21.0");
const STATE = env("FB_POST_STATE_FILE", "/var/tmp/vedicpatro-fb-last-post.txt");
const GAP_S = Number(env("FB_POST_GAP_S", "20"));
const PLACE = "lat=27.7172&lon=85.324&tz=Asia%2FKathmandu";
const OPEN_IN_APP = "app";
const DIGITS = "०१२३४५६७८९";
const AD_MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const ANGA_LABELS = [["tithi", "तिथि"], ["nakshatra", "नक्षत्र"], ["yoga", "योग"], ["karana", "करण"]];
const PLANET_NE = [["sun", "सूर्य"], ["moon", "चन्द्र"], ["mars", "मंगल"], ["mercury", "बुध"], ["jupiter", "बृहस्पति"], ["venus", "शुक्र"], ["saturn", "शनि"], ["rahu", "राहु"], ["ketu", "केतु"]];

const log = (level, msg) => console.log(`${new Date().toISOString()} ${level} ${msg}`);
const neDigits = (v) => String(v).replace(/[0-9]/g, (d) => DIGITS[Number(d)]);
const q = (o) => new URLSearchParams(o).toString();
const stripScheme = (u) => u.replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** Today's date in Kathmandu as { iso, y, m, d } and the current minute-of-day there. */
function kathmanduNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute), second: Number(p.second) };
}
/** A Kathmandu wall time on a day as a Date (the zone has been +05:45 since 1986). */
const kathmanduDate = (iso, hh, mm) => new Date(`${iso}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+05:45`);

// ---------------------------------------------------------------- the day, from the Rust API
async function getJson(path) {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.json();
}
const dayPayload = (iso) => getJson(`/panchanga/${iso}?${q({ era: "ad", festivals: "false", detail: "true" })}&${PLACE}`);
async function angaNameAt(key, when) {
  const wall = `${when.iso}T${when.hm}:00`;
  const block = (await getJson(`/panchanga/at-time?datetime=${encodeURIComponent(wall)}&${PLACE}`))[key] ?? {};
  return block.name_ne || block.name || null;
}

// ---------------------------------------------------------------- content
const nameNe = (b) => (b && typeof b === "object" ? String(b.name_ne || b.name || "—") : "—");
function ogFields(p, iso) {
  const bs = p.bs_date ?? {};
  let bsLine = "";
  if (bs.year) bsLine = `${bs.month_name_ne || bs.month_name || ""} ${neDigits(bs.day ?? "")}, ${neDigits(bs.year ?? "")}`;
  const [y, m, d] = iso.split("-").map(Number);
  const adLine = `${neDigits(d)} ${AD_MONTHS_NE[m - 1]} ${neDigits(y)}`;
  const sun = p.sun ?? {};
  return { weekday: String(p.weekday ?? ""), bsLine, adLine, sunrise: String(sun.sunrise || "—"), sunset: String(sun.sunset || "—") };
}
function datedHeader(f) {
  let dateBit = f.bsLine || f.adLine;
  if (f.bsLine && f.adLine) dateBit = `${f.bsLine} (${f.adLine})`;
  return `${[f.weekday, dateBit].filter(Boolean).join(" · ")} · सूर्योदय ${neDigits(f.sunrise)} · सूर्यास्त ${neDigits(f.sunset)}`;
}
const pageUrl = () => `${FRONTEND}/panchanga`;
const datedPageUrl = (iso) => `${FRONTEND}/panchanga?${q({ date: iso, open: OPEN_IN_APP })}`;
function appLink() {
  const raw = env("APP_LINK");
  if (["off", "none", "0", "false"].includes(raw.toLowerCase())) return null;
  return raw || `${FRONTEND}/download`;
}
function cardPageUrl(card, iso) {
  const query = { card, date: iso, open: OPEN_IN_APP };
  const app = appLink();
  if (app) query.app = stripScheme(app);
  return `${FRONTEND}/panchanga?${q(query)}`;
}
const appCaptionLine = () => (appLink() ? `\n\nमोबाइल एप: ${appLink()}` : "");
const span = (b) => (b && b.start_time && b.end_time ? neDigits(`${b.start_time}–${b.end_time}`) : null);
function periodsCaption(f, p, link) {
  const m = p.muhurta ?? {};
  const good = [["अभिजित् मुहूर्त", span(m.abhijit)]];
  const bad = [["राहु काल", span(m.rahu_kalam)], ["यमगण्ड", span(m.yamaganda)], ["गुलिक काल", span(m.gulika)]];
  const lines = [];
  if (good.some(([, t]) => t)) lines.push("शुभ: " + good.filter(([, t]) => t).map(([n, t]) => `${n} ${t}`).join(" · "));
  if (bad.some(([, t]) => t)) lines.push("अशुभ: " + bad.filter(([, t]) => t).map(([n, t]) => `${n} ${t}`).join(" · "));
  const body = lines.join("\n");
  return `आजका शुभ र अशुभ समय — काठमाडौँ\n${datedHeader(f)}\n\n${body ? `${body}\n\n` : ""}सबै शुभ र अशुभ समय: ${link}${appCaptionLine()}`;
}
function d1Caption(f, p, link) {
  const planets = p.planets ?? {};
  const parts = PLANET_NE.filter(([k]) => planets[k] && (planets[k].rashi_ne || planets[k].rashi_name)).map(([k, label]) => `${label} ${planets[k].rashi_ne || planets[k].rashi_name}`);
  return `आजको ग्रहस्थिति (D1 चक्र) — काठमाडौँ\n${datedHeader(f)}\n\nउदयकालिक स्पष्टग्रह (सूर्योदय ${neDigits(f.sunrise)}):\n${parts.join(" · ")}\n\nपूर्ण चक्र: ${link}${appCaptionLine()}`;
}
const parseLocal = (t) => {
  const m = /^(\d{4}-\d\d-\d\d) (\d\d):(\d\d)$/.exec(t ?? "");
  return m ? { iso: m[1], hm: `${m[2]}:${m[3]}`, date: kathmanduDate(m[1], Number(m[2]), Number(m[3])) } : null;
};
/** One Nepali line per anga for its change(s) within the sunrise-to-sunrise day. */
async function angaTransitionLines(p, iso) {
  const sunriseText = p.sun?.sunrise;
  const sunrise = sunriseText ? kathmanduDate(iso, ...sunriseText.split(":").map(Number)) : null;
  const windowEnd = new Date((sunrise ?? kathmanduDate(iso, 0, 0)).getTime() + 86_400_000);
  const lines = [];
  for (const [key, label] of ANGA_LABELS) {
    const block = p[key] ?? {};
    const current = block.name_ne || block.name || "—";
    const segments = [];
    const end = parseLocal(block.end);
    if (end && end.date < windowEnd) {
      segments.push([end.hm, block.next_ne || block.next || "—"]);
      const nextEnd = parseLocal(block.next_end);
      if (nextEnd && nextEnd.date < windowEnd) {
        const after = new Date(nextEnd.date.getTime() + 60_000);
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(after).map((x) => [x.type, x.value]));
        const name = await angaNameAt(key, { iso: `${parts.year}-${parts.month}-${parts.day}`, hm: `${parts.hour}:${parts.minute}` });
        if (name) segments.push([nextEnd.hm, name]);
      }
    }
    if (segments.length === 0) lines.push(`${label}: ${current} (दिनभर)`);
    else lines.push(`${label}: ${segments.reduce((chain, [hm, name]) => `${chain} → ${name} (${neDigits(hm)})`, current)}`);
  }
  return lines;
}
async function buildPost(kind, iso, p, f) {
  if (kind === "periods") {
    const link = cardPageUrl("periods", iso);
    return [link, periodsCaption(f, p, link)];
  }
  if (kind === "d1") {
    const link = cardPageUrl("d1", iso);
    return [link, d1Caption(f, p, link)];
  }
  const body = (await angaTransitionLines(p, iso)).join("\n");
  return [datedPageUrl(iso), `आजको पञ्चाङ्ग — काठमाडौँ\n${datedHeader(f)}\n\n${body}\n\nपूर्ण दिन-चक्र: ${pageUrl()}`];
}

// ---------------------------------------------------------------- facebook
async function warmLinkPreview(link) {
  const ua = { "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" };
  try {
    const page = await (await fetch(link, { headers: ua, signal: AbortSignal.timeout(120_000) })).text();
    const match = /<meta property="og:image" content="([^"]+)"/.exec(page);
    if (!match) return log("WARNING", `No og:image on ${link} — the post will have no picture.`);
    const image = match[1].replaceAll("&amp;", "&");
    const res = await fetch(image, { headers: ua, signal: AbortSignal.timeout(120_000) });
    const body = await res.arrayBuffer();
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return log("WARNING", `og:image ${image} is not an image.`);
    log("INFO", `Warmed ${image} (${body.byteLength} bytes).`);
  } catch (e) {
    log("WARNING", `Could not warm the preview of ${link}: ${e.message}`);
  }
}
async function postLink({ link, message, pageId, token }) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: q({ link, message, published: "true", access_token: token }),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Graph API HTTP ${res.status}: ${text}`);
  const id = JSON.parse(text).id;
  if (!id) throw new Error(`Unexpected Graph API response: ${text}`);
  return String(id);
}

// ---------------------------------------------------------------- state
const stateFile = (kind) => {
  if (kind === "main") return STATE;
  const { dir, name, ext } = parse(STATE);
  return join(dir, `${name}-${kind}${ext}`);
};
const alreadyPosted = (kind, iso) => {
  try {
    return readFileSync(stateFile(kind), "utf8").trim() === iso;
  } catch {
    return false;
  }
};
function markPosted(kind, iso) {
  try {
    mkdirSync(dirname(stateFile(kind)), { recursive: true });
    writeFileSync(stateFile(kind), iso);
  } catch {
    log("WARNING", `Could not write post-state file ${stateFile(kind)}`);
  }
}

// ---------------------------------------------------------------- main
async function main() {
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const only = args.flatMap((a, i) => (a === "--only" ? [args[i + 1]] : []));
  const maxWait = Number(args[args.indexOf("--max-wait-min") + 1]) || 180;
  const dry = has("--dry-run");
  const pageId = env("FB_PAGE_ID");
  const token = env("FB_PAGE_ACCESS_TOKEN");
  if (!(pageId && token) && !dry) return log("INFO", "FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set — nothing to post."), 0;

  let kinds = only.length ? only : env("FB_POST_KINDS", "main,periods,d1").split(",").map((k) => k.trim()).filter((k) => ["main", "periods", "d1"].includes(k));
  if (kinds.length === 0) kinds = ["main"];
  const now = kathmanduNow();
  if (!has("--force") && !dry) {
    kinds = kinds.filter((k) => !alreadyPosted(k, now.iso));
    if (kinds.length === 0) return log("INFO", `Already posted everything for ${now.iso} — skipping.`), 0;
  }
  const payload = await dayPayload(now.iso);
  const fields = ogFields(payload, now.iso);

  if (has("--wait-for-sunrise")) {
    const text = payload.sun?.sunrise;
    const sunrise = text ? kathmanduDate(now.iso, ...text.split(":").map(Number)) : null;
    if (sunrise && sunrise > new Date()) {
      const wait = Math.min(sunrise - new Date(), maxWait * 60_000);
      log("INFO", `Sleeping ${Math.round(wait / 60_000)} min until Kathmandu sunrise (${text}).`);
      await new Promise((r) => setTimeout(r, wait));
    } else log("INFO", "Sunrise already passed or unavailable — posting now.");
  }

  if (dry) {
    for (const kind of kinds) {
      const [link, caption] = await buildPost(kind, now.iso, payload, fields);
      console.log(`===== ${kind} =====\nLINK: ${link}\nCAPTION:\n${caption}\n`);
    }
    return 0;
  }
  let failed = 0;
  for (const [i, kind] of kinds.entries()) {
    if (i) await new Promise((r) => setTimeout(r, GAP_S * 1000));
    const [link, caption] = await buildPost(kind, now.iso, payload, fields);
    await warmLinkPreview(link);
    try {
      const id = await postLink({ link, message: caption, pageId, token });
      log("INFO", `Posted ${kind}/${now.iso} to Facebook page ${pageId} (post ${id}).`);
      markPosted(kind, now.iso);
    } catch (e) {
      log("ERROR", `Facebook ${kind} post failed for ${now.iso}: ${e.message}`);
      failed += 1;
    }
  }
  return failed ? 1 : 0;
}
main().then((code) => process.exit(code), (e) => (log("ERROR", e.stack ?? String(e)), process.exit(1)));
