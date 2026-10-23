import { adToBS, AD_MONTH_NAMES_NE, AD_MONTHS_SHORT, BS_MONTH_NAMES, BS_MONTHS_NE } from "../calendar/bs-calendar";
import { getCalendarSystem, type CalendarSystem } from "../calendar/calendar-system";
import { GRAHA_NAME, type GrahaKey } from "../jyotish/graha-details";
import { formatRashiDisplay, getRashiName, rashiNeFromNumber } from "./rashi-i18n";
import { NAKSHATRA_ICONS } from "./nakshatra-icons";
import { formatLocaleDigits } from "../locale";
import { normalizeLang, pickLocale } from "../locale";
import { formatCivilIsoParts, parseCivilIso, parseCivilIsoToDate, positiveGregorianCivilIso } from "../calendar/patro-day";
import { formatGregorianFromDateParts } from "../calendar/patro-headline-subtitle";

export function toNepaliDigits(value: string | number, lang?: string): string {
  return formatLocaleDigits(value, lang);
}

export function formatTimeShort(time?: string | null): string | undefined {
  if (!time) return undefined;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const h = match[1]!.padStart(2, "0");
  const m = match[2]!;
  return `${h}:${m}`;
}

/** Clock time with Nepali digits (e.g. ०७:३२). */
export function formatClockNepali(time?: string | null, lang?: string): string | undefined {
  if (!time) return undefined;
  const short = formatTimeShort(time) ?? time;
  return toNepaliDigits(short, lang);
}

export type AyanaMark = "उ" | "द";

/** Short ayana badge — उ/द in Nepali, N/S (Uttarayana/Dakshinayana) in English. */
export function formatAyanaMarkShort(
  mark: AyanaMark | undefined,
  lang?: string,
): string | undefined {
  if (!mark) return undefined;
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  if (mark === "उ") return isEn ? "N" : "उ";
  if (mark === "द") return isEn ? "S" : "द";
  return mark;
}

export function isAyanaNorthMark(mark: AyanaMark | undefined): boolean {
  return mark === "उ";
}

/** Infer उ/द from an ayana name ("Uttarayana", "उत्तरायण", …). */
export function ayanaMarkFromName(name?: string | null): AyanaMark | undefined {
  if (!name) return undefined;
  const n = name.trim();
  if (/^उ$|uttarayan|उत्तरायण/i.test(n)) return "उ";
  if (/^द$|dakshinayan|dakṣiṇāyan|दक्षिणाय/i.test(n)) return "द";
  return undefined;
}

export function formatGhatiEnd(clock?: string | null): string | undefined {
  if (!clock) return undefined;
  const parts = clock.split(":").map(Number);
  const ghati = parts[0];
  const pala = parts[1];
  if (ghati == null || pala == null) return undefined;
  const totalMinutes = ghati * 24 + pala;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export type AngaDetail = {
  name_ne?: string;
  name?: string;
  end_ghati_clock?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  next?: { name_ne?: string; name?: string; end_ghati_clock?: string; end_local_time?: string };
};

export function formatAngaTransition(
  anga?: AngaDetail | null,
  lang?: string,
): string | undefined {
  if (!anga) return undefined;
  const isEn = normalizeLang(lang) === "en";
  const current = pickLocale(lang, anga.name_ne ?? anga.name, anga.name ?? anga.name_ne);
  if (!current) return undefined;

  const endTime =
    formatTimeShort(anga.end_local_time) ??
    formatTimeShort(anga.end_hours_clock) ??
    formatGhatiEnd(anga.end_ghati_clock);

  const next = pickLocale(
    lang,
    anga.next?.name_ne ?? anga.next?.name,
    anga.next?.name ?? anga.next?.name_ne,
  );
  if (!next) return current;
  if (!endTime) {
    return isEn ? `${current}, then ${next}` : `${current}, पछि ${next}`;
  }

  const nextEnd =
    formatTimeShort(anga.next?.end_local_time) ??
    formatGhatiEnd(anga.next?.end_ghati_clock);
  const endDisp = formatLocaleDigits(endTime, lang);
  const nextEndDisp = nextEnd ? formatLocaleDigits(nextEnd, lang) : undefined;

  if (nextEndDisp) {
    return isEn
      ? `${current}, after ${endDisp} ${next}, then ${nextEndDisp} onwards`
      : `${current}, ${endDisp} बजेपछि ${next}, ${nextEndDisp} बजेउप्रान्त गर`;
  }
  return isEn
    ? `${current}, after ${endDisp} ${next}`
    : `${current}, ${endDisp} बजेपछि ${next}`;
}

type AngaPatro = {
  name_ne?: string;
  name?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
  next?: AngaPatro;
};

function angaEndsNextDay(anga: AngaPatro): boolean {
  if (anga.end_hours_clock) {
    const h = Number(anga.end_hours_clock.split(":")[0]);
    if (!Number.isNaN(h) && h >= 24) return true;
  }
  if (anga.end_ghati_clock) {
    const gh = Number(anga.end_ghati_clock.split(":")[0]);
    if (!Number.isNaN(gh) && gh >= 60) return true;
  }
  const end =
    formatTimeShort(anga.end_local_time) ??
    formatTimeShort(anga.end_hours_clock);
  if (end) {
    const h = Number(end.split(":")[0]);
    if (!Number.isNaN(h) && h < 5) return true;
  }
  return false;
}

type AngaEndLike = {
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
};

/** Hours from sunrise to an anga's end (end_hours_clock is measured from sunrise;
 * end_ghati_clock is ghati/pala from sunrise, 60 ghati = 24 h). */
function angaHoursFromSunrise(anga: AngaEndLike): number | undefined {
  if (anga.end_hours_clock) {
    const [h, m] = anga.end_hours_clock.split(":").map((x) => Number(x));
    if (!Number.isNaN(h)) return h + (Number.isNaN(m) ? 0 : m) / 60;
  }
  if (anga.end_ghati_clock) {
    const [g, pa] = anga.end_ghati_clock.split(":").map((x) => Number(x));
    if (!Number.isNaN(g)) return ((g + (Number.isNaN(pa) ? 0 : pa) / 60) * 24) / 60;
  }
  return undefined;
}

/**
 * Calendar days from the panchanga date to an anga's end (0 = today, 1 = भोलि,
 * 2 = पर्सि). The wall-clock date rolls at midnight, not sunrise — so add the
 * hours-from-sunrise to the sunrise clock time and count 24-hour crossings.
 */
export function angaEndDayOffset(
  anga: AngaEndLike | undefined | null,
  sunriseHours?: number,
): number {
  if (!anga || sunriseHours == null) return 0;
  const endH = angaHoursFromSunrise(anga);
  if (endH == null) return 0;
  return Math.max(0, Math.floor((sunriseHours + endH) / 24));
}

/** भोलि / पर्सि / +N दिन for a day offset (empty string for today). */
export function dayOffsetLabel(offset: number, lang?: string): string {
  if (offset <= 0) return "";
  const isEn = normalizeLang(lang) === "en";
  if (offset === 1) return isEn ? "tomorrow" : "भोलि";
  if (offset === 2) return isEn ? "day after" : "पर्सि";
  return isEn ? `+${offset}d` : `+${toNepaliDigits(offset)} दिन`;
}

/**
 * An anga's end clock (HH:MM, Devanagari digits) from whichever end field the
 * payload carries: local time, hours from sunrise, or ghati.
 */
export function angaEndClock(anga?: AngaEndLike | null): string | undefined {
  if (!anga) return undefined;
  const t =
    formatTimeShort(anga.end_local_time) ??
    formatTimeShort(anga.end_hours_clock) ??
    formatGhatiEnd(anga.end_ghati_clock);
  return t ? toNepaliDigits(t) : undefined;
}

/** End time with a भोलि / पर्सि prefix when the transition falls on a later day. */
export function angaEndWithDay(
  anga: AngaEndLike | null | undefined,
  originHours: number | undefined,
  lang: string,
): string | undefined {
  const time = angaEndClock(anga);
  if (!time) return undefined;
  const label = dayOffsetLabel(angaEndDayOffset(anga, originHours), lang);
  return label ? `${label} ${time}` : time;
}

function patroAngaEndClockLocalized(anga: AngaPatro, lang?: string): string | undefined {
  const t =
    formatTimeShort(anga.end_local_time) ??
    formatTimeShort(anga.end_hours_clock) ??
    formatGhatiEnd(anga.end_ghati_clock);
  if (!t) return undefined;
  const [hh, mm] = t.split(":");
  if (!hh || !mm) return formatLocaleDigits(t, lang);
  return formatLocaleDigits(`${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`, lang);
}

/** Patro sidebar — शुक्ल त्रयोदशी•००:४३ बाट शुक्ल चतुर्दशी(अर्को दिन) */
export function formatAngaPatroChain(
  anga?: AngaPatro | null,
  lang?: string,
): string | undefined {
  if (!anga) return undefined;
  const isEn = normalizeLang(lang) === "en";
  const first = pickLocale(lang, anga.name_ne ?? anga.name, anga.name ?? anga.name_ne);
  if (!first) return undefined;
  let result = first;
  let node: AngaPatro | undefined = anga;
  while (node?.next) {
    const end = patroAngaEndClockLocalized(node, lang);
    const nextNode: AngaPatro = node.next;
    const nextName =
      pickLocale(lang, nextNode.name_ne ?? nextNode.name, nextNode.name ?? nextNode.name_ne) ?? "";
    if (!end || !nextName) break;
    const isLast = !nextNode.next;
    const dayNote =
      isLast && angaEndsNextDay(node) ? (isEn ? " (next day)" : "(अर्को दिन)") : "";
    result += isEn ? `•from ${end} ${nextName}${dayNote}` : `•${end} बाट ${nextName}${dayNote}`;
    node = nextNode;
  }
  return result;
}

/** Transition tail only — •००:४३ बाट शुक्ल चतुर्दशी(अर्को दिन) */
export function formatAngaPatroTransitionHint(
  anga?: AngaPatro | null,
  lang?: string,
): string | undefined {
  const full = formatAngaPatroChain(anga, lang);
  const name = pickLocale(lang, anga?.name_ne ?? anga?.name, anga?.name ?? anga?.name_ne);
  if (!full || !name || full === name) return undefined;
  if (full.startsWith(name)) return full.slice(name.length);
  return full;
}

export function formatPatroBelaantar(c?: SolarCorrection): string | undefined {
  return formatPatroSignedCorrection(c);
}

/** Patro label देशान्तर — longitude correction from the zone meridian. */
export function formatPatroDeshaantar(c?: SolarCorrection): string | undefined {
  return formatPatroSignedCorrection(c);
}

type SolarCorrection = {
  minutes?: number;
  seconds?: number;
  minutes_total?: number;
  sign?: "dhan" | "rin";
  sign_ne?: string;
  name_ne?: string;
  label_ne?: string;
};

export type SolarCorrections = {
  belaantar?: SolarCorrection;
  deshaantar?: SolarCorrection;
  akshamsha?: SolarCorrection;
  ishtakaal_note_ne?: string;
  ishtakaal_note_en?: string;
  sunrise_includes_corrections?: boolean;
};

/** Patro aside ±MM:SS from a solar correction block (धन/ऋण). */
export function formatPatroSignedCorrection(c?: SolarCorrection): string | undefined {
  if (!c) return undefined;
  let minutes = c.minutes;
  let seconds = c.seconds;
  if ((minutes == null || seconds == null) && c.minutes_total != null) {
    const abs = Math.abs(c.minutes_total);
    minutes = Math.floor(abs);
    seconds = Math.round((abs - minutes) * 60);
    if (seconds >= 60) {
      seconds -= 60;
      minutes = (minutes ?? 0) + 1;
    }
  }
  if (minutes == null || seconds == null) return undefined;
  const sign = c.sign ?? (c.minutes_total != null && c.minutes_total < 0 ? "rin" : "dhan");
  const mm = toNepaliDigits(minutes);
  const ss = toNepaliDigits(String(seconds).padStart(2, "0"));
  const prefix = sign === "rin" ? "-" : "+";
  return `${prefix}${mm}:${ss}`;
}

/** Signed minutes — धन (+) / ऋण (−) per Surya Panchanga convention. */
export function signedSolarCorrectionMinutes(c?: SolarCorrection): number {
  if (!c || c.minutes == null) return 0;
  const total = c.minutes + (c.seconds ?? 0) / 60;
  return c.sign === "rin" ? -total : total;
}

export function totalSolarCorrectionMinutes(solar?: SolarCorrections): number {
  if (!solar) return 0;
  return (
    signedSolarCorrectionMinutes(solar.belaantar) +
    signedSolarCorrectionMinutes(solar.deshaantar)
  );
}

export type RituBlock = { name?: string; name_ne?: string; season?: string };

/** Sanskrit ritu name → English season (month calendar exposes ritu as a plain string). */
export const RITU_NAME_TO_SEASON: Record<string, string> = {
  Vasanta: "Spring",
  Grishma: "Summer",
  Varsha: "Monsoon",
  Sharad: "Autumn",
  Hemanta: "Pre-winter",
  Shishira: "Winter",
};
export type AayanBlock = { name?: string; name_ne?: string };
export type DurationBlock = {
  label_en?: string;
  label_ne?: string;
  label_en_full?: string;
  label_ne_full?: string;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

export function formatRituLabel(
  ritu: RituBlock | undefined,
  lang: "ne" | "en" | "hi",
): string | undefined {
  if (!ritu) return undefined;
  const name = pickLocale(lang, ritu.name_ne ?? ritu.name ?? "", ritu.name ?? ritu.name_ne ?? "");
  // English leads with the season the reader knows and keeps the Sanskrit name
  // as the gloss — "Summer (Grishma)", not "Grishma (Summer)".
  if (lang === "en" && ritu.season) return `${ritu.season} (${name})`;
  return name;
}

/** English gloss for the sun's half-year course, keyed by its Sanskrit name. */
const AAYAN_EN: Record<string, string> = {
  Uttarayana: "Northern course",
  Uttarayan: "Northern course",
  Dakshinayana: "Southern course",
  Dakshinayan: "Southern course",
};

export function formatAayanLabel(
  aayan: AayanBlock | undefined,
  lang: "ne" | "en" | "hi",
): string | undefined {
  if (!aayan) return undefined;
  const name = pickLocale(lang, aayan.name_ne ?? aayan.name ?? "", aayan.name ?? aayan.name_ne ?? "");
  if (lang !== "en") return name;
  const gloss = AAYAN_EN[name];
  return gloss ? `${gloss} (${name})` : name;
}

export function formatSolarCorrectionDisplay(
  c?: SolarCorrection,
  lang?: string,
): string | undefined {
  if (!c || c.minutes == null || c.seconds == null) return undefined;
  const prefix = c.sign === "rin" ? "-" : "+";
  const ss = String(c.seconds).padStart(2, "0");
  if (normalizeLang(lang) === "en") {
    return `${prefix}${c.minutes} min ${ss} sec`;
  }
  const body = `${prefix}${c.minutes} मि ${ss} से`;
  const signNe = c.sign_ne ? ` (${c.sign_ne})` : "";
  return `${toNepaliDigits(body)}${signNe}`;
}

export type MoonTimeBlock = { local?: string; local_time_short?: string };

export function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}


export function offsetBsIsoByCivilDayDelta(bsIso: string, delta: number): string | undefined {
  if (delta === 0) return bsIso;
  const { year, month, day } = parseCivilIso(bsIso);
  const nextDay = day + delta;
  if (nextDay < 1 || nextDay > 35) return undefined;
  return formatCivilIsoParts(year, month, nextDay);
}

export function formatGregorianEventPartsLabel(
  g: { era?: string; year: number; month: number; day: number },
  lang?: string,
): string {
  const digitFn = (n: number | string) => formatLocaleDigits(n, lang);
  return formatGregorianFromDateParts(g, lang ?? "ne", digitFn);
}

/**
 * Date a moon event falls on, in the reader's calendar system (BS by default,
 * AD when AD is on) and named in the UI language: जेठ २९ / Jestha 29 for BS,
 * May 12 / मे १२ for AD. The language never decides the calendar.
 */
export function formatEventDate(isoDate: string, lang?: string, calendar: CalendarSystem = getCalendarSystem()): string {
  const normalized = positiveGregorianCivilIso(isoDate);
  // `"-0020-04-16".split("-")` yields a leading empty field, so the old parse
  // produced year 0 and bailed to the raw string — a BCE moonrise read
  // "-0020-04-16 · १७:५४" instead of a date. Parse sign-aware instead.
  let parts: { year: number; month: number; day: number };
  try {
    parts = parseCivilIso(normalized);
  } catch {
    return formatLocaleDigits(isoDate, lang);
  }
  const { month, day } = parts;
  if (!month || !day) return formatLocaleDigits(isoDate, lang);
  const date = parseCivilIsoToDate(normalized);
  const isEn = normalizeLang(lang) === "en";
  if (calendar === "ad" || (isEn && parts.year < 1)) {
    if (isEn) {
      if (parts.year < 1) return `${AD_MONTHS_SHORT[month - 1]} ${day}`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return `${AD_MONTH_NAMES_NE[month - 1]} ${formatLocaleDigits(day, lang)}`;
  }
  const bs = adToBS(date);
  if (isEn) return `${BS_MONTH_NAMES[bs.month - 1]} ${bs.day}`;
  return `${BS_MONTHS_NE[bs.month - 1]} ${formatLocaleDigits(bs.day, lang)}`;
}

/**
 * BS date from a `date_bs` string, e.g. जेठ १५, वि.सं. २०८२.
 *
 * `date_bs` spells pre-epoch days on the engine's signed axis (`-4-01-01`), so
 * it is parsed sign-aware and rendered the way the eras actually work: a
 * negative year is BBS (पू.वि.सं.) with a positive number, never "BS -4".
 * A plain `split("-")` here shifted every field on those days.
 */
export function formatBsIsoDateNepali(
  bsIso?: string | null,
  opts?: { includeYear?: boolean; lang?: string }
): string | undefined {
  if (!bsIso) return undefined;
  let year: number;
  let month: number;
  let day: number;
  try {
    ({ year, month, day } = parseCivilIso(bsIso));
  } catch {
    return undefined;
  }
  if (!month || !day) return undefined;
  const isEn = (opts?.lang ?? "ne").slice(0, 2) === "en";
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const beforeEpoch = year < 0;
  const era = isEn ? (beforeEpoch ? "BBS" : "BS") : beforeEpoch ? "पू.वि.सं." : "वि.सं.";
  const label = `${months[month - 1]} ${formatLocaleDigits(day, opts?.lang)}`;
  if (opts?.includeYear === false || !year) return label;
  return `${label}, ${era} ${formatLocaleDigits(Math.abs(year), opts?.lang)}`;
}

export function formatHolidayBsDisplay(
  holiday: {
    bs_start_date?: string;
    start_date: string;
  },
  lang?: string,
): string {
  const fromApi = formatBsIsoDateNepali(holiday.bs_start_date, { lang });
  if (fromApi) return fromApi;
  const [y, m, d] = holiday.start_date.split("-").map(Number);
  if (!y || !m || !d) return "";
  const bs = adToBS(new Date(y, m - 1, d));
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const era = isEn ? "BS" : "वि.सं.";
  return `${months[bs.month - 1]} ${formatLocaleDigits(bs.day, lang)}, ${era} ${formatLocaleDigits(bs.year, lang)}`;
}

/** Month patro grid — clock only (no BS date prefix when moon event is next/prior civil day). */
export function formatMonthMoonTimeOnly(day: {
  moonrise?: string;
  moonset?: string;
}, key: "moonrise" | "moonset"): string | undefined {
  const time = key === "moonrise" ? day.moonrise : day.moonset;
  if (!time) return undefined;
  return formatClockNepali(time);
}

export function titleizeWords(text: string): string {
  return text.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function tithiNameOnly(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const stripped = name
    .replace(/^(शुक्ल|कृष्ण)\s*/i, "")
    .replace(/^(Shukla|Krishna)\s*/i, "")
    .trim();
  return stripped || name;
}

/** Lunar month Devanagari → English (for paksha labels like "श्रावण शुक्ल पक्ष"). */
export const LUNAR_MONTH_NE_TO_EN: Record<string, string> = {
  चैत्र: "Chaitra",
  वैशाख: "Vaishakha",
  ज्येष्ठ: "Jyeshtha",
  जेष्ठ: "Jyeshtha",
  आषाढ: "Ashadha",
  अषाढ: "Ashadha",
  श्रावण: "Shravana",
  साउन: "Shravana",
  भाद्रपद: "Bhadrapada",
  भाद्र: "Bhadra",
  भदौ: "Bhadra",
  आश्विन: "Ashvina",
  असोज: "Ashvina",
  कार्तिक: "Kartika",
  मार्गशीर्ष: "Margashirsha",
  मार्ग: "Margashirsha",
  पौष: "Pausha",
  पुष: "Pausha",
  माघ: "Magha",
  फाल्गुन: "Phalguna",
  फागुन: "Phalguna",
};

const RASHI_SYM = [
  "", "", "", "", "", "",
  "", "", "", "", "", "",
] as const;

export { RASHI_SYM };

/** Clock time for patro tables — adds 24h when after midnight before sunrise. */
export function formatVedicPatroTime(
  timeShort?: string | null,
  sunriseShort?: string | null
): string | undefined {
  const t = formatTimeShort(timeShort);
  if (!t) return undefined;
  const sunrise = formatTimeShort(sunriseShort);
  if (!sunrise) return toNepaliDigits(t);
  const [th, tm] = t.split(":").map(Number);
  const [sh] = sunrise.split(":").map(Number);
  if (th != null && tm != null && sh != null && th < sh) {
    return toNepaliDigits(`${String(th + 24).padStart(2, "0")}:${String(tm).padStart(2, "0")}`);
  }
  return toNepaliDigits(t);
}

export function rashiSymFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_SYM[rashi - 1];
}

type SpanEndBlock = {
  end_local_time_short?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
};

export function formatSpanEndTime(span?: SpanEndBlock | null): string | undefined {
  if (!span) return undefined;
  const raw =
    span.end_local_time_short ??
    formatTimeShort(span.end_local_time) ??
    formatTimeShort(span.end_hours_clock) ??
    formatGhatiEnd(span.end_ghati_clock);
  return raw ? toNepaliDigits(raw) : undefined;
}

export function formatShortClock(time?: string | null, lang?: string): string | undefined {
  if (!time) return undefined;
  const t = formatTimeShort(time) ?? time.slice(0, 5);
  return toNepaliDigits(t, lang);
}

export function formatTimeRangeShort(
  start?: string | null,
  end?: string | null,
  lang?: string,
): string | undefined {
  const a = formatShortClock(start, lang);
  const b = formatShortClock(end, lang);
  if (!a || !b) return undefined;
  return `${a} → ${b}`;
}

/** DMS within sign (deg|min|sec) from absolute sidereal longitude. */
export function longitudeToDegreeCells(longitude: number): string {
  const rem = longitude % 30;
  const deg = Math.floor(rem);
  const min = Math.floor((rem - deg) * 60);
  let sec = Math.round(((rem - deg) * 60 - min) * 60);
  let m = min;
  let d = deg;
  if (sec >= 60) {
    sec -= 60;
    m += 1;
  }
  if (m >= 60) {
    m -= 60;
    d += 1;
  }
  return [d, m, sec].map((n) => toNepaliDigits(n)).join("|");
}

/** Parse patro DMS string (22°59'15") to Nepali deg|min|sec cells. */
export function dmsInRashiToDegreeCells(dms: string): string | undefined {
  const match = dms.match(/(\d+)°(\d+)'(\d+)"/);
  if (!match) return undefined;
  return [match[1], match[2], match[3]].map((n) => toNepaliDigits(Number(n))).join("|");
}

export function longitudeToPlanetCells(longitude: number): string {
  const rashi = Math.floor(longitude / 30) + 1;
  return [rashi, ...longitudeToDegreeCells(longitude).split("|")].join("|");
}

export type PlanetDetail = {
  longitude?: number;
  rashi?: number;
  rashi_name?: string;
  rashi_ne?: string;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
  is_retrograde?: boolean;
  retrograde?: boolean;
  is_combust?: boolean;
  nakshatra?: {
    number?: number;
    name?: string;
    name_ne?: string;
    pada?: number;
    lord?: string;
  };
};

export type PlanetRow = {
  key: string;
  /** Nepali label (kept for timeline maps keyed by Devanagari). */
  label: string;
  labelEn: string;
  rashiNe?: string;
  rashiEn?: string;
  coords: string;
  /** Sidereal longitude (degrees) when known — lets callers render `07° सिंह 10′ 28″`. */
  siderealLongitude?: number;
  nakshatraNe?: string;
  nakshatraEn?: string;
  pada?: number;
  nakshatraLordNe?: string;
  nakshatraLordEn?: string;
  /** KP sub-lord (उप स्वामी) of the nakshatra sub-division. */
  nakshatraSubLordNe?: string;
  nakshatraSubLordEn?: string;
  /** वक्री — planet in retrograde motion. */
  isRetrograde?: boolean;
  /** अस्त — planet combust (lost in the Sun's glare). */
  isCombust?: boolean;
};

export function planetLabelPair(key: string): { label: string; labelEn: string } {
  const g = GRAHA_NAME[key as GrahaKey];
  return { label: g?.ne ?? key, labelEn: g?.en ?? key };
}

export function rashiEnFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return getRashiName(rashi, "en");
}

type NakshatraFields = Pick<
  PlanetRow,
  | "nakshatraNe"
  | "nakshatraEn"
  | "pada"
  | "nakshatraLordNe"
  | "nakshatraLordEn"
  | "nakshatraSubLordNe"
  | "nakshatraSubLordEn"
>;

/**
 * Vimshottari dasha lords with their year spans, in order. The nakshatra-lord
 * cycle repeats every 9 nakshatras; the same sequence, proportioned by these
 * years, subdivides each nakshatra into KP sub-lord (उप स्वामी) segments.
 */
const VIMSHOTTARI: Array<[GrahaKey, number]> = [
  ["ketu", 7], ["venus", 20], ["sun", 6], ["moon", 10], ["mars", 7],
  ["rahu", 18], ["jupiter", 16], ["saturn", 19], ["mercury", 17],
];
const VIMSHOTTARI_TOTAL = 120;

/** KP sub-lord: which Vimshottari lord's sub-division holds this longitude. */
function subLordKeyFromLongitude(longitude: number): GrahaKey {
  const span = 360 / 27;
  const norm = ((longitude % 360) + 360) % 360;
  const idx = Math.min(26, Math.floor(norm / span));
  const posInNak = norm - idx * span;
  const startIdx = idx % 9; // nakshatra lord starts the sub-division sequence
  let acc = 0;
  for (let i = 0; i < 9; i += 1) {
    const [key, years] = VIMSHOTTARI[(startIdx + i) % 9]!;
    acc += (years / VIMSHOTTARI_TOTAL) * span;
    if (posInNak < acc - 1e-9) return key;
  }
  return VIMSHOTTARI[(startIdx + 8) % 9]![0];
}

/**
 * Nakshatra, pada (1–4), nakshatra lord and KP sub-lord derived from a sidereal
 * longitude (degrees). Used when the payload ships a bare longitude but no
 * per-body nakshatra block — e.g. the sunrise spashtagraha and the लग्न.
 */
export function nakshatraFieldsFromLongitude(longitude: number): NakshatraFields {
  const norm = ((longitude % 360) + 360) % 360;
  const span = 360 / 27; // 13°20′ per nakshatra
  const idx = Math.min(26, Math.floor(norm / span));
  const pada = Math.min(4, Math.floor((norm - idx * span) / (span / 4)) + 1);
  const icon = NAKSHATRA_ICONS[idx];
  const lordKey = VIMSHOTTARI[idx % 9]![0];
  const subKey = subLordKeyFromLongitude(norm);
  return {
    nakshatraNe: icon?.ne,
    nakshatraEn: icon?.en,
    pada,
    nakshatraLordNe: GRAHA_NAME[lordKey].ne,
    nakshatraLordEn: GRAHA_NAME[lordKey].en,
    nakshatraSubLordNe: GRAHA_NAME[subKey].ne,
    nakshatraSubLordEn: GRAHA_NAME[subKey].en,
  };
}

/** Sidereal longitude → `०७° सिंह १०′ २८″` (degree-in-rashi, rashi name, min, sec). */
export function formatDegreeInRashi(longitude: number, rashiNe?: string): string {
  const norm = ((longitude % 360) + 360) % 360;
  const degInRashi = norm % 30;
  let d = Math.floor(degInRashi);
  const totalSec = Math.round((degInRashi - d) * 3600);
  let m = Math.floor(totalSec / 60);
  let s = totalSec % 60;
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  const pad = (n: number) => toNepaliDigits(String(n).padStart(2, "0"));
  const rashi = rashiNe ? `${rashiNe} ` : "";
  return `${pad(d)}° ${rashi}${pad(m)}′ ${pad(s)}″`;
}

export function planetNakshatraFields(info: PlanetDetail): NakshatraFields {
  // Nakshatra placement is computed by the API and shipped on each planet.
  const nak = info.nakshatra;
  if (nak?.number) {
    const lord = nak.lord as keyof typeof GRAHA_NAME | undefined;
    return {
      nakshatraNe: nak.name_ne ?? NAKSHATRA_ICONS[nak.number - 1]?.ne,
      nakshatraEn: nak.name ?? NAKSHATRA_ICONS[nak.number - 1]?.en,
      pada: nak.pada,
      nakshatraLordNe: lord ? GRAHA_NAME[lord]?.ne : undefined,
      nakshatraLordEn: lord ? GRAHA_NAME[lord]?.en : undefined,
    };
  }
  // Sunrise spashtagraha omits nakshatra — derive it from the sidereal longitude.
  const lon =
    info.longitude ??
    (info.rashi != null && info.deg_in_rashi != null
      ? (info.rashi - 1) * 30 + info.deg_in_rashi
      : undefined);
  return lon != null ? nakshatraFieldsFromLongitude(lon) : {};
}

export type InstantLagna = {
  number?: number;
  name_ne?: string;
  name?: string;
  degree_in_rashi?: number;
  longitude?: number;
  /** ecliptic latitude (shara) — 0 for the lagna by definition. */
  latitude?: number;
  right_ascension?: number;
  declination?: number;
  /** Ascendant motion in degrees/day. */
  speed?: number;
};

/** Sidereal lagna longitude — ephemeris `longitude` is the single source of truth. */
export function resolveLagnaSiderealLongitude(lagna: InstantLagna): number | undefined {
  if (lagna.longitude != null) return lagna.longitude;
  const { number, degree_in_rashi } = lagna;
  if (number != null && degree_in_rashi != null) {
    return (number - 1) * 30 + degree_in_rashi;
  }
  return undefined;
}

/** राशि number (१–१२) and Nepali name derived from sidereal longitude. */
export function lagnaRashiFromLongitude(longitude: number): {
  rashiNum: number;
  nameNe: string;
  degreeInRashi: number;
} {
  const lon = ((longitude % 360) + 360) % 360;
  const rashiNum = Math.floor(lon / 30) + 1;
  const nameNe = rashiNeFromNumber(rashiNum) ?? "—";
  const degreeInRashi = lon % 30;
  return { rashiNum, nameNe, degreeInRashi };
}

export function planetDegreeCells(info: PlanetDetail): string {
  if (info.dms_in_rashi) {
    const fromDms = dmsInRashiToDegreeCells(info.dms_in_rashi);
    if (fromDms) return fromDms;
  }
  if (info.deg_in_rashi != null && info.rashi != null) {
    return longitudeToDegreeCells((info.rashi - 1) * 30 + info.deg_in_rashi);
  }
  if (info.longitude != null) {
    return longitudeToDegreeCells(info.longitude);
  }
  return "—";
}

export function formatPlanetGocharParts(
  info: PlanetDetail,
  lang?: string,
): { rashi?: string; degree: string } {
  const cells = planetDegreeCells(info).split("|");
  const degree = cells.join(":");
  const rashi = formatRashiDisplay(
    info.rashi_ne,
    info.rashi_name ?? rashiEnFromNumber(info.rashi),
    lang,
  );
  return { rashi, degree };
}

export function formatPlanetGocharLine(info: PlanetDetail, lang?: string): string {
  const { rashi, degree } = formatPlanetGocharParts(info, lang);
  if (rashi) return `${rashi} ${degree}`;
  return degree;
}

type MuhurtaWindow = {
  start_time?: string;
  end_time?: string;
  solar_noon?: string;
  is_auspicious?: boolean;
};

type MuhurtaTimingSegment = {
  start_local_time_short?: string;
  end_local_time_short?: string;
  until_full_night?: boolean;
  spans_midnight?: boolean;
  subtitle_en?: string;
  subtitle_ne?: string;
};

type MuhurtaTimingEntry = {
  key?: string;
  name_en?: string;
  name_ne?: string;
  is_auspicious?: boolean;
  segments?: MuhurtaTimingSegment[];
};

export type MuhurtaDetail = {
  rahu_kalam?: MuhurtaWindow;
  yamaganda?: MuhurtaWindow;
  gulika?: MuhurtaWindow;
  abhijit?: MuhurtaWindow;
  auspicious_timings?: MuhurtaTimingEntry[];
  inauspicious_timings?: MuhurtaTimingEntry[];
};

function formatMuhurtaSegment(seg: MuhurtaTimingSegment, lang?: string): string {
  const isEn = normalizeLang(lang) === "en";
  const start = seg.start_local_time_short
    ? formatLocaleDigits(
        formatTimeShort(seg.start_local_time_short) ?? seg.start_local_time_short,
        lang,
      )
    : undefined;
  const end = seg.end_local_time_short
    ? formatLocaleDigits(
        formatTimeShort(seg.end_local_time_short) ?? seg.end_local_time_short,
        lang,
      )
    : undefined;
  const subtitle = pickLocale(lang, seg.subtitle_ne ?? seg.subtitle_en, seg.subtitle_en ?? seg.subtitle_ne);
  if (start && end) {
    return subtitle ? `${subtitle} ${start} – ${end}` : `${start} – ${end}`;
  }
  if (start && seg.until_full_night) {
    return isEn ? `${start} through the night` : `${start} देखि सम्पूर्ण रातसम्म`;
  }
  if (end && !start) {
    return isEn
      ? subtitle
        ? `${subtitle} until ${end}`
        : `until ${end}`
      : subtitle
        ? `${subtitle} ${end} सम्म`
        : `${end} सम्म`;
  }
  return start ?? end ?? "—";
}

export function formatMuhurtaTimingEntry(
  entry: MuhurtaTimingEntry,
  lang?: string,
): { label: string; value: string; auspicious?: boolean } | null {
  const segments = entry.segments?.filter(Boolean);
  if (!segments?.length) return null;
  const label = pickLocale(
    lang,
    entry.name_ne || entry.name_en || entry.key || "—",
    entry.name_en || entry.name_ne || entry.key || "—",
  );
  const value = segments.map((seg) => formatMuhurtaSegment(seg, lang)).join("\n");
  return {
    label,
    value,
    auspicious: entry.is_auspicious,
  };
}

export function formatMuhurtaRange(start?: string, end?: string): string | undefined {
  if (!start || !end) return undefined;
  const s = formatClockNepali(start) ?? start;
  const e = formatClockNepali(end) ?? end;
  return `${s} – ${e}`;
}

function clockMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToClock(mins: number): string {
  const rounded = Math.round(mins);
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type AbhijitMuhurtaInfo = {
  start_time: string;
  end_time: string;
  solar_noon?: string;
  rangeDisplay: string;
  noonDisplay?: string;
};

/** Abhijit muhurta from sunrise/sunset — same 8th-muhurta rule as the backend. */
export function computeAbhijitFromSunTimes(
  sunrise?: string | null,
  sunset?: string | null,
): AbhijitMuhurtaInfo | null {
  const sr = clockMinutes(sunrise);
  const ss = clockMinutes(sunset);
  if (sr == null || ss == null || ss <= sr) return null;
  const total = ss - sr;
  const muh = total / 15;
  const start_time = minutesToClock(sr + 7 * muh);
  const end_time = minutesToClock(sr + 8 * muh);
  const solar_noon = minutesToClock(sr + total / 2);
  const rangeDisplay = formatMuhurtaRange(start_time, end_time) ?? `${start_time} – ${end_time}`;
  return {
    start_time,
    end_time,
    solar_noon,
    rangeDisplay,
    noonDisplay: formatClockNepali(solar_noon),
  };
}

export function abhijitFromWindow(
  ab?: { start_time?: string; end_time?: string; solar_noon?: string } | null,
): AbhijitMuhurtaInfo | null {
  if (!ab?.start_time || !ab?.end_time) return null;
  const rangeDisplay = formatMuhurtaRange(ab.start_time, ab.end_time);
  if (!rangeDisplay) return null;
  return {
    start_time: ab.start_time,
    end_time: ab.end_time,
    solar_noon: ab.solar_noon,
    rangeDisplay,
    noonDisplay: ab.solar_noon ? formatClockNepali(ab.solar_noon) : undefined,
  };
}

export interface InauspiciousWindow {
  /** Dosha key, e.g. "rahu_kalam", "bhadra", "varjyam", "tithi", "tithi_randhra". */
  key: string;
  nameNe: string;
  nameEn: string;
  /** Local wall-clock start/end, e.g. "10:30" or "10:30 AM". */
  start: string;
  end: string;
  /** Segment runs from `start` through the rest of the night to next sunrise. */
  tillFullNight?: boolean;
}

export interface AuspiciousWindow {
  /** Muhurta key, e.g. "amrit_kalam", "abhijit", "sarvartha_siddhi_yoga". */
  key: string;
  nameNe: string;
  nameEn: string;
  /** Local wall-clock start/end, e.g. "13:41". */
  start: string;
  end: string;
  /** Segment runs from `start` through the rest of the night to next sunrise. */
  tillFullNight?: boolean;
}

/** Patro-style BS date, e.g. असार १४, २०८३ */
export function formatBsMonthDayPatro(
  bsYear: number,
  bsMonth: number,
  bsDay: number,
): string {
  return `${BS_MONTHS_NE[bsMonth - 1]} ${toNepaliDigits(bsDay)}, ${toNepaliDigits(bsYear)}`;
}

export type MonthFestivalEntry = {
  name: string;
  bsDay: number;
  isPublicHoliday?: boolean;
};

/** Bare lunar phases — tithi markers, not चाडपर्व unless named (e.g. कुशे औंसी). */
const BARE_LUNAR_PHASE_NE = new Set(["पूर्णिमा", "औंसी"]);

const TITHI_NAMES_NE = new Set([
  "प्रतिपदा",
  "द्वितीया",
  "तृतीया",
  "चतुर्थी",
  "पञ्चमी",
  "षष्ठी",
  "सप्तमी",
  "अष्टमी",
  "नवमी",
  "दशमी",
  "एकादशी",
  "द्वादशी",
  "त्रयोदशी",
  "चतुर्दशी",
  "पूर्णिमा",
  "औंसी",
]);

const TITHI_NAMES_EN = new Set([
  "pratipada",
  "dwitiya",
  "tritiya",
  "chaturthi",
  "panchami",
  "shashthi",
  "saptami",
  "ashtami",
  "navami",
  "dashami",
  "ekadashi",
  "dwadashi",
  "trayodashi",
  "chaturdashi",
  "purnima",
  "Aaushi",
  "aunsi",
]);

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function normalizeFestKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, " ")
    .trim();
}

export function isTithiOnlyLabel(name: string): boolean {
  const trimmed = name.trim();
  if (BARE_LUNAR_PHASE_NE.has(trimmed) || TITHI_NAMES_NE.has(trimmed)) return true;

  const pakshaNe = trimmed.match(/^(शुक्ल|कृष्ण)\s+(.+)$/);
  if (pakshaNe && TITHI_NAMES_NE.has(pakshaNe[2]!)) return true;

  const key = normalizeFestKey(trimmed);
  if (TITHI_NAMES_EN.has(key) || key === "full moon" || key === "new moon") return true;

  const pakshaEn = key.match(/^(shukla|krishna)\s+(.+)$/);
  if (pakshaEn && TITHI_NAMES_EN.has(pakshaEn[2]!)) return true;

  return false;
}

export function resolveFestivalAlias(name: string, aliasIndex: Map<string, string>): string {
  return aliasIndex.get(normalizeFestKey(name)) ?? `name:${normalizeFestKey(name)}`;
}

export function preferLocalizedName(current: string, candidate: string, preferNe: boolean): string {
  if (preferNe) {
    if (hasDevanagari(candidate) && !hasDevanagari(current)) return candidate;
    return current;
  }
  if (!hasDevanagari(candidate) && hasDevanagari(current)) return candidate;
  return current;
}

/** Collapse Nepali + English duplicates on the same calendar day. */
export function dedupeDayFestivalNames(
  names: string[],
  aliasIndex: Map<string, string>,
  preferNe: boolean,
): string[] {
  const byAlias = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const alias = resolveFestivalAlias(trimmed, aliasIndex);
    const existing = byAlias.get(alias);
    byAlias.set(
      alias,
      existing ? preferLocalizedName(existing, trimmed, preferNe) : trimmed,
    );
  }
  return Array.from(byAlias.values());
}

export function getShraddhaLabel(
  tithiNameNe?: string | null,
  lang?: string,
  tithiNameEn?: string | null,
): string | undefined {
  if (!tithiNameNe) return undefined;
  if (tithiNameNe === "पूर्णिमा" || tithiNameNe === "औंसी") return undefined;
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  if (isEn) {
    // Falls back to the Devanagari tithi only when the payload has no Latin
    // name — otherwise this read "त्रयोदशी Shraddha" in English.
    return `${tithiNameEn ?? tithiNameNe} Shraddha`;
  }
  return `${tithiNameNe} श्राद्ध`;
}

export function hasNamedPurnimaFestival(labels: string[]): boolean {
  return labels.some((label) => {
    const trimmed = label.trim();
    if (trimmed === "पूर्णिमा" || trimmed === "Purnima") return false;
    return /पूर्णिमा|पुन्ही|purnima/i.test(trimmed);
  });
}

export function relativeDayLabel(daysDiff: number, lang?: string): string {
  if (normalizeLang(lang) !== "en") return festivalRelLabelNepali(daysDiff);
  if (daysDiff === 0) return "Today";
  if (daysDiff > 0) return `${daysDiff} Days left`;
  return `${Math.abs(daysDiff)} Days before`;
}

export function daysDiffFromAd(fromAd: string, toAd: string): number {
  const from = new Date(`${fromAd}T12:00:00`);
  const to = new Date(`${toAd}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

/** Days until a festival — Nepali labels for the aside चाडपर्व tab. */
export function festivalRelLabelNepali(daysDiff: number): string {
  if (daysDiff === 0) return "आज";
  if (daysDiff === 1) return "भोलि";
  if (daysDiff > 1) return `${toNepaliDigits(daysDiff)} दिन बाँकी`;
  if (daysDiff === -1) return "हिजो";
  return `${toNepaliDigits(Math.abs(daysDiff))} दिन अघि`;
}
