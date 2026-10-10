import type { CalendarDay, ElementStamp, PanchangaDay } from "./api";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "./bs-calendar";
import { GRAHA_NAME, RASHI_EN_NAMES, type GrahaKey } from "@/lib/graha-details";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { formatLocaleDigits, normalizeLang, pickLocale } from "@/lib/i18n-locale.web";

type Festival = NonNullable<PanchangaDay["festivals"]>[number];
type NivasShoolBlock = NonNullable<PanchangaDay["nivas_shool"]>;

export function toNepaliDigits(value: string | number): string {
  return formatLocaleDigits(value);
}

export function formatTimeShort(time?: string | null): string | undefined {
  if (!time) return undefined;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return time;
  const h = match[1]!.padStart(2, "0");
  const m = match[2]!;
  return `${h}:${m}`;
}

/** Clock time in the given locale's digits (e.g. ०७:३२, or 07:32 for English). */
export function formatClockNepali(time?: string | null, lang?: string): string | undefined {
  if (!time) return undefined;
  const short = formatTimeShort(time) ?? time;
  return formatLocaleDigits(short, lang);
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

type AngaDetail = {
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

export function formatPakshaShortNe(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const label =
    (detail?.paksha as { label_ne?: string } | undefined)?.label_ne ??
    p.paksha?.label_ne ??
    p.paksha_ne;
  if (!label) return undefined;
  return label.replace(/\s*पक्ष\s*$/u, "").trim();
}

export function formatPatroBelaantar(c?: SolarCorrection): string | undefined {
  return formatPatroSignedCorrection(c);
}

export function formatPatroDeshaantar(c?: SolarCorrection): string | undefined {
  return formatPatroSignedCorrection(c);
}

/** Patro aside ±MM:SS from a solar correction block (धन/ऋण). */
export function formatPatroSignedCorrection(c?: SolarCorrection): string | undefined {
  if (!c) return undefined;
  let minutes = c.minutes;
  let seconds = c.seconds;
  const withTotal = c as SolarCorrection & { minutes_total?: number };
  if ((minutes == null || seconds == null) && withTotal.minutes_total != null) {
    const abs = Math.abs(withTotal.minutes_total);
    minutes = Math.floor(abs);
    seconds = Math.round((abs - minutes) * 60);
    if (seconds >= 60) {
      seconds -= 60;
      minutes = (minutes ?? 0) + 1;
    }
  }
  if (minutes == null || seconds == null) return undefined;
  const sign =
    c.sign ??
    (withTotal.minutes_total != null && withTotal.minutes_total < 0 ? "rin" : "dhan");
  const mm = toNepaliDigits(minutes);
  const ss = toNepaliDigits(String(seconds).padStart(2, "0"));
  const prefix = sign === "rin" ? "-" : "+";
  return `${prefix}${mm}:${ss}`;
}

export function getPanchangaDetail(p: PanchangaDay) {
  return (p as PanchangaDay & { detail?: Record<string, unknown> }).detail as
    | Record<string, unknown>
    | undefined;
}

export function getLagnaSpans(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const fromTop = p.lagna_spans;
  const fromDetail = detail?.lagna_spans as PanchangaDay["lagna_spans"];
  if (fromTop?.length) return fromTop;
  if (fromDetail?.length) return fromDetail;
  return undefined;
}

export function getSunrise(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = (detail?.sunrise as { local_time_short?: string } | undefined)?.local_time_short;
  if (fromDetail) return fromDetail;
  if (typeof p.sunrise === "object") return p.sunrise?.local_time_short;
  if (typeof p.sunrise === "string") return p.sunrise;
  return p.sun?.sunrise;
}

export function getSunset(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = (detail?.sunset as { local_time_short?: string } | undefined)?.local_time_short;
  if (fromDetail) return fromDetail;
  if (typeof p.sunset === "object") return p.sunset?.local_time_short;
  if (typeof p.sunset === "string") return p.sunset;
  return p.sun?.sunset;
}

export function getSunriseDisplay(p: PanchangaDay): string | undefined {
  return formatClockNepali(getSunrise(p));
}

export function getSunsetDisplay(p: PanchangaDay): string | undefined {
  return formatClockNepali(getSunset(p));
}

type SolarCorrection = {
  minutes?: number;
  seconds?: number;
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
  sunrise_includes_corrections?: boolean;
};

export function getSolarCorrections(p: PanchangaDay): SolarCorrections | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.solar_corrections as SolarCorrections | undefined;
  const fromTop = (p as PanchangaDay & { solar_corrections?: SolarCorrections }).solar_corrections;
  if (!fromDetail && !fromTop) return undefined;
  return {
    ...fromTop,
    ...fromDetail,
    belaantar: fromDetail?.belaantar ?? fromTop?.belaantar,
    deshaantar: fromDetail?.deshaantar ?? fromTop?.deshaantar,
    akshamsha: fromDetail?.akshamsha ?? fromTop?.akshamsha,
  };
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

type RituBlock = { name?: string; name_ne?: string; season?: string };
type AayanBlock = { name?: string; name_ne?: string };
type DurationBlock = {
  label_en?: string;
  label_ne?: string;
  label_en_full?: string;
  label_ne_full?: string;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

function getDetailValue<T>(p: PanchangaDay, key: string): T | undefined {
  const detail = getPanchangaDetail(p);
  return (detail?.[key] ?? (p as Record<string, unknown>)[key]) as T | undefined;
}

export function getRituDisplayNe(p?: PanchangaDay | null): string | undefined {
  if (!p) return undefined;
  const ritu = getDetailValue<RituBlock>(p, "ritu") ?? getDetailValue<RituBlock>(p, "ritu_pauranik");
  if (ritu?.name_ne) return ritu.name_ne;
  if (typeof p.ritu === "object" && p.ritu?.name_ne) return p.ritu.name_ne;
  return p.ritu_ne;
}

/** Locale-aware ritu label (Nepali name / English season or name). */
export function getRituDisplay(p?: PanchangaDay | null, lang?: string): string | undefined {
  if (!p) return undefined;
  const ritu = getDetailValue<RituBlock>(p, "ritu") ?? getDetailValue<RituBlock>(p, "ritu_pauranik");
  const top = typeof p.ritu === "object" ? p.ritu : undefined;
  const ne = ritu?.name_ne ?? top?.name_ne ?? p.ritu_ne;
  const en = ritu?.name ?? top?.name ?? ritu?.season ?? top?.season ?? ne;
  return pickLocale(lang, ne, en);
}

export function getRituSeason(p?: PanchangaDay | null, lang?: string): string | undefined {
  if (!p) return undefined;
  const ritu = getDetailValue<RituBlock>(p, "ritu") ?? getDetailValue<RituBlock>(p, "ritu_pauranik");
  const season =
    ritu?.season ??
    (typeof p.ritu === "object" ? p.ritu?.season : undefined);
  if (!season) return undefined;
  if (normalizeLang(lang) === "en") return season;
  const SEASON_NE: Record<string, string> = {
    Spring: "वसन्त",
    Summer: "ग्रीष्म",
    Autumn: "शरद्",
    Fall: "शरद्",
    Winter: "हिउँद",
    Monsoon: "वर्षा",
    Rainy: "वर्षा",
  };
  return SEASON_NE[season] ?? undefined;
}

export function formatAdTitle(
  _p: PanchangaDay,
  dateAd: string,
  lang?: string,
): string {
  const d = new Date(dateAd.includes("T") ? dateAd : `${dateAd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateAd;
  const locale = normalizeLang(lang) === "en" ? "en-US" : "ne-NP";
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

export function formatAdShort(
  _p: PanchangaDay,
  dateAd: string,
  lang?: string,
): string {
  const d = new Date(dateAd.includes("T") ? dateAd : `${dateAd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateAd;
  const locale = normalizeLang(lang) === "en" ? "en-US" : "ne-NP";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function getRituPauranik(p?: PanchangaDay | null): RituBlock | undefined {
  if (!p) return undefined;
  return getDetailValue<RituBlock>(p, "ritu_pauranik");
}

export function getRituVedic(p?: PanchangaDay | null): RituBlock | undefined {
  if (!p) return undefined;
  return getDetailValue<RituBlock>(p, "ritu_vedic") ?? getDetailValue<RituBlock>(p, "ritu");
}

export function getAayanPauranik(p?: PanchangaDay | null): AayanBlock | undefined {
  if (!p) return undefined;
  return getDetailValue<AayanBlock>(p, "aayan_pauranik");
}

export function getAayanVedic(p?: PanchangaDay | null): AayanBlock | undefined {
  if (!p) return undefined;
  return getDetailValue<AayanBlock>(p, "aayan_vedic") ?? getDetailValue<AayanBlock>(p, "aayan");
}

export function formatRituLabel(
  ritu: RituBlock | undefined,
  lang: "ne" | "en" | "hi",
): string | undefined {
  if (!ritu) return undefined;
  const name = pickLocale(lang, ritu.name_ne ?? ritu.name ?? "", ritu.name ?? ritu.name_ne ?? "");
  if (lang === "en" && ritu.season) return `${name} (${ritu.season})`;
  return name;
}

export function formatAayanLabel(
  aayan: AayanBlock | undefined,
  lang: "ne" | "en" | "hi",
): string | undefined {
  if (!aayan) return undefined;
  return pickLocale(lang, aayan.name_ne ?? aayan.name ?? "", aayan.name ?? aayan.name_ne ?? "");
}

export function formatSolarCorrectionDisplay(c?: SolarCorrection): string | undefined {
  if (!c || c.minutes == null || c.seconds == null) return undefined;
  const prefix = c.sign === "rin" ? "-" : "+";
  const body = `${prefix}${c.minutes} मि ${String(c.seconds).padStart(2, "0")} से`;
  const signNe = c.sign_ne ? ` (${c.sign_ne})` : "";
  return `${toNepaliDigits(body)}${signNe}`;
}

type MoonTimeBlock = { local?: string; local_time_short?: string };

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** BS date label for a civil (AD) calendar day, e.g. जेठ २९ / Jestha 29. */
function formatEventDateBs(isoDate: string, lang?: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return formatLocaleDigits(isoDate, lang);
  const bs = adToBS(new Date(y, m - 1, d));
  const isEn = normalizeLang(lang) === "en";
  const monthName = isEn ? BS_MONTH_NAMES[bs.month - 1] : BS_MONTHS_NE[bs.month - 1];
  return `${monthName} ${formatLocaleDigits(bs.day, lang)}`;
}

/** BS date from YYYY-MM-DD (BS era), e.g. जेठ १५, वि.सं. २०८२. */
export function formatBsIsoDateNepali(
  bsIso?: string | null,
  opts?: { includeYear?: boolean; lang?: string }
): string | undefined {
  if (!bsIso) return undefined;
  const [ys, ms, ds] = bsIso.split("-");
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  if (!month || !day) return undefined;
  const isEn = (opts?.lang ?? "ne").slice(0, 2) === "en";
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const era = isEn ? "BS" : "वि.सं.";
  const label = `${months[month - 1]} ${formatLocaleDigits(day, opts?.lang)}`;
  if (opts?.includeYear === false || !year) return label;
  return `${label}, ${era} ${formatLocaleDigits(year, opts?.lang)}`;
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

function getMoonTimeBlock(p: PanchangaDay, key: "moonrise" | "moonset"): MoonTimeBlock | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.[key] as MoonTimeBlock | undefined;
  if (fromDetail?.local_time_short) return fromDetail;
  const top = p[key];
  if (top?.local_time_short) return top;
  const fallback = key === "moonrise" ? p.moon?.rise : p.moon?.set;
  if (fallback) return { local_time_short: fallback };
  return undefined;
}

export function getMoonrise(p: PanchangaDay): string | undefined {
  return getMoonTimeBlock(p, "moonrise")?.local_time_short;
}

export function getMoonset(p: PanchangaDay): string | undefined {
  return getMoonTimeBlock(p, "moonset")?.local_time_short;
}

/** AD date of moonrise/moonset (often the next civil day within a sunrise-to-sunrise panchanga day). */
export function resolveMoonEventAdDate(
  p: PanchangaDay,
  key: "moonrise" | "moonset",
  block: MoonTimeBlock
): string | undefined {
  const dayDate = p.date_ad;
  if (!dayDate) return block.local?.slice(0, 10);

  const eventDate = block.local?.slice(0, 10);
  const eventMin = parseTimeToMinutes(block.local_time_short);
  const sunriseMin = parseTimeToMinutes(getSunrise(p));

  if (eventDate && eventDate !== dayDate) {
    return eventDate;
  }

  if (key === "moonrise" && eventMin != null && sunriseMin != null && eventMin < sunriseMin) {
    return addDaysIso(dayDate, 1);
  }

  return eventDate ?? dayDate;
}

/** Always show BS date + time — moonrise/moonset often fall on the next civil date. */
export function formatMoonEventDisplay(
  p: PanchangaDay,
  key: "moonrise" | "moonset",
  lang?: string,
): string | undefined {
  const block = getMoonTimeBlock(p, key);
  if (!block?.local_time_short) return undefined;
  const short = formatTimeShort(block.local_time_short) ?? block.local_time_short;
  const time = formatLocaleDigits(short, lang);
  const eventDate = resolveMoonEventAdDate(p, key, block);
  if (!time) return undefined;
  if (!eventDate) return time;
  return `${formatEventDateBs(eventDate, lang)} · ${time}`;
}

export function formatMonthMoonEventDisplay(
  day: {
    date_ad: string;
    sunrise?: string;
    moonrise?: string;
    moonrise_local?: string;
    moonset?: string;
    moonset_local?: string;
  },
  key: "moonrise" | "moonset",
  lang?: string,
): string | undefined {
  const time = key === "moonrise" ? day.moonrise : day.moonset;
  if (!time) return undefined;
  const local = key === "moonrise" ? day.moonrise_local : day.moonset_local;
  const block: MoonTimeBlock = { local_time_short: time, local };
  const pseudo = { date_ad: day.date_ad, sunrise: day.sunrise } as PanchangaDay;
  const eventDate = resolveMoonEventAdDate(pseudo, key, block);
  const short = formatTimeShort(time) ?? time;
  const timeLabel = formatLocaleDigits(short, lang);
  if (!timeLabel) return undefined;
  if (!eventDate) return timeLabel;
  return `${formatEventDateBs(eventDate, lang)} · ${timeLabel}`;
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

export function getMonthDayChandraRashi(
  day: CalendarDay,
  lang: "ne" | "en" | "hi",
): string | undefined {
  const moon = day.panchanga?.planets?.moon;
  const moonRashiNe =
    moon?.rashi_ne ??
    (moon?.rashi_no != null ? rashiNeFromNumber(moon.rashi_no) : undefined);
  const moonRashiEn = moon?.rashi ?? (moon as { rashi_name?: string } | undefined)?.rashi_name;

  const ne =
    day.chandra_rashi_ne ??
    day.panchanga?.chandra_rashi_ne ??
    moonRashiNe ??
    day.chandra_rashi ??
    day.panchanga?.chandra_rashi ??
    moonRashiEn;
  const en =
    day.chandra_rashi ??
    day.panchanga?.chandra_rashi ??
    moonRashiEn ??
    day.chandra_rashi_ne ??
    day.panchanga?.chandra_rashi_ne ??
    moonRashiNe;

  const raw = lang === "en" ? en : ne;
  if (!raw) return undefined;
  return lang === "en" ? raw : formatRashiDisplayNe(raw) ?? raw;
}

export function getMonthDayNakshatra(
  day: CalendarDay,
  lang: "ne" | "en" | "hi",
): string | undefined {
  const ne =
    day.nakshatra_ne ??
    day.panchanga?.nakshatra?.name_ne ??
    day.nakshatra ??
    day.panchanga?.nakshatra?.name;
  const en =
    day.nakshatra ??
    day.panchanga?.nakshatra?.name ??
    day.nakshatra_ne ??
    day.panchanga?.nakshatra?.name_ne;

  const raw = lang === "en" ? en : ne;
  return raw || undefined;
}

export function getMoonriseDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatMoonEventDisplay(p, "moonrise", lang);
}

export function getMoonsetDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatMoonEventDisplay(p, "moonset", lang);
}

export type PanchangaDetailCell = {
  label: string;
  value?: string;
  hint?: string;
  wide?: boolean;
  mono?: boolean;
};

export function buildPanchangaDetailCells(
  p: PanchangaDay,
  lang: string,
  selectedDay?: CalendarDay | null,
  labels?: {
    sunriseSunset: string;
    moonrise: string;
    ritu: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    dash: string;
  },
): PanchangaDetailCell[] {
  const detail = getPanchangaDetail(p);
  const nakshatra = detail?.nakshatra ?? p.nakshatra;
  const yoga = detail?.yoga ?? p.yoga;
  const karana = detail?.karana ?? p.karana;

  const angaName = (anga?: AngaPatro | null) =>
    pickLocale(lang, anga?.name_ne ?? anga?.name, anga?.name ?? anga?.name_ne);

  const sunrise =
    getSunriseDisplay(p) ??
    (selectedDay?.sunrise ? formatClockNepali(selectedDay.sunrise) : undefined);
  const sunset =
    getSunsetDisplay(p) ??
    (selectedDay?.sunset ? formatClockNepali(selectedDay.sunset) : undefined);
  const moonrise =
    getMoonriseDisplay(p, lang) ??
    (selectedDay ? formatMonthMoonEventDisplay(selectedDay, "moonrise", lang) : undefined);

  const L = labels ?? {
    sunriseSunset: "सूर्योदय / सूर्यास्त",
    moonrise: "चन्द्रोदय",
    ritu: "ऋतु",
    nakshatra: "नक्षत्र",
    yoga: "योग",
    karana: "करण",
    dash: "—",
  };

  return [
    {
      label: L.sunriseSunset,
      value: sunrise && sunset ? `${sunrise} / ${sunset}` : undefined,
      mono: true,
    },
    { label: L.moonrise, value: moonrise ?? L.dash, mono: true },
    { label: L.ritu, value: getRituDisplay(p, lang), hint: getRituSeason(p, lang) },
    {
      label: L.nakshatra,
      value: angaName(nakshatra),
      hint: formatAngaPatroTransitionHint(nakshatra, lang),
    },
    {
      label: L.yoga,
      value: angaName(yoga),
      hint: formatAngaPatroTransitionHint(yoga, lang),
    },
    {
      label: L.karana,
      value: angaName(karana),
      hint: formatAngaPatroTransitionHint(karana, lang),
    },
  ];
}

export function getVaaraNe(p: PanchangaDay, fallback?: string): string | undefined {
  const detail = getPanchangaDetail(p);
  return (
    (detail?.vaara as { name_ne?: string } | undefined)?.name_ne ??
    fallback
  );
}

export function getVaaraEn(p: PanchangaDay, fallback?: string): string | undefined {
  const detail = getPanchangaDetail(p);
  return (
    (detail?.vaara as { name_english?: string } | undefined)?.name_english ??
    fallback
  );
}

export function formatBsTitle(p: PanchangaDay, fallbackDay?: number, fallbackMonth?: number, fallbackYear?: number): string {
  const detail = getPanchangaDetail(p);
  const bs = (detail?.bs_date ?? p.bs_date) as { year?: number; month?: number; day?: number; month_name?: string } | undefined;
  const weekdayEn = (detail?.vaara as { name_english?: string } | undefined)?.name_english ?? p.weekday;

  if (bs?.month_name && bs.day && bs.year) {
    return `${bs.month_name} ${bs.day}, ${bs.year}${weekdayEn ? `, ${weekdayEn}` : ""}`;
  }
  if (fallbackMonth && fallbackDay && fallbackYear) {
    return `${BS_MONTH_NAMES[fallbackMonth - 1]} ${fallbackDay}, ${fallbackYear}${weekdayEn ? `, ${weekdayEn}` : ""}`;
  }
  return p.display?.bs_ne ?? p.date_bs ?? "—";
}

function titleizeWords(text: string): string {
  return text.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function tithiNameOnly(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const stripped = name
    .replace(/^(शुक्ल|कृष्ण)\s*/i, "")
    .replace(/^(Shukla|Krishna)\s*/i, "")
    .trim();
  return stripped || name;
}

function pakshaShortFromPanchanga(p: PanchangaDay): { ne?: string; en?: string } {
  const detail = getPanchangaDetail(p);
  const paksha = detail?.paksha as { label_en?: string; label_ne?: string; name?: string } | undefined;
  const labelNe = paksha?.label_ne ?? p.paksha?.label_ne ?? p.paksha_ne ?? "";
  const labelEn = paksha?.label_en ?? p.paksha?.label_en ?? "";
  const name = (paksha?.name ?? (typeof p.paksha === "string" ? p.paksha : "")).toLowerCase();

  if (labelNe.includes("शुक्ल") || /shukla/i.test(labelEn) || name === "shukla") {
    return { ne: "शुक्ल", en: "Shukla" };
  }
  if (labelNe.includes("कृष्ण") || /krishna/i.test(labelEn) || name === "krishna") {
    return { ne: "कृष्ण", en: "Krishna" };
  }
  return {};
}

/** Lunar month Devanagari → English (for paksha labels like "श्रावण शुक्ल पक्ष"). */
const LUNAR_MONTH_NE_TO_EN: Record<string, string> = {
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

/**
 * Locale-aware paksha label. Converts Nepali month+paksha strings
 * (e.g. "श्रावण शुक्ल पक्ष") to English ("Shravana Shukla Paksha") when needed.
 */
export function formatPakshaLabel(
  p: PanchangaDay | undefined,
  lang?: string,
  fallbackNe?: string | null,
  fallbackEn?: string | null,
): string | undefined {
  const detail = p ? getPanchangaDetail(p) : undefined;
  const paksha = detail?.paksha as { label_en?: string; label_ne?: string } | undefined;
  const ne =
    paksha?.label_ne ?? p?.paksha?.label_ne ?? p?.paksha_ne ?? fallbackNe ?? undefined;
  const enRaw =
    paksha?.label_en ?? p?.paksha?.label_en ?? fallbackEn ?? undefined;

  if (normalizeLang(lang) !== "en") return ne ?? enRaw;

  // Prefer a clean Latin label from the API.
  if (enRaw && !/[\u0900-\u097F]/.test(enRaw)) return enRaw;

  if (!ne) return enRaw;
  let out = ne;
  for (const [n, e] of Object.entries(LUNAR_MONTH_NE_TO_EN)) {
    out = out.replaceAll(n, e);
  }
  out = out
    .replace(/शुक्ल\s*पक्ष/g, "Shukla Paksha")
    .replace(/कृष्ण\s*पक्ष/g, "Krishna Paksha")
    .replace(/शुक्ल/g, "Shukla")
    .replace(/कृष्ण/g, "Krishna")
    .replace(/पक्ष/g, "Paksha")
    .replace(/\s+/g, " ")
    .trim();
  return out || enRaw;
}

/** e.g. शुक्ल अष्टमी / Krishna Ashtami */
export function formatTithiWithPaksha(p: PanchangaDay, lang: "ne" | "en" = "ne"): string | undefined {
  const detail = getPanchangaDetail(p);
  const tithi = (detail?.tithi ?? p.tithi) as AngaDetail | undefined;
  const tithiNe = tithiNameOnly(tithi?.name_ne ?? p.tithi?.name_ne);
  const tithiEn = tithiNameOnly(tithi?.name ?? p.tithi?.name);
  const short = pakshaShortFromPanchanga(p);

  if (lang === "en") {
    if (short.en && tithiEn) return `${short.en} ${tithiEn}`;
    return tithiEn ?? tithiNe;
  }
  if (short.ne && tithiNe) return `${short.ne} ${tithiNe}`;
  return tithiNe ?? tithiEn;
}

export function formatPakshaTithiLine(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const paksha = detail?.paksha as { label_en?: string; label_ne?: string; name?: string } | undefined;
  const tithi = (detail?.tithi ?? p.tithi) as AngaDetail | undefined;

  const tithiEn = tithi?.name ?? p.tithi?.name;
  const pakshaEn = paksha?.label_en ?? p.paksha?.label_en;
  if (pakshaEn && tithiEn) {
    const base = pakshaEn.replace(/\s*paksha$/i, "").trim();
    return `${titleizeWords(base)} ${tithiEn}`;
  }

  const labelNe = paksha?.label_ne ?? p.paksha?.label_ne;
  const tithiNe = tithi?.name_ne ?? p.tithi?.name_ne;
  if (labelNe && tithiNe) return `${labelNe} ${tithiNe}`;
  return pakshaEn ?? tithiEn ?? labelNe ?? tithiNe;
}

export function getPakshaEmoji(p: PanchangaDay): string {
  const detail = getPanchangaDetail(p);
  const paksha = detail?.paksha as { name?: string } | undefined;
  const name = (paksha?.name ?? "").toLowerCase();
  return name === "shukla" ? "🌓" : "🌗";
}

export function formatPakshaNepaliDisplay(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const paksha = detail?.paksha as { label_ne?: string } | undefined;
  const label = paksha?.label_ne ?? p.paksha?.label_ne ?? p.paksha_ne;
  if (!label) return undefined;
  return `${label} ${getPakshaEmoji(p)}`;
}

/** Short NS subtitle e.g. "अनालागा, 1146 N.S." */
export function formatNepalSambatSubtitle(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const ns = detail?.ns_date as { paksha_ne?: string; year?: number } | undefined;
  if (ns?.paksha_ne && ns.year != null) {
    return `${ns.paksha_ne}, ${ns.year} N.S.`;
  }
  const display = detail?.display as { ns_ne?: string } | undefined;
  return display?.ns_ne ?? p.display?.ns_ne;
}

export function formatNepalSambatDisplay(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const display = detail?.display as { ns_ne?: string } | undefined;
  const ns = detail?.ns_date as {
    year?: number;
    paksha_ne?: string;
    day?: number;
    label_ne?: string;
  } | undefined;
  const tithiNe =
    (detail?.tithi as { name_ne?: string } | undefined)?.name_ne ??
    p.tithi?.name_ne;

  if (ns?.year != null && ns.paksha_ne && tithiNe && ns.day != null) {
    return `ने.सं. ${toNepaliDigits(ns.year)} ${ns.paksha_ne} ${tithiNe} - ${toNepaliDigits(ns.day)}`;
  }

  if (display?.ns_ne) return display.ns_ne;
  if (ns?.label_ne) {
    return ns.year != null ? `ने.सं. ${toNepaliDigits(ns.year)} ${ns.label_ne}` : ns.label_ne;
  }
  return p.display?.ns_ne;
}

/** @deprecated use formatNepalSambatDisplay */
export function formatNepalSambatShort(p: PanchangaDay): string | undefined {
  return formatNepalSambatDisplay(p);
}

export function formatShakaYear(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const bs = (detail?.bs_date ?? p.bs_date) as { year?: number } | undefined;
  if (bs?.year) return String(bs.year - 135);
  return undefined;
}

export function formatNepalSambatFull(p: PanchangaDay): string | undefined {
  return formatNepalSambatDisplay(p);
}

export function formatDinamaanShort(p: PanchangaDay): string | undefined {
  return formatDurationFull(p, "dinamaan");
}

export function formatRatrimanaFull(p: PanchangaDay): string | undefined {
  return formatDurationFull(p, "ratrimana");
}

export function formatDurationFull(
  p: PanchangaDay,
  field: "dinamaan" | "ratrimana",
  lang: "ne" | "en" | "hi" = "ne",
): string | undefined {
  const dm = getDetailValue<DurationBlock>(p, field);
  if (!dm) return undefined;
  if (lang === "en") {
    return (
      dm.label_en_full ??
      (dm.hours != null && dm.minutes != null && dm.seconds != null
        ? `${dm.hours} Hours ${dm.minutes} Mins ${String(dm.seconds).padStart(2, "0")} Secs`
        : dm.label_en)
    );
  }
  return (
    dm.label_ne_full ??
    (dm.hours != null && dm.minutes != null && dm.seconds != null
      ? `${toNepaliDigits(dm.hours)} घण्टा ${toNepaliDigits(dm.minutes)} मिनेट ${toNepaliDigits(String(dm.seconds).padStart(2, "0"))} सेकेन्ड`
      : dm.label_ne)
  );
}

export function formatMadhyahnaDisplay(
  p: PanchangaDay,
  lang: "ne" | "en" | "hi" = "ne",
): string | undefined {
  const block = getDetailValue<{ local_time_short?: string; local_time?: string }>(p, "madhyahna");
  const time = block?.local_time_short ?? block?.local_time;
  const short = formatTimeShort(time);
  if (!short) return undefined;
  if (lang !== "en") return toNepaliDigits(short);
  const [hStr, mStr] = short.split(":");
  let h = Number(hStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

const RASHI_NE = [
  "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
] as const;

export const RASHI_SYM = [
  "", "", "", "", "", "",
  "", "", "", "", "", "",
] as const;

const RASHI_DISPLAY_NE: Record<string, string> = {
  मेष: "मेष",
  वृष: "वृषभ",
  मिथुन: "मिथुन",
  कर्कट: "कर्कट",
  सिंह: "सिंह",
  कन्या: "कन्या",
  तुला: "तुला",
  वृश्चिक: "वृश्चिक",
  धनु: "धनु",
  मकर: "मकर",
  कुम्भ: "कुम्भ",
  मीन: "मीन",
};

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

export function rashiNeFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_NE[rashi - 1];
}

export function rashiSymFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_SYM[rashi - 1];
}

export function formatRashiDisplayNe(nameNe?: string): string | undefined {
  if (!nameNe) return undefined;
  return RASHI_DISPLAY_NE[nameNe] ?? nameNe;
}

/** Western zodiac names for English UI (Mesha → Aries, etc.). */
const RASHI_NE_TO_WESTERN: Record<string, string> = {
  मेष: "Aries",
  वृष: "Taurus",
  वृषभ: "Taurus",
  मिथुन: "Gemini",
  कर्कट: "Cancer",
  कर्क: "Cancer",
  सिंह: "Leo",
  कन्या: "Virgo",
  तुला: "Libra",
  वृश्चिक: "Scorpio",
  धनु: "Sagittarius",
  मकर: "Capricorn",
  कुम्भ: "Aquarius",
  मीन: "Pisces",
};

const RASHI_EN_TO_WESTERN: Record<string, string> = {
  Mesha: "Aries",
  Vrishabha: "Taurus",
  Mithuna: "Gemini",
  Karka: "Cancer",
  Karkata: "Cancer",
  Simha: "Leo",
  Kanya: "Virgo",
  Tula: "Libra",
  Vrishchika: "Scorpio",
  Dhanu: "Sagittarius",
  Makara: "Capricorn",
  Kumbha: "Aquarius",
  Meena: "Pisces",
};

/** English rāśi → Devanagari (API often sends only lagna_en). */
const RASHI_EN_TO_NE: Record<string, string> = {
  Mesha: "मेष",
  Vrishabha: "वृष",
  Mithuna: "मिथुन",
  Karka: "कर्कट",
  Karkata: "कर्कट",
  Simha: "सिंह",
  Kanya: "कन्या",
  Tula: "तुला",
  Vrishchika: "वृश्चिक",
  Dhanu: "धनु",
  Makara: "मकर",
  Kumbha: "कुम्भ",
  Meena: "मीन",
};

/** Locale-aware rashi label: Devanagari for ne, Western zodiac for en. */
export function formatRashiDisplay(
  nameNe?: string,
  nameEn?: string,
  lang?: string,
): string | undefined {
  if (normalizeLang(lang) === "en") {
    const raw = nameEn ?? nameNe;
    if (!raw) return undefined;
    return RASHI_EN_TO_WESTERN[raw] ?? RASHI_NE_TO_WESTERN[raw] ?? raw;
  }
  const ne = nameNe ?? (nameEn ? RASHI_EN_TO_NE[nameEn] : undefined) ?? nameEn;
  return formatRashiDisplayNe(ne);
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

export function getChandraRashiSpans(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const spans = (detail?.chandra_rashi_spans ?? p.chandra_rashi_spans) as
    | import("@/lib/api").RashiSpan[]
    | undefined;
  return spans?.length ? spans : undefined;
}

export function getNakshatraPadaSpans(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const spans = (detail?.nakshatra_pada_spans ?? p.nakshatra_pada_spans) as
    | import("@/lib/api").NakshatraPadaSpan[]
    | undefined;
  return spans?.length ? spans : undefined;
}

export function getSuryaRashi(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = (detail?.surya_rashi ?? p.surya_rashi) as
    | { name_ne?: string; number?: number; name?: string }
    | undefined;
  if (block?.name_ne || block?.name) return block;
  if (p.surya_rashi_ne) return { name_ne: p.surya_rashi_ne };
  return undefined;
}

export function getSuryaNakshatra(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = (detail?.surya_nakshatra ?? p.surya_nakshatra) as
    | { name_ne?: string; name?: string }
    | undefined;
  return block?.name_ne || block?.name ? block : undefined;
}

export function getChandrabalam(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (detail?.chandrabalam ?? p.chandrabalam) as import("@/lib/api").BalamBlock | undefined;
}

export function getTarabalam(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (detail?.tarabalam ?? p.tarabalam) as import("@/lib/api").BalamBlock | undefined;
}

export function getTarabalaTable(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (p.tarabala_table ?? detail?.tarabala_table) as import("@/lib/api").NavataraTableBlock | undefined;
}

export function getChandrabalamTable(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (p.chandrabala_table ?? detail?.chandrabala_table) as
    | import("@/lib/api").NavataraTableBlock
    | undefined;
}

export function getHoraSlots(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = (p.hora ?? detail?.hora) as import("@/lib/api").ApiHoraSlot[] | undefined;
  return Array.isArray(block) ? block : [];
}

export function getHoraDaySlots(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = (p.hora_day ?? detail?.hora_day) as import("@/lib/api").ApiHoraSlot[] | undefined;
  if (Array.isArray(block) && block.length) return block;
  return getHoraSlots(p).filter((slot) => slot.phase === "day");
}

export function getPanchakaRahita(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const rows = (detail?.panchaka_rahita ?? p.panchaka_rahita) as
    | import("@/lib/api").PanchakaSegment[]
    | undefined;
  return rows?.length ? rows : undefined;
}

export function getUdayaLagna(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const rows = (detail?.udaya_lagna ?? p.udaya_lagna ?? detail?.lagna_spans ?? p.lagna_spans) as
    | import("@/lib/api").UdayaLagnaRow[]
    | undefined;
  return rows?.length ? rows : undefined;
}

export function formatShortClock(time?: string | null, lang?: string): string | undefined {
  if (!time) return undefined;
  const t = formatTimeShort(time) ?? time.slice(0, 5);
  return formatLocaleDigits(t, lang);
}

export function formatTimeRangeShort(
  start?: string | null,
  end?: string | null,
  lang?: string
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

type PlanetDetail = {
  longitude?: number;
  rashi?: number;
  rashi_name?: string;
  rashi_ne?: string;
  deg_in_rashi?: number;
  dms_in_rashi?: string;
  retrograde?: boolean;
  is_retrograde?: boolean;
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
  siderealLongitude?: number;
  nakshatraNe?: string;
  nakshatraEn?: string;
  pada?: number;
  nakshatraLordNe?: string;
  nakshatraLordEn?: string;
  nakshatraSubLordNe?: string;
  nakshatraSubLordEn?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
};

function planetLabelPair(key: string): { label: string; labelEn: string } {
  const g = GRAHA_NAME[key as GrahaKey];
  return { label: g?.ne ?? key, labelEn: g?.en ?? key };
}

function rashiEnFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_EN_NAMES[rashi - 1];
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

const VIMSHOTTARI: Array<[GrahaKey, number]> = [
  ["ketu", 7], ["venus", 20], ["sun", 6], ["moon", 10], ["mars", 7],
  ["rahu", 18], ["jupiter", 16], ["saturn", 19], ["mercury", 17],
];
const VIMSHOTTARI_TOTAL = 120;

function subLordKeyFromLongitude(longitude: number): GrahaKey {
  const span = 360 / 27;
  const norm = ((longitude % 360) + 360) % 360;
  const idx = Math.min(26, Math.floor(norm / span));
  const posInNak = norm - idx * span;
  const startIdx = idx % 9;
  let acc = 0;
  for (let i = 0; i < 9; i += 1) {
    const [key, years] = VIMSHOTTARI[(startIdx + i) % 9]!;
    acc += (years / VIMSHOTTARI_TOTAL) * span;
    if (posInNak < acc - 1e-9) return key;
  }
  return VIMSHOTTARI[(startIdx + 8) % 9]![0];
}

export function nakshatraFieldsFromLongitude(longitude: number): NakshatraFields {
  const norm = ((longitude % 360) + 360) % 360;
  const span = 360 / 27;
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

export function formatDegreeInRashi(longitude: number, rashiNe?: string): string {
  const norm = ((longitude % 360) + 360) % 360;
  const degInRashi = norm % 30;
  let d = Math.floor(degInRashi);
  let totalSec = Math.round((degInRashi - d) * 3600);
  let m = Math.floor(totalSec / 60);
  let s = totalSec % 60;
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  const pad = (n: number) => toNepaliDigits(String(n).padStart(2, "0"));
  const rashi = rashiNe ? `${rashiNe} ` : "";
  return `${pad(d)}° ${rashi}${pad(m)}′ ${pad(s)}″`;
}

function planetNakshatraFields(info: PlanetDetail): NakshatraFields {
  const nak = info.nakshatra;
  if (nak?.number) {
    const lord = nak.lord as GrahaKey | undefined;
    return {
      nakshatraNe: nak.name_ne ?? NAKSHATRA_ICONS[nak.number - 1]?.ne,
      nakshatraEn: nak.name ?? NAKSHATRA_ICONS[nak.number - 1]?.en,
      pada: nak.pada,
      nakshatraLordNe: lord ? GRAHA_NAME[lord]?.ne : undefined,
      nakshatraLordEn: lord ? GRAHA_NAME[lord]?.en : undefined,
    };
  }
  const lon =
    info.longitude ??
    (info.rashi != null && info.deg_in_rashi != null
      ? (info.rashi - 1) * 30 + info.deg_in_rashi
      : undefined);
  return lon != null ? nakshatraFieldsFromLongitude(lon) : {};
}

export function getPlanetsAnchorLabel(p: PanchangaDay, lang?: string): string {
  const detail = getPanchangaDetail(p);
  const anchor = (detail?.planets_anchor ?? p.planets_anchor) as
    | { label_ne?: string; label_en?: string; local_time?: string }
    | undefined;
  const fallbackNe = "उदयकालिक स्पष्टग्रह (सूर्योदय)";
  const fallbackEn = "Planets at sunrise";
  const label = anchor?.label_ne || anchor?.label_en
    ? pickLocale(
        lang,
        anchor.label_ne ?? anchor.label_en ?? fallbackNe,
        anchor.label_en ?? anchor.label_ne ?? fallbackEn,
      )
    : pickLocale(lang, fallbackNe, fallbackEn);
  return anchor?.local_time
    ? `${label} (${toNepaliDigits(anchor.local_time)})`
    : label;
}

export type InstantLagna = {
  number?: number;
  name_ne?: string;
  name?: string;
  degree_in_rashi?: number;
  longitude?: number;
  /** Ecliptic latitude (shara) — 0 for the lagna by definition. */
  latitude?: number;
  right_ascension?: number;
  declination?: number;
  /** Ascendant motion in degrees/day. */
  speed?: number;
};

/** Birth-moment (ephemeris) or sunrise lagna block from the API. */
export function getInstantLagna(p: PanchangaDay): InstantLagna | undefined {
  const detail = getPanchangaDetail(p);
  if (p.mode === "ephemeris") {
    const instant = detail?.instant_lagna as InstantLagna | undefined;
    if (instant) return instant;
  }
  const lagna = (detail?.lagna ?? p.lagna) as InstantLagna | string | undefined;
  if (!lagna || typeof lagna === "string") return undefined;
  return lagna;
}

/** Sidereal lagna longitude — ephemeris `longitude` is the single source of truth. */
export function resolveLagnaSiderealLongitude(lagna: InstantLagna): number | undefined {
  if (lagna.longitude != null) return lagna.longitude;
  const { number, degree_in_rashi } = lagna;
  if (number != null && degree_in_rashi != null) {
    return (number - 1) * 30 + degree_in_rashi;
  }
  return undefined;
}

export function getSunriseLagnaRow(p: PanchangaDay): PlanetRow | undefined {
  const lagna = getInstantLagna(p);
  if (!lagna) return undefined;
  const lon =
    resolveLagnaSiderealLongitude(lagna) ??
    (lagna.number != null && lagna.degree_in_rashi != null
      ? (lagna.number - 1) * 30 + lagna.degree_in_rashi
      : undefined);
  if (lon == null) return undefined;
  const rashiNum = Math.floor((((lon % 360) + 360) % 360) / 30) + 1;
  return {
    key: "lagna",
    label: "लग्न",
    labelEn: "Lagna",
    rashiNe: lagna.name_ne ?? rashiNeFromNumber(rashiNum),
    rashiEn: lagna.name ?? rashiEnFromNumber(rashiNum),
    coords: longitudeToDegreeCells(lon),
    siderealLongitude: lon,
    ...nakshatraFieldsFromLongitude(lon),
  };
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

export function getLagnaDisplay(
  p: PanchangaDay
): {
  nameNe: string;
  degree?: string;
  degreeInRashi?: number;
  rashiNum?: number;
  longitude?: number;
} | undefined {
  const lagna = getInstantLagna(p);
  if (!lagna) {
    const top = p.lagna;
    if (typeof top === "string") return { nameNe: top };
    return undefined;
  }

  const longitude = resolveLagnaSiderealLongitude(lagna);
  if (longitude != null) {
    const { rashiNum, nameNe, degreeInRashi } = lagnaRashiFromLongitude(longitude);
    return {
      nameNe,
      degree: toNepaliDigits(degreeInRashi.toFixed(1)),
      degreeInRashi,
      rashiNum,
      longitude,
    };
  }

  const nameNe = lagna.name_ne ?? lagna.name;
  if (!nameNe) return undefined;
  const degreeInRashi = lagna.degree_in_rashi;
  const degree =
    degreeInRashi != null ? toNepaliDigits(degreeInRashi.toFixed(1)) : undefined;
  return { nameNe, degree, degreeInRashi, rashiNum: lagna.number, longitude: undefined };
}

function planetDegreeCells(info: PlanetDetail): string {
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

function isInstantPlanetsMode(p: PanchangaDay): boolean {
  const detail = getPanchangaDetail(p);
  const anchor = (detail?.planets_anchor ?? p.planets_anchor) as { type?: string } | undefined;
  return p.mode === "ephemeris" || anchor?.type === "instant";
}

function resolvePlanetsRecord(
  p: PanchangaDay,
): Record<string, PlanetDetail | string> | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.planets as Record<string, PlanetDetail | string> | undefined;
  const fromTop = p.planets as Record<string, PlanetDetail | string> | undefined;
  if (isInstantPlanetsMode(p)) {
    // At-time payloads historically kept sunrise positions at the top level.
    return fromDetail ?? fromTop;
  }
  return fromDetail ?? fromTop;
}

export function getPlanetRows(p: PanchangaDay): PlanetRow[] {
  const planets = resolvePlanetsRecord(p);
  if (!planets) return [];

  const order = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];

  return order
    .filter((key) => key in planets)
    .map((key) => {
      const { label, labelEn } = planetLabelPair(key);
      const info = planets[key];
      if (typeof info === "string") {
        return { key, label, labelEn, coords: info };
      }
      const rashiNe = info.rashi_ne ?? rashiNeFromNumber(info.rashi);
      const rashiEn = info.rashi_name ?? rashiEnFromNumber(info.rashi) ?? info.rashi_ne;
      const coords = planetDegreeCells(info);
      const siderealLongitude =
        info.longitude ??
        (info.rashi != null && info.deg_in_rashi != null
          ? (info.rashi - 1) * 30 + info.deg_in_rashi
          : undefined);
      return {
        key,
        label,
        labelEn,
        rashiNe,
        rashiEn,
        coords,
        siderealLongitude,
        isRetrograde: info.is_retrograde ?? info.retrograde ?? false,
        isCombust: info.is_combust ?? false,
        ...planetNakshatraFields(info),
      };
    });
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

export function getPlanetGocharLines(
  p: PanchangaDay,
  lang?: string,
): {
  key: string;
  label: string;
  rashi?: string;
  degree: string;
  value: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
}[] {
  const planets = resolvePlanetsRecord(p);
  if (!planets) return [];

  const order = [
    "sun",
    "moon",
    "mars",
    "mercury",
    "jupiter",
    "venus",
    "saturn",
    "rahu",
    "ketu",
  ] as const;

  return order
    .filter((key) => key in planets)
    .map((key) => {
      const { label: ne, labelEn: en } = planetLabelPair(key);
      const label = pickLocale(lang, ne, en);
      const info = planets[key];
      if (typeof info === "string") {
        return { key, label, degree: info, value: info };
      }
      const { rashi, degree } = formatPlanetGocharParts(info, lang);
      return {
        key,
        label,
        rashi,
        degree,
        value: rashi ? `${rashi} ${degree}` : degree,
        isRetrograde: info.is_retrograde ?? info.retrograde ?? false,
        isCombust: info.is_combust ?? false,
      };
    });
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

type MuhurtaDetail = {
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

function formatMuhurtaTimingEntry(
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

function formatMuhurtaRange(start?: string, end?: string): string | undefined {
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

export function getAbhijitMuhurta(p: PanchangaDay): AbhijitMuhurtaInfo | null {
  const detail = getPanchangaDetail(p);
  const m = (detail?.muhurta ?? p.muhurta) as MuhurtaDetail | undefined;
  return abhijitFromWindow(m?.abhijit);
}

/** Abhijit window the month calendar already computed. */
export function abhijitFromCalendarDay(day: CalendarDay): AbhijitMuhurtaInfo | null {
  const nested = day.panchanga as { muhurta?: { abhijit?: { start_time?: string; end_time?: string; solar_noon?: string } } } | undefined;
  return abhijitFromWindow(day.abhijit ?? nested?.muhurta?.abhijit);
}

function abhijitFromWindow(
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

/**
 * Raw inauspicious day-periods (Rahu Kaal, Yamaganda, Gulika, plus any
 * `inauspicious_timings` segments like Varjyam / Dur Muhurtam) with their
 * local clock ranges — used by the day-cycle timeline's अशुभ row. Unlike
 * {@link getMuhurtaRows} this returns machine-parseable times, not display
 * strings.
 */
export function getInauspiciousWindows(p: PanchangaDay): InauspiciousWindow[] {
  const detail = getPanchangaDetail(p);
  const m = (detail?.muhurta ?? p.muhurta) as MuhurtaDetail | undefined;
  if (!m) return [];

  const out: InauspiciousWindow[] = [];
  const pushWin = (
    key: string,
    ne: string,
    en: string,
    w?: { start_time?: string; end_time?: string },
  ) => {
    if (w?.start_time && w?.end_time) {
      out.push({ key, nameNe: ne, nameEn: en, start: w.start_time, end: w.end_time });
    }
  };

  pushWin("rahu_kalam", "राहु", "Rahu", m.rahu_kalam);
  pushWin("yamaganda", "यमगण्ड", "Yamaganda", m.yamaganda);
  pushWin("gulika", "गुलिक", "Gulika", m.gulika);

  for (const entry of m.inauspicious_timings ?? []) {
    const key = entry.key || "ashubha";
    const ne = entry.name_ne || entry.name_en || entry.key || "अशुभ";
    const en = entry.name_en || entry.name_ne || entry.key || "Ashubha";
    for (const seg of entry.segments ?? []) {
      if (!seg.start_local_time_short) continue;
      if (seg.until_full_night && !seg.end_local_time_short) {
        // Runs to next sunrise — no explicit end time.
        out.push({
          key,
          nameNe: ne,
          nameEn: en,
          start: seg.start_local_time_short,
          end: "",
          tillFullNight: true,
        });
      } else if (seg.end_local_time_short) {
        out.push({
          key,
          nameNe: ne,
          nameEn: en,
          start: seg.start_local_time_short,
          end: seg.end_local_time_short,
        });
      }
    }
  }

  return out;
}

export function getMuhurtaRows(
  p: PanchangaDay,
  lang?: string,
): {
  label: string;
  value: string;
  auspicious?: boolean;
}[] {
  const detail = getPanchangaDetail(p);
  const m = (detail?.muhurta ?? p.muhurta) as MuhurtaDetail | undefined;
  if (!m) return [];

  if (m.auspicious_timings?.length || m.inauspicious_timings?.length) {
    const good = (m.auspicious_timings ?? [])
      .map((entry) => formatMuhurtaTimingEntry(entry, lang))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const bad = (m.inauspicious_timings ?? [])
      .map((entry) => formatMuhurtaTimingEntry(entry, lang))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    return [...good, ...bad];
  }

  const rows: { label: string; value: string; auspicious?: boolean }[] = [];
  const isEn = normalizeLang(lang) === "en";

  const rahu = formatMuhurtaRange(m.rahu_kalam?.start_time, m.rahu_kalam?.end_time);
  if (rahu) rows.push({ label: isEn ? "Rahu Kaal" : "राहु काल", value: rahu });

  const yama = formatMuhurtaRange(m.yamaganda?.start_time, m.yamaganda?.end_time);
  if (yama) rows.push({ label: isEn ? "Yamaganda" : "यमगण्ड", value: yama });

  const gulika = formatMuhurtaRange(m.gulika?.start_time, m.gulika?.end_time);
  if (gulika) rows.push({ label: isEn ? "Gulika Kaal" : "गुलिक काल", value: gulika });

  const abhijit = getAbhijitMuhurta(p);
  if (abhijit) {
    rows.push({
      label: isEn ? "Abhijit Muhurta" : "अभिजित् मुहूर्त",
      value: abhijit.noonDisplay
        ? isEn
          ? `${abhijit.rangeDisplay} (noon ${abhijit.noonDisplay})`
          : `${abhijit.rangeDisplay} (मध्यान्ह ${abhijit.noonDisplay})`
        : abhijit.rangeDisplay,
      auspicious: m?.abhijit?.is_auspicious ?? true,
    });
  }

  return rows;
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

function parseBsDayInMonth(
  festival: Festival,
  bsYear: number,
  bsMonth: number,
): number | null {
  if (festival.bs_start_date) {
    const [y, m, d] = festival.bs_start_date.split("-").map(Number);
    if (y === bsYear && m === bsMonth && d) return d;
  }
  if (festival.start_date) {
    const bs = adToBS(new Date(`${festival.start_date}T12:00:00`));
    if (bs.year === bsYear && bs.month === bsMonth) return bs.day;
  }
  return null;
}

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function normalizeFestKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0900-\u097F]+/g, " ")
    .trim();
}

function isTithiOnlyLabel(name: string): boolean {
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

/** Map any festival label to a stable alias id for deduplication. */
function buildFestivalAliasIndex(festivals: Festival[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const festival of festivals) {
    const alias = `fest:${festival.id}`;
    for (const label of [festival.name_ne, festival.name_en, festival.name, festival.id]) {
      if (!label) continue;
      index.set(normalizeFestKey(label), alias);
    }
  }
  return index;
}

function resolveFestivalAlias(name: string, aliasIndex: Map<string, string>): string {
  return aliasIndex.get(normalizeFestKey(name)) ?? `name:${normalizeFestKey(name)}`;
}

function preferLocalizedName(current: string, candidate: string, preferNe: boolean): string {
  if (preferNe) {
    if (hasDevanagari(candidate) && !hasDevanagari(current)) return candidate;
    return current;
  }
  if (!hasDevanagari(candidate) && hasDevanagari(current)) return candidate;
  return current;
}

/** Collapse Nepali + English duplicates on the same calendar day. */
function dedupeDayFestivalNames(
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

/** Month-wide चाडपर्व list for the patro-style aside tab. */
export function buildMonthFestivalEntries(
  bsYear: number,
  bsMonth: number,
  days: CalendarDay[],
  apiFestivals: Festival[] = [],
  lang?: string,
): MonthFestivalEntry[] {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  const preferNe = !isEn;
  const monthNe = BS_MONTHS_NE[bsMonth - 1];
  const monthEn = BS_MONTH_NAMES[bsMonth - 1];
  const aliasIndex = buildFestivalAliasIndex(apiFestivals);
  const byDay = new Map<number, MonthFestivalEntry[]>();
  const claimed = new Map<number, Set<string>>();

  const add = (
    bsDay: number,
    name: string,
    opts?: { isPublicHoliday?: boolean; alias?: string },
  ) => {
    const trimmed = name.trim();
    if (!trimmed || isTithiOnlyLabel(trimmed)) return false;
    const alias = opts?.alias ?? resolveFestivalAlias(trimmed, aliasIndex);
    const dayClaims = claimed.get(bsDay) ?? new Set<string>();
    if (dayClaims.has(alias)) return false;

    const list = byDay.get(bsDay) ?? [];
    const existing = list.find((entry) => resolveFestivalAlias(entry.name, aliasIndex) === alias);
    if (existing) {
      existing.name = preferLocalizedName(existing.name, trimmed, preferNe);
      existing.isPublicHoliday ||= opts?.isPublicHoliday;
      dayClaims.add(alias);
      claimed.set(bsDay, dayClaims);
      return false;
    }

    list.push({ name: trimmed, bsDay, isPublicHoliday: opts?.isPublicHoliday });
    byDay.set(bsDay, list);
    dayClaims.add(alias);
    claimed.set(bsDay, dayClaims);
    return true;
  };

  add(1, isEn ? `${monthEn} Sankranti` : `${monthNe} संक्रान्ति`, {
    alias: `sankranti:${bsMonth}`,
  });

  for (const festival of apiFestivals) {
    const bsDay = parseBsDayInMonth(festival, bsYear, bsMonth);
    if (bsDay == null) continue;
    const name = isEn
      ? (festival.name_en ?? festival.name_ne ?? festival.name ?? festival.id)
      : (festival.name_ne ?? festival.name_en ?? festival.name ?? festival.id);
    add(bsDay, name ?? "—", {
      isPublicHoliday: festival.is_public_holiday,
      alias: `fest:${festival.id}`,
    });
  }

  for (const day of days) {
    const names = dedupeDayFestivalNames(day.festivals ?? [], aliasIndex, preferNe);
    for (const name of names) {
      add(day.day, name);
    }
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a - b)
    .map(([bsDay, entries]) => {
      if (entries.length === 1) return entries[0]!;
      return {
        bsDay,
        name: entries.map((entry) => entry.name).join(", "),
        isPublicHoliday: entries.some((entry) => entry.isPublicHoliday),
      };
    });
}

export function getEventNames(
  p: PanchangaDay,
  dayFestivals: string[],
  lang?: string,
): string[] {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  const fromApi = (p.festivals ?? [])
    .map((f) =>
      isEn
        ? (f.name_en ?? f.name_ne ?? f.name ?? "")
        : (f.name_ne ?? f.name_en ?? f.name ?? ""),
    )
    .filter(Boolean);
  const merged = [...fromApi];
  for (const f of dayFestivals) {
    if (!merged.includes(f)) merged.push(f);
  }
  return merged;
}

export function getShraddhaLabel(tithiNameNe?: string | null, lang?: string): string | undefined {
  if (!tithiNameNe) return undefined;
  if (tithiNameNe === "पूर्णिमा" || tithiNameNe === "औंसी") return undefined;
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  if (isEn) {
    // Keep the Nepali tithi token when we lack an English map; callers pass localized day festivals.
    return `${tithiNameNe} Shraddha`;
  }
  return `${tithiNameNe} श्राद्ध`;
}

function hasNamedPurnimaFestival(labels: string[]): boolean {
  return labels.some((label) => {
    const trimmed = label.trim();
    if (trimmed === "पूर्णिमा" || trimmed === "Purnima") return false;
    return /पूर्णिमा|पुन्ही|purnima/i.test(trimmed);
  });
}

export function getDinVisheshLabels(
  p: PanchangaDay,
  dayFestivals: string[],
  lang?: string,
): string[] {
  const isEn = (lang ?? "ne").slice(0, 2) === "en";
  const detail = getPanchangaDetail(p);
  const labels = getEventNames(p, dayFestivals, lang);

  const markers = detail?.markers as {
    is_purnima?: boolean;
    is_Aaushi?: boolean;
    is_ekadashi?: boolean;
  } | undefined;

  const purnima = isEn ? "Purnima" : "पूर्णिमा";
  const aaushi = isEn ? "Amavasya" : "औंसी";
  const ekadashi = isEn ? "Ekadashi" : "एकादशी";

  if (
    markers?.is_purnima &&
    !hasNamedPurnimaFestival(labels) &&
    !labels.includes(purnima) &&
    !labels.includes("पूर्णिमा")
  ) {
    labels.push(purnima);
  }
  if (markers?.is_Aaushi && !labels.includes(aaushi) && !labels.includes("औंसी")) {
    labels.push(aaushi);
  }
  if (markers?.is_ekadashi && !labels.includes(ekadashi) && !labels.includes("एकादशी")) {
    labels.push(ekadashi);
  }

  const tithiNe =
    (detail?.tithi as { name_ne?: string } | undefined)?.name_ne ??
    p.tithi?.name_ne;
  const shraddha = getShraddhaLabel(tithiNe, lang);
  if (shraddha && !labels.some((label) => label.includes(tithiNe ?? ""))) {
    labels.push(shraddha);
  }

  return labels;
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

export function getNivasShool(p: PanchangaDay): NivasShoolBlock | undefined {
  return getDetailValue<NivasShoolBlock>(p, "nivas_shool");
}

/**
 * Element span boundary — `10:42 · Baishakh 12` (ne) / `10:42 on Baishakh 12`
 * (en). Mirrors the web `formatElementStampDisplay`.
 */
export function formatElementStampDisplay(stamp: ElementStamp, lang?: string): string {
  const time = formatTimeShort(stamp.time_label) ?? stamp.time_label;
  const timeOut = formatLocaleDigits(time, lang);
  const datePart = stamp.iso.includes("T") ? stamp.iso.split("T")[0]! : stamp.iso.slice(0, 10);
  let dateOut: string;
  try {
    dateOut = formatEventDateBs(datePart, lang);
  } catch {
    dateOut = formatLocaleDigits(stamp.date_label, lang);
  }
  return normalizeLang(lang) === "en" ? `${timeOut} on ${dateOut}` : `${timeOut} · ${dateOut}`;
}

export type AyanaMark = "उ" | "द";

/** `उ`/`द` in Nepali, `N`/`S` in English. */
export function formatAyanaMarkShort(mark: AyanaMark | undefined, lang?: string): string | undefined {
  if (!mark) return undefined;
  const isEn = normalizeLang(lang) === "en";
  if (mark === "उ") return isEn ? "N" : "उ";
  if (mark === "द") return isEn ? "S" : "द";
  return mark;
}

export function isAyanaNorthMark(mark: AyanaMark | undefined): boolean {
  return mark === "उ";
}
