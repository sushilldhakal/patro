// The response half of the era middleware (`patro::era`): era labels beside every Julian Day, the
// `date_parts` of the payload, and the BS/AD dates aligned to them.
import { bsDateOf, civilFromJdn } from "../../astronomy/lunar-month";
import type { Json } from "./blocks";

const JD_KEYS = new Set(["jd_ut", "julian", "julian_start", "julian_end", "jd"]);
const isJdKey = (k: string) => JD_KEYS.has(k) || k.endsWith("_jd");
const p2 = (n: number) => String(n).padStart(2, "0");

interface Labels {
  jdn: number;
  month: number;
  day: number;
  gregorian: [string, number];
  vikram: [string, number, number, number];
}
function fromJd(jd: number): Labels | null {
  const jdn = Math.floor(jd + 0.5);
  const c = civilFromJdn(jdn);
  const bs = bsDateOf(jdn);
  if (!bs) return null;
  return {
    jdn,
    month: c.month,
    day: c.day,
    gregorian: c.year >= 1 ? ["ad", c.year] : ["bc", 1 - c.year],
    vikram: bs.year >= 1 ? ["bs", bs.year, bs.month, bs.day] : ["bbs", -bs.year, bs.month, bs.day],
  };
}
function labelFor(jd: number, era: string): string | null {
  const l = fromJd(jd);
  if (!l) return null;
  if (era === "ad" || era === "bc") return l.gregorian[0] === "bc" ? `${l.gregorian[1]} BC` : `${String(l.gregorian[1]).padStart(4, "0")}-${p2(l.month)}-${p2(l.day)}`;
  return `${l.vikram[1]}-${p2(l.vikram[2])}-${p2(l.vikram[3])}`;
}
function dateParts(jd: number, era: string): Json | null {
  const l = fromJd(jd);
  if (!l) return null;
  const vikram = { era: l.vikram[0], year: l.vikram[1], month: l.vikram[2], day: l.vikram[3] };
  const gregorian = { era: l.gregorian[0], year: l.gregorian[1], month: l.month, day: l.day };
  const shown = era === "ad" || era === "bc" ? gregorian : vikram;
  return { jd: l.jdn - 0.5, era: shown.era, year: shown.year, month: shown.month, day: shown.day, vikram, gregorian };
}

function render(node: unknown, era: string, top: boolean): unknown {
  if (Array.isArray(node)) return node.map((v) => render(v, era, false));
  if (!node || typeof node !== "object") return node;
  const map = node as Json;
  const out: Json = {};
  for (const [key, value] of Object.entries(map)) {
    out[key] = render(value, era, false);
    if (typeof value !== "number" || !isJdKey(key)) continue;
    const labelKey = key === "jd_ut" || key === "julian" || key === "jd" ? "date" : `${key}_date`;
    if (!(labelKey in map)) {
      const label = labelFor(value, era);
      if (label !== null) out[labelKey] = label;
    }
    if (top && (key === "jd_ut" || key === "julian" || key === "jd") && !("date_parts" in map)) {
      const parts = dateParts(value, era);
      if (parts) out.date_parts = parts;
    }
  }
  return out;
}

function align(node: unknown): void {
  if (Array.isArray(node)) return node.forEach(align);
  if (!node || typeof node !== "object") return;
  const map = node as Json;
  const parts = map.date_parts as Json | undefined;
  if (parts) {
    const v = parts.vikram as Json;
    if (typeof v.year === "number") {
      map.date_bs = `${v.year}-${p2(v.month as number)}-${p2(v.day as number)}`;
      const set = (bs: unknown) => {
        if (bs && typeof bs === "object") Object.assign(bs, { year: v.year, month: v.month, day: v.day });
      };
      set(map.bs_date);
      set((map.detail as Json | undefined)?.bs_date);
    }
    const g = parts.gregorian as Json;
    if (typeof g.year === "number") {
      const ad = `${g.year}-${p2(g.month as number)}-${p2(g.day as number)}`;
      map.date_ad = ad;
      const detail = map.detail as Json | undefined;
      if (detail && typeof detail === "object") {
        detail.date_ad = ad;
        detail.date = ad;
      }
    }
  }
  for (const v of Object.values(map)) align(v);
}

/** The rendered body for a request that named `era` (and maybe `language`). */
export function renderForEra(payload: Json, era: string, language: string): Json {
  const out = render(payload, era, true) as Json;
  align(out);
  if (!("era" in out)) out.era = era;
  if (!("language" in out)) out.language = language;
  return out;
}

/** `render_part`: a part of a payload below its top level, with the labels and alignment but no `date_parts`, `era` or `language`. */
export function renderPartForEra(part: Json, era: string): Json {
  const out = render(part, era, false) as Json;
  align(out);
  return out;
}

/** `era_language`: Nepali for the Vikram eras, English for the Gregorian. */
export const eraLanguage = (era: string) => (era === "bs" || era === "bbs" ? "ne" : "en");
