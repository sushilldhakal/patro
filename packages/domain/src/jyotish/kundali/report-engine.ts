/**
 * The deterministic kundali report, made on the device: `jyotish::report` + `report_sections` in
 * apps/rust (`iter_report` / `build_sections` of the Python reference). A meta record, ~25 sections in
 * English or Nepali, each graded by a supports-vs-contradicts confidence, then `done`.
 */
import { pyInt, pyRoundInt } from "../../panchanga/engine/py";
import { bsDateOf } from "../../astronomy/lunar-month";
import {
  aspectsTo, ALL as ALL_GRAHAS, DUSTHANA, EN, fact, KENDRA_TRIKONA, naturalBenefic, naturalMalefic, SEVEN, dignity as dignityOf,
  type Chart, type Dignity, type GrahaKey,
} from "./chart-facts";
import { isoAt, YEAR_DAYS } from "./vimshottari-engine";
import { vargaRashi } from "./vargas";
import type { YogaRow } from "./yogas-engine";
import * as R from "./report-tables.generated";

type Json = Record<string, unknown>;
const GI: Record<GrahaKey, number> = { sun: 0, moon: 1, mars: 2, mercury: 3, jupiter: 4, venus: 5, saturn: 6, rahu: 7, ketu: 8 };
const en = (g: GrahaKey) => EN[g];
const neName = (g: GrahaKey) => R.PLANET_NE[GI[g]];
const ord = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
const ordNe = (n: number) => `${n} औं`;
const DIGNITY_INDEX: Record<Dignity, number> = { exalted: 0, debilitated: 1, moolatrikona: 2, own: 3, friend: 4, enemy: 5, neutral: 6 };
const phrase = (d: Dignity | null, fallback: string) => (d ? R.DIGNITY_PHRASE[DIGNITY_INDEX[d]] : fallback);
const phraseNe = (d: Dignity | null, fallback: string) => (d ? R.DIGNITY_PHRASE_NE[DIGNITY_INDEX[d]] : fallback);
const score = (d: Dignity | null) => (d === "exalted" || d === "moolatrikona" || d === "own" ? 2 : d === "friend" ? 1 : d === "enemy" ? -1 : d === "debilitated" ? -2 : 0);
const STATUS_NE: Record<string, string> = { Exceptional: "असाधारण", Strong: "बलियो", Adequate: "पर्याप्त", Borderline: "सीमान्त", Weak: "कमजोर" };
const statusNe = (s: string) => STATUS_NE[s] ?? s;
const strongStatus = (s: string | null) => s === "Strong" || s === "Exceptional";
const weakStatus = (s: string | null) => s === "Weak" || s === "Borderline";
const plain = (g: GrahaKey, ne: boolean) => (ne ? R.PLAIN_THEME_NE : R.PLAIN_THEME_EN)[GI[g]];
const head = (s: string) => s.split(",")[0];
const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "");
const US_PER_DAY_ = 86_400_000_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** `_fmt_date`: `"12 Jun 2027"` (the instant's UTC date). Instants are microseconds since 1970. */
function fmtDate(us: number): string {
  const d = new Date(Math.floor(us / 1000));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** `_fmt_date_ne`: the Bikram Sambat date with Nepali month names. */
function fmtDateNe(us: number): string {
  // The UTC civil day's JDN, then the engine's own BS table (outside it: Gregorian with Nepali month names).
  const bs = bsDateOf(Math.floor(us / US_PER_DAY_) + 2440588);
  if (bs) return `${bs.day} ${R.BS_MONTH_NE[bs.month - 1]} ${bs.year}`;
  let s = fmtDate(us);
  for (const [a, b] of R.EN_MONTH_NE) s = s.split(a).join(b);
  return s;
}
const date = (us: number, ne: boolean) => (ne ? fmtDateNe(us) : fmtDate(us));

/** `Confidence`: independent supporting and contradicting factors. */
class Confidence {
  supports: string[] = [];
  contradicts: string[] = [];
  support(f: string) { this.supports.push(f); }
  against(f: string) { this.contradicts.push(f); }
  level(): string {
    const [s, c] = [this.supports.length, this.contradicts.length];
    if (s === 0 && c === 0) return "tentative";
    if (s >= 1 && c >= 1 && Math.abs(s - c) <= 1) return "mixed";
    const net = s - c;
    return net >= 3 ? "strong" : net === 2 ? "moderate" : net <= -2 ? "mixed" : "tentative";
  }
  factors() { return [...this.supports, ...this.contradicts]; }
}

class Ctx {
  chart: Chart;
  yogas: YogaRow[];
  now: number;
  ne: boolean;
  constructor(chart: Chart, yogas: YogaRow[], now: number, ne: boolean) {
    this.chart = chart;
    this.yogas = yogas;
    this.now = now;
    this.ne = ne;
  }
  maha(): GrahaKey | null { return this.chart.dasha?.mahaLord ?? null; }
  antar(): GrahaKey | null { return this.chart.dasha?.antarLord ?? null; }
  p(g: GrahaKey) { return fact(this.chart, g); }

  /** `_planet_confidence`. */
  planetConf(g: GrahaKey): Confidence {
    const conf = new Confidence();
    const pf = this.p(g);
    const sc = score(pf.dignity);
    if (sc >= 2) conf.support(`D1: ${en(g)} ${phrase(pf.dignity, "")}`);
    else if (sc === 1) conf.support(`D1: ${en(g)} in a friendly sign`);
    else if (sc <= -2) conf.against(`D1: ${en(g)} ${R.DIGNITY_PHRASE[1]}`);
    else if (sc === -1) conf.against(`D1: ${en(g)} in an enemy sign`);
    if (pf.vargottama) conf.support("D9: vargottama (same sign in navamsa — reinforced)");
    else {
      const d9 = dignityOf(g, pf.navamsa * 30 + 1);
      if (d9 === "exalted" || d9 === "own" || d9 === "moolatrikona") conf.support(`D9: ${en(g)} dignified in navamsa`);
      else if (d9 === "debilitated") conf.against(`D9: ${en(g)} weak in navamsa`);
    }
    const status = pf.shadbalaStatus;
    if (strongStatus(status)) conf.support(`Shadbala: ${status ?? ""}`);
    else if (weakStatus(status)) conf.against(`Shadbala: ${status ?? ""}`);
    if (g === this.maha() || g === this.antar()) conf.support(`Dasha: ${en(g)} runs the current ${g === this.maha() ? "mahadasha" : "antardasha"}`);
    return conf;
  }

  /** `_house_confidence`. */
  houseConf(house: number): Confidence {
    const conf = new Confidence();
    const lord = this.chart.houseLord[house];
    const lf = this.p(lord);
    const sc = score(lf.dignity);
    if (sc >= 2) conf.support(`D1: ${ord(house)} lord ${en(lord)} well dignified`);
    else if (sc <= -2) conf.against(`D1: ${ord(house)} lord ${en(lord)} debilitated`);
    if (DUSTHANA.includes(lf.house)) conf.against(`D1: ${ord(house)} lord falls in the ${ord(lf.house)} (a difficult house)`);
    else if (KENDRA_TRIKONA.includes(lf.house)) conf.support(`D1: ${ord(house)} lord in a strong angle/trine (the ${ord(lf.house)})`);
    const status = lf.shadbalaStatus;
    if (strongStatus(status)) conf.support(`Shadbala: ${ord(house)} lord ${status ?? ""}`);
    else if (weakStatus(status)) conf.against(`Shadbala: ${ord(house)} lord ${status ?? ""}`);
    const occ = this.chart.houseOccupants[house];
    const benefics = occ.filter(naturalBenefic).map(en);
    const malefics = occ.filter(naturalMalefic).map(en);
    if (benefics.length) conf.support(`D1: natural benefic(s) present — ${benefics.join(", ")}`);
    const upachaya = [3, 6, 10, 11].includes(house);
    if (malefics.length && !upachaya) conf.against(`D1: natural malefic(s) present — ${malefics.join(", ")}`);
    else if (malefics.length && upachaya) conf.support(`D1: malefic(s) in an upachaya house (strengthening here) — ${malefics.join(", ")}`);
    return conf;
  }

  /** `_planet_line`. */
  planetLine(g: GrahaKey): string {
    const pf = this.p(g);
    const deg = pyInt(pf.degInSign);
    const minute = (((pyRoundInt((pf.degInSign - deg) * 60)) % 60) + 60) % 60;
    const mm = String(minute).padStart(2, "0");
    const node = g === "rahu" || g === "ketu";
    const bits: string[] = [];
    if (this.ne) {
      bits.push(`${neName(g)} ${R.RASHI_NE[pf.sign]} राशिमा ${deg}°${mm}′ (जन्म तारा ${R.NAKSHATRA_NE[pf.nakshatra]}, चरण ${pf.pada}), तपाईंको ${ordNe(pf.house)} भावमा छ`);
      if (pf.dignity) bits.push(`र यहाँ ${phraseNe(pf.dignity, "")} छ`);
      if (pf.retrograde && !node) bits.push("अहिले उल्टो गति (वक्री) मा छ, त्यसैले यसका विषय भित्री रूपमा फर्किन्छन्");
      if (pf.combust) bits.push("सूर्यको धेरै नजिक (अस्त) छ, त्यसैले बाह्य फल पाउन बढी प्रयास चाहिन्छ");
      if (pf.vargottama) bits.push("दुवै मुख्य चार्टमा उही राशिमा (वर्गोत्तम) छ — जसले यसलाई उल्लेखनीय रूपमा बलियो बनाउँछ");
      return `${bits.join("; ")}।`;
    }
    bits.push(`${en(g)} is in ${R.RASHI_EN[pf.sign]} at ${deg}°${mm}′ (birth star ${R.NAKSHATRA_EN[pf.nakshatra]}, quarter ${pf.pada}), in your ${ord(pf.house)} house`);
    if (pf.dignity) bits.push(`and is ${phrase(pf.dignity, "")} there`);
    if (pf.retrograde && !node) bits.push("moving backwards for now (retrograde), so its themes turn inward and get revisited");
    if (pf.combust) bits.push("very close to the Sun (combust), so its outer results take extra effort");
    if (pf.vargottama) bits.push("in the same sign in both main charts (vargottama), which makes it noticeably stronger");
    return `${bits.join("; ")}.`;
  }

  /** `_signified_house_planet`. */
  signified(house: number, ne: boolean): string {
    const lord = this.chart.houseLord[house];
    const lf = this.p(lord);
    const occ = this.chart.houseOccupants[house];
    const status = lf.shadbalaStatus;
    if (ne) {
      const parts = [`जीवनको यो क्षेत्र ${R.HOUSE_THEME_NE[house]} सँग सम्बन्धित छ।`];
      parts.push(`यो क्षेत्र सम्हाल्ने ग्रह ${neName(lord)} अहिले ${head(R.HOUSE_THEME_NE[lf.house])} सँग सम्बन्धित भागमा छ, र यहाँ ${phraseNe(lf.dignity, "रहेको")} छ${status ? ` (समग्र बल ${statusNe(status)})` : ""}।`);
      if (occ.length) parts.push(`यस क्षेत्रमा अहिले रहेका ग्रह: ${occ.map(neName).join(", ")}।`);
      return parts.join(" ");
    }
    const parts = [`This area of life is about ${R.HOUSE_THEME[house]}.`];
    parts.push(`The planet in charge of it, ${en(lord)}, currently sits in the part of your chart about ${head(R.HOUSE_THEME[lf.house])}, and is ${phrase(lf.dignity, "placed")} there${status ? ` (overall strength ${status.toLowerCase()})` : ""}.`);
    if (occ.length) parts.push(`Planets currently in this area: ${occ.map(en).join(", ")}.`);
    return parts.join(" ");
  }

  /** `_strongest`: highest (ratio or 0, dignity score), first on ties. */
  strongest(): GrahaKey {
    const key = (g: GrahaKey): [number, number] => [this.p(g).shadbalaRatio ?? 0, score(this.p(g).dignity)];
    let best: GrahaKey = SEVEN[0];
    for (const g of SEVEN.slice(1)) if (cmp(key(g), key(best)) > 0) best = g;
    return best;
  }
  /** `_weakest`: lowest (ratio or 99, dignity score), first on ties. */
  weakest(): GrahaKey {
    const key = (g: GrahaKey): [number, number] => [this.p(g).shadbalaRatio || 99, score(this.p(g).dignity)];
    let best: GrahaKey = SEVEN[0];
    for (const g of SEVEN.slice(1)) if (cmp(key(g), key(best)) < 0) best = g;
    return best;
  }
}
const cmp = (a: [number, number], b: [number, number]) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);

/** A section before serialization. */
class Section {
  body: string[];
  conf: Confidence | null = null;
  items: Json[] | null = null;
  optional = false;
  id: string;
  titleEn: string;
  titleNe: string;
  constructor(id: string, titleEn: string, titleNe: string, body: string[]) {
    this.id = id;
    this.titleEn = titleEn;
    this.titleNe = titleNe;
    this.body = body.filter((x) => x !== "");
  }
  withConf(c: Confidence): this { this.conf = c; return this; }
  withItems(items: Json[]): this { this.items = items; return this; }
  /** The record fields, Nepali factors localized as `_localize_section` does. */
  toMap(ne: boolean): Json {
    const m: Json = { id: this.id, title_en: this.titleEn, title_ne: this.titleNe, body: this.body };
    if (this.conf) {
      m.confidence = this.conf.level();
      m.factors = this.conf.factors().map((f) => (ne ? localizeNe(f) : f));
    }
    if (this.items) {
      m.items = this.items.map((it) => {
        const f = it.factors as string[] | undefined;
        return ne && Array.isArray(f) && f.length ? { ...it, factors: f.map((x) => localizeNe(x)) } : { ...it };
      });
    }
    if (this.optional) m.optional = true;
    return m;
  }
}
const item = (label: string, confidence: string, text: string): Json => ({ label, confidence, text });
const itemFactors = (label: string, confidence: string, factors: string[], text: string): Json => ({ label, confidence, factors, text });

// ── Nepali localization of factors ──

/** Python `re`'s word character: Unicode letters and digits, not combining marks. */
function pyWord(c: string | undefined): boolean {
  if (c === undefined) return false;
  const u = c.codePointAt(0) as number;
  if (u < 128) return /[A-Za-z0-9_]/.test(c);
  if (u >= 0x0900 && u <= 0x097f) return (u >= 0x0904 && u <= 0x0939) || u === 0x093d || u === 0x0950 || (u >= 0x0958 && u <= 0x0961) || (u >= 0x0966 && u <= 0x096f) || (u >= 0x0971 && u <= 0x097f);
  return /[\p{L}\p{N}]/u.test(c);
}
/** `re.sub(r"\b…\b", rep, text)`, with Python's word boundaries. */
function subBounded(text: string, source: string, flags: string, rep: (m: RegExpExecArray) => string): string {
  const re = new RegExp(source, `g${flags}`);
  let out = "";
  let pos = 0;
  let copied = 0;
  while (pos <= text.length) {
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) break;
    const start = m.index;
    const end = start + m[0].length;
    const before = [...text.slice(0, start)].pop();
    const after = [...text.slice(end)][0];
    if (!pyWord(before) && !pyWord(after) && m[0] !== "") {
      out += text.slice(copied, start) + rep(m);
      copied = end;
      pos = end;
    } else {
      pos = start + ([...text.slice(start)][0]?.length ?? 1);
    }
  }
  return out + text.slice(copied);
}
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LITERALS: [string, string][] = [
  ["is at", "मा अवस्थित छ"], ["occupying the", ""], ["house (\\d+)", "\u0000"], ["in the", "मा"],
  ["and the Sun is in", "र सूर्य"], ["to the foreground", "अगाडि"], ["with dates", "मिति सहित"],
];
/** `_apply_ne_regex`. */
function applyNeRegex(text: string): string {
  const d = (m: RegExpExecArray) => m[1] ?? "";
  let out = subBounded(text, "(\\d+)(?:st|nd|rd|th) house", "i", (m) => `${d(m)} औं भाव`);
  out = subBounded(out, "House (\\d+)", "i", (m) => `${d(m)} औं भाव`);
  out = subBounded(out, "(\\d+)(?:st|nd|rd|th) lord", "i", (m) => `${d(m)} औं भावका स्वामी`);
  out = subBounded(out, "(\\d+)(?:st|nd|rd|th)", "i", (m) => `${d(m)} औं`);
  out = subBounded(out, "pada (\\d+)", "i", (m) => `चरण ${d(m)}`);
  for (const [pat, rep] of LITERALS) out = rep === "\u0000" ? subBounded(out, pat, "i", (m) => `${d(m)} औं भाव`) : subBounded(out, pat, "i", () => rep);
  for (const [e, n] of R.EN_MONTH_NE) out = subBounded(out, e, "", () => n);
  for (const [e, n] of R.NE_WORD_MAP) out = subBounded(out, escapeRe(e), "i", () => n);
  out = out.split("भitr").join("भित्र").split("यसभitr").join("यसभित्र");
  return out.replace(/\s+/g, " ").trim();
}
/** `_localize_text_ne`. */
function localizeNe(text: string): string {
  let out = text;
  for (const [e, n] of R.NE_REPLACEMENTS) if (e && out.includes(e)) out = out.split(e).join(n);
  return applyNeRegex(out);
}

// ── Sections ──
const US_PER_DAY = 86_400_000_000;
const daysBetween = (start: number, end: number) => Math.floor((end - start) / US_PER_DAY);
/** `_age_at(birth, when)`: whole years on the UTC calendar. */
function ageAt(birth: number, when: number): number {
  const b = new Date(Math.floor(birth / 1000));
  const w = new Date(Math.floor(when / 1000));
  const before = w.getUTCMonth() < b.getUTCMonth() || (w.getUTCMonth() === b.getUTCMonth() && w.getUTCDate() < b.getUTCDate());
  return Math.max(0, w.getUTCFullYear() - b.getUTCFullYear() - (before ? 1 : 0));
}

const VIM_YEARS: Record<string, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };

function lifeJourney(ctx: Ctx): Section | null {
  const d = ctx.chart.dasha;
  if (!d || !d.full.length) return null;
  const { ne, now } = ctx;
  const birth = d.full[0].start;
  const items: Json[] = [];
  for (const [idx, m] of d.full.entries()) {
    const [a0, a1] = [ageAt(birth, m.start), ageAt(birth, m.end)];
    if (a0 > 100) break;
    const lord = m.lord as GrahaKey;
    const past = m.end <= now;
    const current = m.start <= now && now < m.end;
    const span = `${date(m.start, ne)} → ${date(m.end, ne)}`;
    const spanYears = daysBetween(m.start, m.end) / YEAR_DAYS;
    const dur = spanYears >= 1.5 ? (ne ? `${pyRoundInt(spanYears)} वर्ष` : `${pyRoundInt(spanYears)} yrs`) : ne ? `${pyRoundInt(spanYears * 12)} महिना` : `${pyRoundInt(spanYears * 12)} mo`;
    const balance = idx === 0 && spanYears < VIM_YEARS[lord] - 0.5;
    let label: string;
    let text: string;
    if (ne) {
      const status = past ? "विगत" : current ? "वर्तमान · अहिले यहीँ" : "आगामी";
      const theme = R.DASHA_THEME_NE[GI[lord]];
      const gloss = past ? `यस अवधिले ${theme} वरिपरि अनुभव र आधार निर्माण गर्‍यो।` : current ? `अहिले तपाईं यही अध्यायमा हुनुहुन्छ — ${theme} अघि सारिन्छ।` : `यो आउँदो अध्यायले ${theme} लाई अगाडि ल्याउनेछ।`;
      label = `${neName(lord)} को जीवन-कालखण्ड${balance ? " (जन्मकालीन शेष)" : ""} · उमेर ${a0}–${a1} (${status})`;
      text = `${span} (${dur}): ${gloss}`;
    } else {
      const status = past ? "past" : current ? "present · you are here" : "ahead";
      const theme = R.DASHA_THEME[GI[lord]];
      const gloss = past ? `This chapter built experience around ${theme}.` : current ? `You are living this chapter now — ${theme} is foregrounded.` : `This coming chapter brings ${theme} to the fore.`;
      label = `${en(lord)} life period${balance ? " (balance at birth)" : ""} · age ${a0}–${a1} (${status})`;
      text = `${span} (${dur}): ${gloss}`;
    }
    items.push(item(label, ctx.planetConf(lord).level(), text));
  }
  const body = ne
    ? "तपाईंको जीवन ठूला-ठूला कालखण्ड (जसलाई ज्योतिषमा महादशा भनिन्छ) मा बाँडिएको हुन्छ, र हरेक कालखण्डले जीवनको फरक पक्षमा जोड दिन्छ। तल जन्मदेखि बाँचिसकेका विगतका कालखण्ड, हाल चलिरहेको कालखण्ड र आगामी कालखण्डहरू उमेरसहित दिइएको छ — कुन बेला जीवनमा के कुरामा जोड पर्छ भन्ने एकै नजरमा हेर्न।"
    : "Your life is divided into long chapters (called mahadashas in astrology), and each one emphasises a different part of life. Below are the chapters you have already lived, the one running now, and the ones ahead — with ages — so you can see at a glance which stage of life emphasises what.";
  return new Section("life_journey", "Life journey — past, present & future", "जीवन यात्रा — विगत, वर्तमान र भविष्य", [body]).withItems(items);
}

/** `_next_period_for` → `_window_phrase`. */
function windowPhrase(ctx: Ctx, lord: GrahaKey): string | null {
  const d = ctx.chart.dasha;
  if (!d) return null;
  const now = ctx.now;
  const w = d.bhuktis.find((p) => p.lord === lord && p.end > now) ?? d.full.find((p) => p.lord === lord && p.end > now);
  if (!w) return null;
  const running = w.start <= now && now < w.end;
  const span = `${date(w.start, ctx.ne)} → ${date(w.end, ctx.ne)}`;
  return ctx.ne ? `${running ? "हाल चलिरहेको अनुकूल समय" : "आगामी अनुकूल समय"} (${span})` : `${running ? "a good period running now" : "an upcoming good period"} (${span})`;
}

function pursue(ctx: Ctx): Section {
  const ne = ctx.ne;
  const items: Json[] = [];
  const add = (areaNe: string, areaEn: string, lord: GrahaKey, pursueNe: string, pursueEn: string) => {
    const conf = ctx.planetConf(lord);
    const w = windowPhrase(ctx, lord);
    if (ne) items.push(item(areaNe, conf.level(), `${pursueNe}${w ? ` सबैभन्दा राम्रो समय: ${w}।` : ""}`));
    else items.push(item(areaEn, conf.level(), `${pursueEn}${w ? ` Best time for this: ${w}.` : ""}`));
  };
  const strong = ctx.strongest();
  add("तपाईंको सबैभन्दा बलियो पक्ष", "Your strongest area", strong,
    `तपाईं स्वाभाविक रूपमा ${plain(strong, true)} मा राम्रो हुनुहुन्छ — यहीँ मिहिनेत सबैभन्दा छिटो फल दिन्छ, त्यसैले यसमै सबैभन्दा बढी लगानी गर्नुहोस्।`,
    `You are naturally good at ${plain(strong, false)} — effort pays off fastest here, so put most of your energy into it.`);
  const c = ctx.chart;
  add("करियर र कर्म", "Career & work", c.houseLord[10], "करियर, स्थिति र सार्वजनिक भूमिकामा ठूला कदम चाल्नुहोस्।", "Make your bigger moves in career, status and public role.");
  add("धन र लाभ", "Wealth & gains", c.houseLord[11], "आम्दानीका स्रोत, सञ्जाल र आकांक्षा विस्तार गर्नुहोस्।", "Expand income streams, networks and aspirations.");
  add("सम्बन्ध र साझेदारी", "Relationships & partnership", c.houseLord[7], "विवाह, साझेदारी वा सार्वजनिक सहकार्यलाई अघि बढाउनुहोस्।", "Advance marriage, partnership or public collaboration.");
  add("शिक्षा, धर्म र मार्गदर्शन", "Learning, dharma & mentors", c.houseLord[9], "उच्च शिक्षा, यात्रा, गुरुसंग र आध्यात्मिक अभ्यासलाई समय दिनुहोस्।", "Invest in higher learning, travel, mentors and spiritual practice.");
  const body = ne
    ? "यो खण्डले तपाईंले कुन कुरामा ध्यान दिने र त्यसका लागि कुन समय सबैभन्दा राम्रो छ भन्ने देखाउँछ। तल हरेक जीवन-क्षेत्रसँगै त्यसका लागि अनुकूल समय दिइएको छ — ठूला निर्णय ती समयसँग मिलाउनुहोस्।"
    : "This section shows what to focus on and the best time for each one. Every life area below comes with the period that most favours it — try to line up your bigger decisions with those good times.";
  return new Section("pursue_and_when", "What to pursue & when", "के कुरामा लाग्ने र कहिले", [body]).withItems(items);
}

/** `VARGA_DOMAIN`. */
const VARGA_DOMAIN: [number, string, string, string, string][] = [
  [9, "Navamsa", "नवांश", "marriage, dharma, fortune and the inner strength of every planet", "विवाह, धर्म, भाग्य र हरेक ग्रहको भित्री बल"],
  [10, "Dasamsa", "दशांश", "career, profession, status and public achievement", "करियर, पेशा, प्रतिष्ठा र सार्वजनिक उपलब्धि"],
  [7, "Saptamsa", "सप्तांश", "children, progeny and creative continuity", "सन्तान, वंश र सिर्जनात्मक निरन्तरता"],
  [4, "Chaturthamsa", "चतुर्थांश", "home, land, property and inner contentment", "घर, जग्गा, सम्पत्ति र आन्तरिक सन्तुष्टि"],
  [12, "Dwadashamsa", "द्वादशांश", "parents, lineage and inherited karma", "आमाबुबा, वंश र पैतृक कर्म"],
  [24, "Chaturvimsamsa", "चतुर्विंशांश", "education, learning and scholarship", "शिक्षा, विद्या र प्रज्ञा"],
  [2, "Hora", "होरा", "wealth, resources and material sustenance", "धन, स्रोत र भौतिक निर्वाह"],
  [3, "Drekkana", "द्रेष्काण", "siblings, courage and personal initiative", "भाइबहिनी, साहस र व्यक्तिगत पहल"],
  [16, "Shodashamsa", "षोडशांश", "vehicles, comforts and material pleasures", "सवारी, सुविधा र भौतिक सुख"],
  [20, "Vimsamsa", "विंशांश", "spiritual practice, devotion and religious merit", "आध्यात्मिक साधना, भक्ति र धार्मिक पुण्य"],
  [27, "Bhamsa", "सप्तविंशांश", "innate strengths, weaknesses and stamina", "जन्मजात बल, कमजोरी र सहनशीलता"],
  [30, "Trimsamsa", "त्रिंशांश", "adversity, health risks and moral fibre", "प्रतिकूलता, स्वास्थ्य जोखिम र नैतिक बल"],
  [60, "Shashtiamsa", "षष्ट्यंश", "the sum of past-life karma standing behind the whole chart", "सम्पूर्ण कुण्डलीभित्रको पूर्वजन्म कर्मको योग"],
];

/** `_divisional_item`. */
function divisionalItem(ctx: Ctx, [division, enLabel, neLabel, enDom, neDom]: [number, string, string, string, string]): Json {
  const ne = ctx.ne;
  const dignified: GrahaKey[] = [];
  const debilitated: GrahaKey[] = [];
  const sameSign: GrahaKey[] = [];
  const factors: string[] = [];
  for (const g of SEVEN) {
    const pf = ctx.p(g);
    const vsign = vargaRashi(division, pf.longitude) - 1;
    const dign = dignityOf(g, vsign * 30 + 15);
    const notes: string[] = [];
    if (dign === "exalted" || dign === "own" || dign === "moolatrikona") {
      dignified.push(g);
      notes.push(ne ? phraseNe(dign, "") : phrase(dign, ""));
    } else if (dign === "debilitated") {
      debilitated.push(g);
      notes.push(ne ? R.DIGNITY_PHRASE_NE[1] : R.DIGNITY_PHRASE[1]);
    }
    if (pf.sign === vsign) {
      sameSign.push(g);
      notes.push(division === 9 ? (ne ? "वर्गोत्तम" : "vargottama") : ne ? "जन्म राशि दोहोर्‍याउँछ" : "keeps its natal sign");
    }
    if (notes.length) factors.push(`${ne ? neName(g) : en(g)}: ${notes.join(", ")}`);
  }
  const strongKeys = [...new Set([...dignified, ...sameSign])];
  const [strongCt, weakCt] = [strongKeys.length, debilitated.length];
  const level = strongCt >= 3 && weakCt === 0 ? "strong" : strongCt >= weakCt + 2 || (strongCt > 0 && weakCt === 0) ? "moderate" : strongCt > 0 && weakCt > 0 ? "mixed" : "tentative";
  const [verdictEn, verdictNe] =
    level === "strong" ? ["strong and well-supported", "बलियो र राम्रोसँग समर्थित"]
    : level === "moderate" ? ["reasonably supported", "ठीकठाकसँग समर्थित"]
    : level === "mixed" ? ["mixed — some support and some challenges", "मिश्रित — केही समर्थन, केही चुनौती"]
    : ["average, without a standout signal", "सामान्य, कुनै विशेष संकेतबिना"];
  let text: string;
  if (ne) {
    const strongNames = strongKeys.map(neName).join(", ");
    const weakNames = debilitated.map(neName).join(", ");
    text = `D${division} (${neLabel}) चक्रले तपाईंको ${neDom} देखाउँछ।`;
    if (strongNames) text += ` यहाँ ${strongNames} बलियो छन्, जसले यस क्षेत्रलाई सघाउँछ।`;
    if (weakNames) text += ` ${weakNames} भने केही दबाबमा छन्, त्यसैले यता थप ध्यान चाहिन्छ।`;
    text += ` समग्रमा यो क्षेत्र ${verdictNe} देखिन्छ।`;
  } else {
    const strongNames = strongKeys.map(en).join(", ");
    const weakNames = debilitated.map(en).join(", ");
    text = `The D${division} chart (${enLabel}) shows your ${enDom}.`;
    if (strongNames) text += ` ${strongNames} ${strongKeys.length === 1 ? "is" : "are"} strong here, which helps this area.`;
    if (weakNames) text += ` ${weakNames} ${debilitated.length === 1 ? "is" : "are"} under some strain, so this part needs more care.`;
    text += ` Overall, this area looks ${verdictEn}.`;
  }
  return itemFactors(ne ? `D${division} — ${neLabel}` : `D${division} — ${enLabel}`, level, factors, text);
}

const GRAHA_KEYS = new Set(["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"]);
/** `_yoga_involved`. */
function yogaInvolved(ctx: Ctx, key: string): GrahaKey[] {
  if (key === "gajakesari") return ["jupiter", "moon"];
  if (key === "budhaditya") return ["sun", "mercury"];
  if (key === "chandra_mangala") return ["moon", "mars"];
  if (key === "kemadruma") return ["moon"];
  if (key === "dhana_2_11") return [ctx.chart.houseLord[2], ctx.chart.houseLord[11]];
  for (const prefix of ["mahapurusha_", "neechabhanga_"]) {
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length);
      return GRAHA_KEYS.has(rest) ? [rest as GrahaKey] : [];
    }
  }
  if (key.startsWith("raja_")) return key.slice(5).split("_").filter((x) => GRAHA_KEYS.has(x)) as GrahaKey[];
  return [];
}

/** `_yoga_report_item`. */
function yogaItem(ctx: Ctx, y: YogaRow): Json {
  const ne = ctx.ne;
  const involved = yogaInvolved(ctx, y.key);
  const factors: string[] = [];
  let [strongCt, weakCt] = [0, 0];
  for (const g of involved) {
    const pf = ctx.p(g);
    const ds = score(pf.dignity);
    const sb = pf.shadbalaStatus;
    if (ds >= 2 || strongStatus(sb) || pf.vargottama) strongCt += 1;
    if (ds <= -2 || weakStatus(sb) || pf.combust) weakCt += 1;
    let bit = ne ? `${neName(g)}: ${phraseNe(pf.dignity, "स्थित")}` : `${en(g)}: ${phrase(pf.dignity, "placed")}`;
    if (sb) bit += ne ? `, षड्बल ${statusNe(sb)}` : `, Shadbala ${sb}`;
    if (pf.vargottama) bit += ne ? ", वर्गोत्तम" : ", vargottama";
    if (pf.combust) bit += ne ? ", अस्त" : ", combust";
    factors.push(bit);
  }
  const activated = involved.some((g) => g === ctx.maha() || g === ctx.antar());
  if (activated) factors.push(ne ? "वर्तमान दशाले सक्रिय गरेको" : "Activated by the current dasha");
  const level =
    y.polarity === "caution" ? (weakCt > 0 ? "mixed" : "tentative")
    : y.polarity === "mixed" ? "mixed"
    : strongCt > 0 && weakCt === 0 ? (strongCt >= 2 || activated ? "strong" : "moderate")
    : weakCt > 0 ? "mixed" : "moderate";
  const parts: string[] = [];
  if (y.polarity !== "caution") {
    if (strongCt > 0 && weakCt === 0) parts.push(ne ? "यसका ग्रह यहाँ बलिया छन्, त्यसैले फल भरपर्दो छ" : "Its planets are strong here, so the result is dependable");
    else if (weakCt > 0 && strongCt === 0) parts.push(ne ? "यसका ग्रह कमजोर छन्, त्यसैले फल देखिन थप प्रयास चाहिन्छ" : "Its planets are on the weaker side, so the result needs extra effort to show");
    else if (strongCt > 0 && weakCt > 0) parts.push(ne ? "बल मिश्रित छ — केही समर्थन, केही घर्षण" : "Strength is mixed — some support, some friction");
  }
  if (activated) parts.push(ne ? "अहिलेको दशाले यसलाई सक्रिय गरिरहेको छ" : "the running dasha is activating it now");
  let text = ne ? y.textNe : y.text;
  if (parts.length) text += ` ${parts.join("; ")}${ne ? "।" : "."}`;
  return { label: ne ? y.nameNe : y.name, confidence: level, polarity: y.polarity, text, factors };
}

function strengthWord(level: string, ne: boolean): string {
  if (!ne) return level === "strong" ? "a strong, well-supported" : level === "moderate" ? "a moderately supported" : level === "mixed" ? "a mixed, conditional" : "a tentative";
  return level === "strong" ? "बलियो, राम्रोसँग समर्थित" : level === "moderate" ? "मध्यम रूपमा समर्थित" : level === "mixed" ? "मिश्रित, सशर्त" : "अनिश्चित";
}

const utcIso = (us: number) => isoAt(us, 0);
const NAK_SEQUENCE: GrahaKey[] = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];

/** The meta record (`_meta` + `_localize_meta`). */
function meta(ctx: Ctx): Json {
  const c = ctx.chart;
  const ne = ctx.ne;
  const sign = (x: number) => ({ sign: x + 1, name_en: R.RASHI_EN[x], name_ne: R.RASHI_NE[x] });
  const moon = ctx.p("moon");
  const d = c.dasha;
  const m: Json = {
    lagna: sign(c.lagnaSign),
    moon_sign: sign(c.moonSign),
    sun_sign: sign(c.sunSign),
    nakshatra: { name_en: R.NAKSHATRA_EN[moon.nakshatra], name_ne: R.NAKSHATRA_NE[moon.nakshatra], pada: moon.pada, lord_en: en(NAK_SEQUENCE[moon.nakshatra % 9]) },
    mahadasha: d
      ? {
          lord: d.mahaLord, lord_en: en(d.mahaLord), lord_ne: neName(d.mahaLord), ends: date(d.mahaEnd, ne),
          antardasha: d.antarLord, antardasha_en: en(d.antarLord), antardasha_ne: neName(d.antarLord), antardasha_ends: date(d.antarEnd, ne),
          window: [utcIso(d.mahaStart), utcIso(d.mahaEnd)],
        }
      : null,
    yoga_count: ctx.yogas.length,
    generated_at: utcIso(ctx.now),
  };
  if (ne) {
    m.method = "पराशरी नियममा आधारित निष्कर्ष — विश्वास स्तर सहित";
    m.disclaimer = "चिन्तन र सांस्कृतिक अन्तर्दृष्टिका लागि। प्रवृत्ति र सम्भावना देखाउँछ, निश्चितता होइन; व्यावसायिक सल्लाहको विकल्प होइन।";
  } else {
    m.method = "Deterministic Parashari interpretation with confidence weighting";
    m.disclaimer = "For reflection and cultural insight. Describes tendencies and probabilities, not certainties; not a substitute for professional advice.";
  }
  return m;
}

const dedupe = (names: string[]) => [...new Set(names)];

/** `build_sections(chart, now, lang)`: the report's sections, in order. */
function buildSections(ctx: Ctx): Section[] {
  const c = ctx.chart;
  const { ne, now } = ctx;
  const sections: Section[] = [];
  const lagnaLord = c.houseLord[1];
  const ll = ctx.p(lagnaLord);
  const moon = ctx.p("moon");
  const sun = ctx.p("sun");
  const d = c.dasha;

  // 1 — Executive summary.
  const summaryConf = new Confidence();
  if (score(ll.dignity) >= 2) summaryConf.support(`D1: lagna lord ${en(lagnaLord)} dignified`);
  else if (score(ll.dignity) <= -2) summaryConf.against(`D1: lagna lord ${en(lagnaLord)} debilitated`);
  if (ll.vargottama) summaryConf.support("D9: lagna lord vargottama");
  if (strongStatus(ll.shadbalaStatus)) summaryConf.support("Shadbala: lagna lord strong");
  else if (weakStatus(ll.shadbalaStatus)) summaryConf.against("Shadbala: lagna lord weak");
  const beneficYogas = ctx.yogas.filter((y) => y.polarity === "benefic");
  if (beneficYogas.length) summaryConf.support(`Yogas: ${beneficYogas.length} supportive combination(s)`);
  const nakI = moon.nakshatra;
  const summaryBody = ne
    ? [
        `तीन कुराले तपाईंको सिंगो कुण्डलीको स्वर तय गर्छन्: तपाईंको लग्न (मानिससामु कस्तो देखिनुहुन्छ), तपाईंको चन्द्र (भावना र मन), र तपाईंको सूर्य (भित्री मूल स्वरूप)। यहाँ, ${R.RASHI_NE[c.lagnaSign]} लग्न छ, चन्द्र ${R.RASHI_NE[c.moonSign]} राशिमा (जन्म तारा ${R.NAKSHATRA_NE[nakI]}), र सूर्य ${R.RASHI_NE[c.sunSign]} राशिमा।`,
        `सरल भाषामा भन्दा, तपाईं अरूसामु ${R.SIGN_TRAIT_NE[c.lagnaSign]} व्यक्तिका रूपमा देखिनुहुन्छ।`,
        `तपाईंको लग्नको स्वामी ग्रह ${neName(lagnaLord)} ${ordNe(ll.house)} भावमा, यहाँ ${phraseNe(ll.dignity, "रहेको")} — यसैले समग्रमा तपाईंको कुण्डली ${strengthWord(summaryConf.level(), true)} आधारमा टिकेको छ।`,
      ]
    : [
        `Three things set the tone of your whole chart: your rising sign (how you come across to others), your Moon (your emotions and mind), and your Sun (your core self). Here, ${R.RASHI_EN[c.lagnaSign]} is rising, your Moon is in ${R.RASHI_EN[c.moonSign]} (birth star ${R.NAKSHATRA_EN[nakI]}), and your Sun is in ${R.RASHI_EN[c.sunSign]}.`,
        `In plain terms, you tend to come across to others as ${R.SIGN_TRAIT_EN[c.lagnaSign]}.`,
        `The planet ruling your rising sign, ${en(lagnaLord)}, is in your ${ord(ll.house)} house and ${phrase(ll.dignity, "placed")} there, so overall your chart rests on ${strengthWord(summaryConf.level(), false)} foundation.`,
      ];
  if (d) {
    summaryBody.push(
      ne
        ? `अहिलेको समय: तपाईं ${neName(d.mahaLord)} को मुख्य जीवन-कालखण्ड (महादशा) मा हुनुहुन्छ, जुन ${date(d.mahaEnd, true)} सम्म रहन्छ; यसभित्रको हालको उप-कालखण्ड (अन्तर्दशा) ${neName(d.antarLord)} को हो, ${date(d.antarStart, true)} – ${date(d.antarEnd, true)}। मिति सहितको पूरा तालिका 'जीवन-कालखण्ड तालिका' खण्डमा छ।`
        : `Where you are now: you're in ${en(d.mahaLord)}'s main life period (mahadasha) until ${fmtDate(d.mahaEnd)}, and the current sub-phase within it (antardasha) belongs to ${en(d.antarLord)}, running ${fmtDate(d.antarStart)} – ${fmtDate(d.antarEnd)}. The Life-period timeline section gives the full schedule with dates.`,
    );
  }
  if (beneficYogas.length) {
    summaryBody.push(
      ne
        ? `तपाईंको कुण्डलीमा सक्रिय राम्रा संयोगहरू (योग): ${dedupe(beneficYogas.map((y) => y.nameNe)).join(", ")} — यिनको अर्थ तल 'योग' खण्डमा सजिलो भाषामा दिइएको छ।`
        : `Helpful combinations (yogas) active in your chart: ${dedupe(beneficYogas.map((y) => y.name)).join(", ")} — each is explained in plain words in the Yogas section below.`,
    );
  }
  sections.push(new Section("executive_summary", "Executive summary", "सारांश", summaryBody).withConf(summaryConf));

  // 2 — Personality.
  const persBody = ne
    ? [
        `मानिससामु तपाईं प्रायः ${R.SIGN_TRAIT_NE[c.lagnaSign]} व्यक्तिका रूपमा देखिनुहुन्छ (${R.RASHI_NE[c.lagnaSign]} लग्न)।`,
        `तपाईं आफूलाई कसरी प्रस्तुत गर्नुहुन्छ भन्नेमा ${neName(lagnaLord)} ग्रहको सबैभन्दा ठूलो हात हुन्छ, त्यसैले ${plain(lagnaLord, true)} तपाईंको बाहिरी शैलीको ठूलो हिस्सा हो।`,
        `भित्री रूपमा, तपाईंको आत्म-छवि र इच्छाशक्ति ${plain("sun", true)} वरिपरि बनेको हुन्छ (सूर्य ${R.RASHI_NE[sun.sign]} राशिमा)।`,
        `तपाईं कसरी सोच्नुहुन्छ र कुरा गर्नुहुन्छ भन्ने बुधले देखाउँछ — तपाईंको मन ${plain("mercury", true)} तर्फ ढल्किन्छ।`,
      ]
    : [
        `To other people, you usually come across as ${R.SIGN_TRAIT_EN[c.lagnaSign]} (${R.RASHI_EN[c.lagnaSign]} rising).`,
        `How you present yourself is shaped most by ${en(lagnaLord)} (the planet ruling your rising sign), so ${plain(lagnaLord, false)} is a big part of your outward style.`,
        `Deeper down, your sense of self and drive is built around ${plain("sun", false)} (your Sun is in ${R.RASHI_EN[sun.sign]}).`,
        `The way you think and communicate leans toward ${plain("mercury", false)}.`,
      ];
  sections.push(new Section("personality", "Personality & temperament", "व्यक्तित्व", persBody).withConf(ctx.planetConf(lagnaLord)));

  // 3 — Emotional nature.
  const steady = score(moon.dignity) >= 1;
  const emoBody = ne
    ? [
        `भावनात्मक रूपमा, तपाईं प्रायः ${R.SIGN_TRAIT_NE[moon.sign]} हुनुहुन्छ (चन्द्र ${R.RASHI_NE[moon.sign]} राशिमा)।`,
        `तपाईंलाई भावनात्मक सुरक्षा मुख्यतया ${R.HOUSE_THEME_NE[moon.house]} सँग जोडिएको हुन्छ। ${steady ? "तपाईंको मन स्वाभाविक रूपमा स्थिर रहन्छ।" : "विचारपूर्वक विश्राम, नियमित दिनचर्या र सहयोगी सङ्गतले तपाईंको मनलाई शान्त राख्न स्पष्ट फाइदा दिन्छ।"}`,
      ]
    : [
        `Emotionally, you tend to be ${R.SIGN_TRAIT_EN[moon.sign]} (your Moon is in ${R.RASHI_EN[moon.sign]}).`,
        `Your sense of emotional security is mainly tied to ${R.HOUSE_THEME[moon.house]}. ${steady ? "Your mind tends to stay naturally steady." : "Deliberate rest, a regular routine and supportive company clearly help keep you calm and settled."}`,
      ];
  const ben = aspectsTo(c, moon.house).filter(naturalBenefic);
  if (ben.length) emoBody.push(ne ? `${ben.map(neName).join(", ")} को सहयोगी प्रभावले मनलाई अतिरिक्त सुरक्षा र आशावाद दिन्छ।` : `A helpful, friendly influence from ${ben.map(en).join(", ")} lends the mind extra protection and optimism.`);
  sections.push(new Section("emotional_nature", "Emotional nature", "भावनात्मक स्वभाव", emoBody).withConf(ctx.planetConf("moon")));

  // 4 — Strengths.
  const order = [...ALL_GRAHAS].sort((a, b) => (ctx.p(b).shadbalaRatio ?? 0) - (ctx.p(a).shadbalaRatio ?? 0));
  const strConf = new Confidence();
  const strongThemes: string[] = [];
  for (const g of order) {
    const pf = ctx.p(g);
    if (pf.dignity === "exalted" || pf.dignity === "own" || pf.dignity === "moolatrikona" || strongStatus(pf.shadbalaStatus)) {
      strongThemes.push(plain(g, ne));
      strConf.support(`${en(g)} dignified/strong`);
    }
  }
  const joined = strongThemes.join("; ");
  const strengths = !strongThemes.length
    ? ne
      ? "कुनै ग्रह विशेष रूपमा बलियो छैन, तर धेरै ठीकठाक छन्; तपाईंको बल तयार भई आउनुभन्दा मिहिनेतबाट बन्दै जान्छ।"
      : "No single area stands out as exceptionally strong, but several are solid; your strengths build through effort rather than arriving ready-made."
    : ne
      ? `तपाईंको सबैभन्दा बलियो पक्षहरू यी हुन्: ${joined}। यी कुरा तपाईंलाई स्वाभाविक रूपमै सजिलै आउँछन्, त्यसैले तपाईं यिनमा भरोसा गरेर अगाडि बढ्न सक्नुहुन्छ।`
      : `Your strongest areas are: ${joined}. These come more naturally to you, so you can lean on them and build on them with confidence.`;
  sections.push(new Section("strengths", "Core strengths", "बल पक्ष", [strengths]).withConf(strConf));

  // 5 — Challenges.
  const challenges: string[] = [];
  const chConf = new Confidence();
  for (const g of ALL_GRAHAS) {
    const pf = ctx.p(g);
    if (!(pf.dignity === "debilitated" || weakStatus(pf.shadbalaStatus))) continue;
    const cancelled = ctx.yogas.some((y) => y.key.startsWith(`neechabhanga_${g}`));
    const theme = plain(g, ne);
    let line: string;
    if (ne) {
      line = `${theme} — यी कुरा तुरुन्तै सहजै नआउन सक्छन्, र यिनमा सचेत प्रयास तथा अभ्यास चाहिन्छ।`;
      if (cancelled) line += " राम्रो कुरा — यहाँ यो कमजोरी रद्द गर्ने संयोग (नीचभंग) छ, जसले यसलाई पछि गएर बलमा बदल्न सक्छ।";
    } else {
      line = `${capitalize(theme)} may not come as easily to you, and can take conscious effort and practice.`;
      if (cancelled) line += " The good news: a pattern that cancels this weakness (neecha-bhanga) tends to turn it into strength later on.";
    }
    challenges.push(line);
    chConf.against(`${en(g)} weak/debilitated`);
  }
  if (!challenges.length) challenges.push(ne ? "कुनै ग्रह गम्भीर रूपमा पीडित छैन — चुनौतीहरू प्रायः परिस्थितिजन्य हुन्, गहिरो जरा गाडेका होइनन्।" : "No planet is severely afflicted — challenges are likely situational rather than deep-seated.");
  challenges.push(ne ? "यिनलाई विकासका किनाराका रूपमा हेर्नुहोस् — धैर्य र सीप निर्माणले फल दिने क्षेत्र, स्थायी सीमा होइन।" : "Treat these as growth edges: areas that reward patience and skill-building, not fixed limitations.");
  sections.push(new Section("challenges", "Growth challenges", "चुनौती", challenges).withConf(chConf));

  // 6 — Career.
  const tenth = c.houseLord[10];
  const tl = ctx.p(tenth);
  const carBody = [ctx.signified(10, ne)];
  const m0 = ctx.maha();
  if (ne) {
    carBody.push(`तपाईंको करियरको दिशा, करियर हेर्ने ग्रह ${neName(tenth)} तपाईंको ${ordNe(tl.house)} भावमा जानुले तय गर्छ — त्यसैले सार्वजनिक काम ${head(R.HOUSE_THEME_NE[tl.house])} सँग मिसिन्छ।`);
    carBody.push("सूर्य र शनि मिलेर काममा अधिकार/चिनारी र अनुशासित मिहिनेतको सन्तुलन देखाउँछन्।");
    if (m0) carBody.push(`अहिले तपाईं ${neName(m0)} को मुख्य जीवन-कालखण्डमा हुनुहुन्छ, जसले हाल करियरलाई ${R.DASHA_THEME_NE[GI[m0]]} ले रङ्ग्याउँछ।`);
  } else {
    carBody.push(`Your career direction is set by the planet that rules your career area, ${en(tenth)}, moving into your ${ord(tl.house)} house — so your public work blends with ${head(R.HOUSE_THEME[tl.house])}.`);
    carBody.push("Sun and Saturn together describe the balance between authority/visibility and disciplined hard work in your working life.");
    if (m0) carBody.push(`You're currently in ${en(m0)}'s main life period, which right now colours your career with ${R.DASHA_THEME[GI[m0]]}.`);
  }
  sections.push(new Section("career", "Career & vocation", "पेशा / कर्म", carBody).withConf(ctx.houseConf(10)));

  // 7 — Finances.
  const finConf = ctx.houseConf(2);
  const fin2 = ctx.houseConf(11);
  for (const f of fin2.supports) finConf.support(f);
  for (const f of fin2.contradicts) finConf.against(f);
  const dhana = ctx.yogas.some((y) => y.key.includes("dhana"));
  if (dhana) finConf.support("Yoga: Dhana yoga present");
  const jup = ctx.p("jupiter");
  const finBody = [ctx.signified(2, ne), ctx.signified(11, ne)];
  if (ne) {
    finBody.push(`धन र समृद्धिसँग सम्बन्धित ग्रह बृहस्पति ${R.RASHI_NE[jup.sign]} राशिको ${ordNe(jup.house)} भावमा छ — यहाँ ${phraseNe(jup.dignity, "रहेको")}।`);
    if (dhana) finBody.push("धन-निर्माण गर्ने धन योगले नियमित कमाइ र बचतको बानीबाट संचयलाई सघाउँछ।");
    finBody.push("वित्त व्यवस्थित बचतमा राम्रो प्रतिक्रिया दिन्छ; कुण्डलीले प्रवृत्ति देखाउँछ, बानीले नतिजा तय गर्छ।");
  } else {
    finBody.push(`Jupiter, the planet naturally linked to wealth and good fortune, is in ${R.RASHI_EN[jup.sign]} (your ${ord(jup.house)} house) — ${phrase(jup.dignity, "placed")} there.`);
    if (dhana) finBody.push("A wealth-forming Dhana yoga supports accumulation through steady earning and saving habits.");
    finBody.push("Finances respond best to systematic saving; the chart describes tendencies, while habits decide outcomes.");
  }
  sections.push(new Section("finances", "Finances & wealth", "धन / वित्त", finBody).withConf(finConf));

  // 8 — Relationships.
  const relConf = ctx.houseConf(7);
  const venus = ctx.p("venus");
  if (score(venus.dignity) >= 1) relConf.support(`D1: Venus ${phrase(venus.dignity, "well placed")}`);
  else if (score(venus.dignity) <= -2) relConf.against("D1: Venus debilitated");
  const maleficOn7 = aspectsTo(c, 7).some(naturalMalefic);
  const relBody = [ctx.signified(7, ne)];
  if (ne) {
    relBody.push(`प्रेम र साझेदारीसँग सम्बन्धित ग्रह शुक्र ${R.RASHI_NE[venus.sign]} राशिको ${ordNe(venus.house)} भावमा छ — यहाँ ${phraseNe(venus.dignity, "रहेको")}। यसले तपाईंले नजिकको सम्बन्धमा के कुरालाई महत्व दिनुहुन्छ भन्ने देखाउँछ।`);
    if (maleficOn7) relBody.push("साझेदारी भावमाथि कठोर मानिने ग्रहको प्रभाव परेकाले सम्बन्ध केही परीक्षाबाट परिपक्व हुने सङ्केत हुन्छ — खुला सञ्चार र साझा मूल्यले बाटो सजिलो बनाउँछन्। यो एउटा प्रवृत्ति मात्र हो, निश्चित परिणाम होइन।");
  } else {
    relBody.push(`Venus, the planet linked to love and partnership, is in ${R.RASHI_EN[venus.sign]} (your ${ord(venus.house)} house) — ${phrase(venus.dignity, "placed")} there. It describes what you value and look for in closeness.`);
    if (maleficOn7) relBody.push("A challenging influence on the partnership house suggests relationships mature through some testing — open communication and shared values smooth the path. This is a tendency, not a fixed outcome.");
  }
  sections.push(new Section("relationships", "Relationships & partnership", "सम्बन्ध", relBody).withConf(relConf));

  // 9 — Family.
  sections.push(
    new Section("family", "Family & home", "परिवार", [
      ctx.signified(4, ne),
      ctx.signified(9, ne),
      ctx.signified(3, ne),
      ne ? "४ औं भावले माता र घर, ९ औं ले पिता र ज्येष्ठ, २ औं ले वृहत् परिवार, र ३ औं ले भाइबहिनी झल्काउँछ।" : "The 4th reflects mother and home, the 9th the father and elders, the 2nd the wider family, and the 3rd siblings.",
    ]).withConf(ctx.houseConf(4)),
  );

  // 10 — Health.
  const robust = score(ll.dignity) >= 1;
  const healthBody = ne
    ? [
        "ज्योतिषमा तपाईंको जीवनशक्ति लग्न (उदाउँदो राशि), यसको स्वामी ग्रह र चन्द्रबाट हेरिन्छ; ६ औं भावले रोग, निको हुने क्रम र दैनिक दिनचर्या देखाउँछ।",
        `तपाईंको लग्नको स्वामी ग्रह ${neName(lagnaLord)} (${ordNe(ll.house)} भावमा, यहाँ ${phraseNe(ll.dignity, "रहेको")}) ${robust ? "बलियो शरीर र छिटो निको हुनेलाई सघाउँछ।" : "सक्रिय आत्म-हेरचाह खोज्छ — नियमित निद्रा, चाल र तनाव व्यवस्थापनले ठूलो फाइदा दिन्छ।"}`,
        ctx.signified(6, true),
        "यो कुण्डलीका प्रवृत्तिबाट स्वास्थ्य मार्गदर्शन हो, चिकित्सा सल्लाह होइन; कुनै समस्यामा योग्य पेशेवरसँग सल्लाह लिनुहोस्।",
      ]
    : [
        "In Vedic astrology, your vitality is read from the rising sign, its ruling planet, and the Moon; the 6th house describes illness, recovery and daily routine.",
        `Your rising-sign ruler ${en(lagnaLord)} (in your ${ord(ll.house)} house, ${phrase(ll.dignity, "placed")} there) ${robust ? "supports a robust constitution and quick recovery." : "asks for proactive self-care — regular sleep, movement and stress management have outsized benefit."}`,
        ctx.signified(6, false),
        "This is wellbeing guidance from chart tendencies, not medical advice; consult a qualified professional for any concern.",
      ];
  sections.push(new Section("health_wellbeing", "Health & wellbeing", "स्वास्थ्य", healthBody).withConf(ctx.planetConf(lagnaLord)));

  // 11 — Spiritual growth.
  const ketu = ctx.p("ketu");
  const spBody = ne
    ? [
        ctx.signified(9, true),
        ctx.signified(12, true),
        `बृहस्पति ${ordNe(jup.house)} भावमा भएकाले ज्ञान, नैतिकता र गुरुत्व स्वाभाविक रूपमा विकास हुने ठाउँ देखाउँछ।`,
        `केतु ${ordNe(ketu.house)} भावमा (${R.RASHI_NE[ketu.sign]}) — जहाँ तपाईंले सहज दक्षता र वैराग्यको झुकाव बोक्नुहुन्छ।`,
      ]
    : [
        ctx.signified(9, false),
        ctx.signified(12, false),
        `Jupiter in house ${jup.house} points to where wisdom, ethics and mentorship naturally develop.`,
        `Ketu in house ${ketu.house} (${R.RASHI_EN[ketu.sign]}) shows where you carry instinctive mastery and a pull toward detachment.`,
      ];
  sections.push(new Section("spiritual_growth", "Spiritual growth", "आध्यात्मिक विकास", spBody).withConf(ctx.houseConf(9)));

  // 12 — Current life phase.
  let phaseConf = new Confidence();
  const phaseBody: string[] = [];
  if (d) {
    phaseConf = ctx.planetConf(d.mahaLord);
    const ml = ctx.p(d.mahaLord);
    const al = ctx.p(d.antarLord);
    const owns = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((h) => c.houseLord[h] === d.mahaLord);
    const firmGood = score(ml.dignity) >= 1 || strongStatus(ml.shadbalaStatus);
    if (ne) {
      phaseBody.push(`अहिले तपाईं ${neName(d.mahaLord)} को मुख्य जीवन-कालखण्ड (महादशा) मा हुनुहुन्छ (${date(d.mahaEnd, true)} सम्म); यसभित्रको हालको उप-कालखण्ड (अन्तर्दशा) ${neName(d.antarLord)} को हो, ${date(d.antarStart, true)} देखि ${date(d.antarEnd, true)} सम्म। यो समयले ${R.DASHA_THEME_NE[GI[d.mahaLord]]} मा जोड दिन्छ।`);
      const ownsTxt = owns.length ? ` र तपाईंको ${owns.map(ordNe).join(", ")} भावको स्वामी हो` : "";
      const firm = firmGood ? "नतिजा सजिलै आउने प्रवृत्ति हुन्छ" : "नतिजाले धैर्य र निरन्तर प्रयास माग्छ";
      phaseBody.push(`${neName(d.mahaLord)} तपाईंको ${ordNe(ml.house)} भावमा छ${ownsTxt}, त्यसैले अवधि ${head(R.HOUSE_THEME_NE[ml.house])} र यसले शासन गर्ने भावमा केन्द्रित हुन्छ। यो ${phraseNe(ml.dignity, "स्थित")} छ — ${firm}।`);
      if (d.antarLord !== d.mahaLord) phaseBody.push(`यसभित्रको ${neName(d.antarLord)} उप-कालखण्डले ${head(R.DASHA_THEME_NE[GI[d.antarLord]])} लाई थप तिखार्छ (यो तपाईंको ${ordNe(al.house)} भावसँग जोडिन्छ) — ${date(d.antarEnd, true)} सम्म।`);
    } else {
      phaseBody.push(`You're in ${en(d.mahaLord)}'s main life period (mahadasha) until ${fmtDate(d.mahaEnd)}, and the current sub-phase within it (antardasha) belongs to ${en(d.antarLord)}, from ${fmtDate(d.antarStart)} to ${fmtDate(d.antarEnd)}. This phase emphasises ${R.DASHA_THEME[GI[d.mahaLord]]}.`);
      const ownsTxt = owns.length ? ` and rules your ${owns.map(ord).join(", ")} house${owns.length > 1 ? "s" : ""}` : "";
      const firm = firmGood ? "These results tend to arrive readily" : "These results reward patience and steady effort";
      phaseBody.push(`${en(d.mahaLord)} sits in your ${ord(ml.house)} house${ownsTxt}, so the period concentrates on ${head(R.HOUSE_THEME[ml.house])} and the houses it rules. It is ${phrase(ml.dignity, "placed")} — ${firm}.`);
      if (d.antarLord !== d.mahaLord) phaseBody.push(`Within it, the ${en(d.antarLord)} sub-period sharpens the theme of ${head(R.DASHA_THEME[GI[d.antarLord]])} (linked to your ${ord(al.house)} house) until ${fmtDate(d.antarEnd)}.`);
    }
  } else {
    phaseBody.push(ne ? "हालको मितिका लागि दशा समय निकाल्न सकिएन।" : "Dasha timing could not be resolved for the current date.");
  }
  sections.push(new Section("current_life_phase", "Current life phase", "वर्तमान जीवन-कालखण्ड", phaseBody).withConf(phaseConf));

  // 12b — Life journey.
  const journey = lifeJourney(ctx);
  if (journey) sections.push(journey);

  // 13 — Dasha timeline.
  if (d) {
    const horizon = now + 420 * US_PER_DAY;
    const items: Json[] = [];
    for (const b of d.bhuktis) {
      if (b.end < now || b.start > horizon) continue;
      const lf = ctx.p(b.lord);
      const running = b.start <= now && now < b.end;
      if (ne) items.push(item(`${neName(b.lord)} उप-कालखण्ड${running ? " · अहिले चलिरहेको" : ""}`, ctx.planetConf(b.lord).level(), `${date(b.start, true)} → ${date(b.end, true)}: ${head(R.DASHA_THEME_NE[GI[b.lord]])} — तपाईंको ${ordNe(lf.house)} भावसँग जोडिन्छ।`));
      else items.push(item(`${en(b.lord)} sub-period${running ? " · running now" : ""}`, ctx.planetConf(b.lord).level(), `${fmtDate(b.start)} → ${fmtDate(b.end)}: ${head(R.DASHA_THEME[GI[b.lord]])} — linked to your ${ord(lf.house)} house.`));
    }
    for (const m of d.upcoming) {
      const lord = m.lord as GrahaKey;
      const years = VIM_YEARS[lord];
      if (ne) items.push(item(`${neName(lord)} जीवन-कालखण्ड (अर्को प्रमुख कालखण्ड)`, "moderate", `${date(m.start, true)} देखि सुरु भई ${date(m.end, true)} सम्म (${years} वर्ष): ${head(R.DASHA_THEME_NE[GI[lord]])} को अध्याय।`));
      else items.push(item(`${en(lord)} life period (next major chapter)`, "moderate", `Begins ${fmtDate(m.start)}, lasting to ${fmtDate(m.end)} (${years} yrs): a ${head(R.DASHA_THEME[GI[lord]])} chapter.`));
    }
    const body = ne
      ? `अहिले चलिरहेको ${neName(d.mahaLord)} जीवन-कालखण्डभित्रका उप-कालखण्डहरूको तालिका, अनि पछि आउने ठूला जीवन-कालखण्डहरू — तपाईंको समयको सबैभन्दा सूक्ष्म तह।`
      : `The schedule of sub-periods inside your current ${en(d.mahaLord)} life period, and the big life periods that follow — the most precise timing layer of your chart.`;
    sections.push(new Section("dasha_timeline", "Life-period timeline (with dates)", "जीवन-कालखण्ड तालिका", [body]).withItems(items));
  }

  // 14 — 12-month outlook.
  const outlook: string[] = [];
  if (d) {
    const yearEnd = now + 365 * US_PER_DAY;
    const upcoming = d.bhuktis.filter((b) => b.start > now && b.start <= yearEnd);
    const lead = d.antarLord;
    const lf = ctx.p(lead);
    const good = score(lf.dignity) >= 1 || strongStatus(lf.shadbalaStatus);
    const nxt = upcoming[0];
    if (ne) {
      outlook.push(`आगामी वर्षको नेतृत्व ${neName(lead)} को उप-कालखण्डले गर्छ (${date(d.antarEnd, true)} सम्म), ${R.DASHA_THEME_NE[GI[lead]]} लाई अगाडि ल्याउँदै।`);
      outlook.push(good ? `यो राम्रोसँग स्थित छ (तपाईंको ${ordNe(lf.house)} भावमा), त्यसैले यसका क्षेत्रका पहल अनुकूल छन् — अगाडि बढ्ने राम्रो अवसर।` : `यो केही दबाबमा छ (तपाईंको ${ordNe(lf.house)} भावमा), त्यसैले प्रयासलाई गति दिनुहोस् र नतिजा जबरजस्ती नगरी तयारी गर्नुहोस्।`);
      if (nxt) outlook.push(`आउने परिवर्तन: ${neName(nxt.lord)} को उप-कालखण्ड ${date(nxt.start, true)} मा सुरु हुन्छ, ${head(R.DASHA_THEME_NE[GI[nxt.lord]])} लाई अगाडि ल्याउँदै।`);
    } else {
      outlook.push(`The year ahead is led by ${en(lead)}'s sub-period (through ${fmtDate(d.antarEnd)}), bringing ${R.DASHA_THEME[GI[lead]]} to the fore.`);
      outlook.push(good ? `It is well placed (in your ${ord(lf.house)} house), so initiatives in its areas are favoured — a good window to push forward.` : `It is under some pressure (in your ${ord(lf.house)} house), so pace efforts and prepare rather than force outcomes in its areas.`);
      if (nxt) outlook.push(`A shift to come: the ${en(nxt.lord)} sub-period opens ${fmtDate(nxt.start)}, bringing ${head(R.DASHA_THEME[GI[nxt.lord]])} to the foreground.`);
    }
  } else {
    outlook.push(ne ? "सटीक दशा-आधारित दृष्टिकोणका लागि आजको मितिको स्पष्ट तालिका आवश्यक छ।" : "A precise dasha-based outlook needs a resolvable timeline for today's date.");
  }
  sections.push(new Section("outlook_12_months", "Outlook — next 12 months", "आगामी १२ महिना", outlook).withConf(phaseConf));

  // 14b — What to pursue & when.
  sections.push(pursue(ctx));

  // Opportunities: `TRIKONA | {11}` iterates 1, 11, 5, 9.
  const opp: string[] = [];
  for (const h of [1, 11, 5, 9]) {
    const level = ctx.houseConf(h).level();
    if (level === "strong" || level === "moderate") opp.push(ne ? `${ordNe(h)} भाव (${head(R.HOUSE_THEME_NE[h])}) राम्रोसँग समर्थित छ — ऊर्जा लगाउने स्वाभाविक क्षेत्र।` : `The ${ord(h)} house (${head(R.HOUSE_THEME[h])}) is well supported — a natural area to invest energy.`);
  }
  for (const y of ctx.yogas.filter((x) => x.polarity === "benefic")) opp.push(ne ? `${y.nameNe}: ${y.textNe}` : `${y.name}: ${y.text}`);
  if (!opp.length) opp.push(ne ? "अवसर क्रमशः निर्माण हुन्छन्; आफ्नो बलियो ग्रहको क्षेत्रमा निरन्तरताले राम्रो प्रतिफल दिन्छ।" : "Opportunities are built incrementally here; consistency in your strongest planet's domain compounds well.");
  sections.push(new Section("opportunities", "Opportunities", "अवसर", opp));

  // Cautions: `DUSTHANA` iterates 8, 12, 6.
  const caut: string[] = [];
  for (const h of [8, 12, 6]) {
    const hc = ctx.houseConf(h);
    if (hc.level() === "mixed" || hc.contradicts.length) caut.push(ne ? `${head(R.HOUSE_THEME_NE[h])} (${ordNe(h)} भाव) मा स्थिर हात राख्नुहोस् — बल प्रयोग नगरी व्यवस्थापन गर्नुहोस्।` : `Keep a steady hand with ${head(R.HOUSE_THEME[h])} (the ${ord(h)} house) — manage rather than force.`);
  }
  for (const y of ctx.yogas.filter((x) => x.polarity === "caution")) caut.push(ne ? `${y.nameNe}: ${y.textNe}` : `${y.name}: ${y.text}`);
  caut.push(ne ? "यीमध्ये कुनै पनि दुर्भाग्यको भविष्यवाणी होइनन् — सचेतना र संयमले प्रगति जोगाउने क्षेत्रहरू हुन्।" : "None of these are predictions of misfortune — they are areas where awareness and moderation protect your progress.");
  sections.push(new Section("cautions", "Areas for caution", "सावधानी", caut));

  // 16 — Practical recommendations.
  const [strong, weak] = [ctx.strongest(), ctx.weakest()];
  const rec = ne
    ? [
        `तपाईंको बलियो पक्ष — ${plain(strong, true)} — मा ध्यान दिनुहोस्; यहाँ प्रगति सबैभन्दा सजिलो हुन्छ।`,
        `कमजोर पक्ष — ${plain(weak, true)} — लाई छोड्ने होइन, बरु साना नियमित बानीबाट बिस्तारै बलियो बनाउनुहोस्; पूरै तयार भएको महसुस नभएसम्म नपर्खनुहोस्।`,
        "ठूला निर्णय माथि देखाइएका अनुकूल समयमा गर्नुहोस्, ताकि समय तपाईंको साथमा हुँदा काम अघि बढोस्।",
        "तल दिइएका हरेक प्राथमिकताका लागि एउटा सानो बानी छान्नुहोस् र अर्को तीन महिना निरन्तर पछ्याउनुहोस्।",
      ]
    : [
        `Play to your strengths — ${plain(strong, false)}. This is where progress comes easiest for you.`,
        `Don't avoid your weaker side — ${plain(weak, false)}. Build it up slowly with small, regular habits instead of waiting until you feel ready.`,
        "Save big decisions for the good times highlighted above, so you act when the timing is on your side.",
        "Pick one small habit for each priority below and stick with it for the next three months.",
      ];
  sections.push(new Section("practical_recommendations", "Practical recommendations", "व्यावहारिक सुझाव", rec));

  // 17 — Traditional practices (optional).
  const practices = ne
    ? [
        "यी पारम्परिक, आस्थामा आधारित उपाय वैकल्पिक सहयोगका रूपमा दिइएका हुन् — सांस्कृतिक अभ्यास, अनिवार्यता वा ग्यारेन्टी होइन।",
        `${neName(weak)} का विषय बलियो बनाउन शास्त्रले यसको वारको व्रत, ${neName(weak)} सँग सम्बन्धित दान, र त्यस क्षेत्रमा शान्त, आदरपूर्ण आचरण सुझाउँछ।`,
        `${neName(strong)} का विषयमा कृतज्ञताको अभ्यासले भएको बललाई अझ राम्ररी प्रयोग गर्न सघाउँछ।`,
        "सबैभन्दा माथि, नैतिक आचरण (सदाचार) र स्थिरता हरेक परम्पराले मान्ने उपाय हुन्।",
      ]
    : [
        "These are traditional, faith-based remedies offered as optional support — they are cultural practices, not requirements or guarantees.",
        `For strengthening ${en(weak)} themes, classical texts suggest its weekday observance, charity associated with ${en(weak)}, and respectful, calm conduct in that life area.`,
        `Gratitude practices around ${en(strong)} themes help you make the most of an existing strength.`,
        "Above all, ethical action (sadachara) and steadiness are the remedies every tradition agrees on.",
      ];

  const practicesSection = new Section("spiritual_practices", "Traditional spiritual practices (optional)", "पारम्परिक उपाय (वैकल्पिक)", practices);
  practicesSection.optional = true;
  sections.push(practicesSection);

  // 18 — Planet by planet.
  const planetItems = ALL_GRAHAS.map((g) => {
    const conf = ctx.planetConf(g);
    const status = ctx.p(g).shadbalaStatus;
    return ne
      ? itemFactors(neName(g), conf.level(), conf.factors(), `${ctx.planetLine(g)} यसले जीवनमा ${R.KARAKA_NE[GI[g]]} लाई प्रतिनिधित्व गर्छ।${status ? ` यसको समग्र बल ${statusNe(status)} छ।` : ""}`)
      : itemFactors(`${en(g)} (${neName(g)})`, conf.level(), conf.factors(), `${ctx.planetLine(g)} In life it stands for ${R.KARAKA[GI[g]]}.${status ? ` Its overall strength is ${status.toLowerCase()}.` : ""}`);
  });
  sections.push(new Section("planet_by_planet", "Planet by planet", "ग्रह विश्लेषण", []).withItems(planetItems));

  // 19 — House by house.
  const houseItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
    const conf = ctx.houseConf(h);
    const label = ne ? `${capitalize(head(R.HOUSE_THEME_NE[h]))} (${ordNe(h)} भाव)` : `${capitalize(head(R.HOUSE_THEME[h]))} (house ${h})`;
    return itemFactors(label, conf.level(), conf.factors(), ctx.signified(h, ne));
  });
  sections.push(new Section("house_by_house", "House by house", "भाव विश्लेषण", []).withItems(houseItems));

  // 20 — Divisional charts.
  const divBody = ne
    ? "वर्ग (D) चक्रहरू जन्मकुण्डलीको हरेक राशिलाई सूक्ष्म भागमा बाँडेर बनाइन्छन्, र प्रत्येकले जीवनको एउटा निश्चित क्षेत्रलाई नजिकबाट हेर्छ। तल प्रत्येक प्रमुख वर्ग चक्रले केका लागि पढिन्छ र यस कुण्डलीमा त्यो क्षेत्र कति बलियो देखिन्छ भन्ने संक्षिप्त पढाइ दिइएको छ।"
    : "Divisional (varga) charts subdivide each rashi of the birth chart into finer parts, and each one zooms in on a specific area of life. Below is a short reading of what every major D-chart is read for and how strong that area looks in this chart.";
  sections.push(new Section("divisional_charts", "Divisional charts (D-charts) summary", "वर्ग चक्र (D-चार्ट) सारांश", [divBody]).withItems(VARGA_DOMAIN.map((v) => divisionalItem(ctx, v))));

  // 21 — Yogas.
  if (!ctx.yogas.length) {
    sections.push(new Section("yoga_explanations", "Yogas in your chart", "योग", [ne ? "तपाईंको कुण्डलीमा छानिएका मुख्य शास्त्रीय योगमध्ये कुनै सक्रिय छैन; कुण्डली माथिका ग्रह र भाव स्थितिबाट पढिन्छ।" : "No major classical yoga from the curated set is active; the chart reads through planet and house placements above."]));
  } else {
    const body = ne
      ? "योग भनेको ग्रहहरूको विशेष संयोजन हो जसले जीवनमा निश्चित प्रवृत्ति ल्याउँछ। तल तपाईंको कुण्डलीमा बनेका योग, तिनमा संलग्न ग्रहको बल, र हालको दशाले तिनलाई सक्रिय गरेको छ कि छैन भन्ने सहित दिइएको छ।"
      : "A yoga is a specific planetary combination that inclines the chart toward a particular tendency. Below are the yogas formed in your chart, with the strength of the planets involved and whether the running dasha is activating them.";
    sections.push(new Section("yoga_explanations", "Yogas in your chart", "योग", [body]).withItems(ctx.yogas.map((y) => yogaItem(ctx, y))));
  }

  // 22 — Action plan.
  const plan = ne
    ? [
        `१. तपाईं स्वाभाविक रूपमा राम्रो भएको कुरा — ${plain(strong, true)} — मा आधार बनाउनुहोस्। यसले सबैभन्दा छिटो नतिजा दिन्छ।`,
        `२. कमजोर पक्ष — ${plain(weak, true)} — लाई सरल साप्ताहिक दिनचर्यामा ढाल्नुहोस्, ताकि यसले तपाईंलाई रोक्न छाडोस्।`,
      ]
    : [
        `1. Build on what you're naturally good at — ${plain(strong, false)}. This gives you the fastest results.`,
        `2. Turn your weaker side — ${plain(weak, false)} — into a simple weekly routine so it stops holding you back.`,
      ];
  const mm = ctx.maha();
  plan.push(
    ne
      ? mm ? `३. अहिले तपाईंको जीवनमा ${plain(mm, true)} लाई साथ दिने समय चलिरहेको छ — ठूला कदम यसै बेला चाल्नुहोस्।` : "३. ठूला कदम माथि देखाइएका अनुकूल समयमा चाल्नुहोस्।"
      : mm ? `3. You're currently in a life phase that favours ${plain(mm, false)} — use this time for your bigger moves.` : "3. Time your bigger moves for the good periods highlighted above.",
  );
  if (ne) {
    plan.push("४. करियर र प्रतिष्ठाका लागि निरन्तर, अरूले देख्ने गरी काम गर्दै रहनुहोस्।");
    plan.push("५. इमानदार र स्थिर दैनिक दिनचर्या कायम राख्नुहोस् — यसैले जीवनको हरेक पक्ष चुपचाप बलियो बनाउँछ।");
  } else {
    plan.push("4. For your career and reputation, keep showing up with steady, visible work.");
    plan.push("5. Keep an honest, steady daily routine — it's the one thing that quietly strengthens every part of your life.");
  }
  sections.push(new Section("action_plan", "Top 5 priorities", "मुख्य ५ प्राथमिकता", plan));
  return sections;
}

/** `iter_report`: the meta record, one record per section, then `done`. */
export function iterReport(chart: Chart, catalog: YogaRow[], nowUs: number, lang: string): Json[] {
  const ne = !lang.startsWith("en");
  const ctx = new Ctx(chart, catalog.filter((y) => y.present), nowUs, ne);
  const records: Json[] = [{ kind: "meta", ...meta(ctx) }];
  const sections = buildSections(ctx);
  sections.forEach((sec, i) => records.push({ kind: "section", index: i, total: sections.length, ...sec.toMap(ne) }));
  records.push({ kind: "done", total: sections.length });
  return records;
}

