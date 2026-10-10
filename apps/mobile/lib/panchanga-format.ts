import type { CalendarDay, ElementStamp, PanchangaDay } from "@/lib/api";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import type { AppLanguage } from "@/lib/i18n";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { formatRashiDisplay } from "@/lib/rashi-i18n";

const NEPALI_DIGITS: Record<string, string> = {
  "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
  "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
};

function normalizeLang(lang?: string): AppLanguage {
  return lang?.slice(0, 2) === "en" ? "en" : "ne";
}

function pickLocale(lang: string | undefined, ne?: string, en?: string): string {
  return normalizeLang(lang) === "en" ? en ?? ne ?? "" : ne ?? en ?? "";
}

export function toNepaliDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => NEPALI_DIGITS[d] ?? d);
}

function formatLocaleDigits(value: string | number, lang?: string): string {
  return normalizeLang(lang) === "en" ? String(value) : toNepaliDigits(value);
}

export function formatTimeShort(time?: string | null): string | undefined {
  if (!time) return undefined;
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return `${match[1]!.padStart(2, "0")}:${match[2]!}`;
}

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

export function formatAngaPatroChain(anga?: AngaPatro | null, lang?: string): string | undefined {
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

type SolarCorrection = {
  minutes?: number;
  seconds?: number;
  minutes_total?: number;
  sign?: "dhan" | "rin";
  sign_ne?: string;
};

export type SolarCorrections = {
  belaantar?: SolarCorrection;
  deshaantar?: SolarCorrection;
  akshamsha?: SolarCorrection;
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

export function formatPatroBelaantar(c?: SolarCorrection): string | undefined {
  return formatPatroSignedCorrection(c);
}

export function formatPatroDeshaantar(c?: SolarCorrection): string | undefined {
  return formatPatroSignedCorrection(c);
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

/** BS date from YYYY-MM-DD (BS era), e.g. जेठ १५, वि.सं. २०८२. */
export function formatBsIsoDateNepali(
  bsIso?: string | null,
  opts?: { includeYear?: boolean; lang?: string },
): string | undefined {
  if (!bsIso) return undefined;
  const [ys, ms, ds] = bsIso.split("-");
  const year = Number(ys);
  const month = Number(ms);
  const day = Number(ds);
  if (!month || !day) return undefined;
  const isEn = normalizeLang(opts?.lang) === "en";
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const era = isEn ? "BS" : "वि.सं.";
  const label = `${months[month - 1]} ${formatLocaleDigits(day, opts?.lang)}`;
  if (opts?.includeYear === false || !year) return label;
  return `${label}, ${era} ${formatLocaleDigits(year, opts?.lang)}`;
}

export function formatVedicPatroTime(
  timeShort?: string | null,
  sunriseShort?: string | null,
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

export function getPanchangaDetail(p: PanchangaDay) {
  return p.detail;
}

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

/** Locale-aware paksha label (e.g. "श्रावण शुक्ल पक्ष") from API detail.paksha. */
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

  if (enRaw && !/[\u0900-\u097F]/.test(enRaw)) {
    return enRaw.replace(/\b\p{Ll}/gu, (c) => c.toUpperCase());
  }

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

type RituBlock = { name?: string; name_ne?: string; season?: string };

function getDetailValue<T>(p: PanchangaDay, key: string): T | undefined {
  const detail = getPanchangaDetail(p) as Record<string, unknown> | undefined;
  return (detail?.[key] ?? (p as Record<string, unknown>)[key]) as T | undefined;
}

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

export function getSolarCorrections(p: PanchangaDay): SolarCorrections | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.solar_corrections as SolarCorrections | undefined;
  const fromTop = p.solar_corrections as SolarCorrections | undefined;
  if (!fromDetail && !fromTop) return undefined;
  return {
    ...fromTop,
    ...fromDetail,
    belaantar: fromDetail?.belaantar ?? fromTop?.belaantar,
    deshaantar: fromDetail?.deshaantar ?? fromTop?.deshaantar,
    akshamsha: fromDetail?.akshamsha ?? fromTop?.akshamsha,
  };
}

export function getSunrise(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.sunrise?.local_time_short;
  if (fromDetail) return fromDetail;
  if (typeof p.sunrise === "object") return p.sunrise?.local_time_short;
  if (typeof p.sunrise === "string") return p.sunrise;
  return p.sun?.sunrise;
}

export function getSunset(p: PanchangaDay): string | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.sunset?.local_time_short;
  if (fromDetail) return fromDetail;
  if (typeof p.sunset === "object") return p.sunset?.local_time_short;
  if (typeof p.sunset === "string") return p.sunset;
  return p.sun?.sunset;
}

export function getSunriseDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatClockNepali(getSunrise(p), lang);
}

export function getSunsetDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatClockNepali(getSunset(p), lang);
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

function formatEventDateBs(isoDate: string, lang?: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return formatLocaleDigits(isoDate, lang);
  const bs = adToBS(new Date(y, m - 1, d));
  const isEn = normalizeLang(lang) === "en";
  const monthName = isEn ? BS_MONTH_NAMES[bs.month - 1] : BS_MONTHS_NE[bs.month - 1];
  return `${monthName} ${formatLocaleDigits(bs.day, lang)}`;
}

function getMoonTimeBlock(p: PanchangaDay, key: "moonrise" | "moonset"): MoonTimeBlock | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.[key];
  if (fromDetail?.local_time_short) return fromDetail;
  const top = p[key];
  if (top?.local_time_short) return top;
  const fallback = key === "moonrise" ? p.moon?.rise : p.moon?.set;
  if (fallback) return { local_time_short: fallback };
  return undefined;
}

export function resolveMoonEventAdDate(
  p: PanchangaDay,
  key: "moonrise" | "moonset",
  block: MoonTimeBlock,
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

export function getMoonriseDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatMoonEventDisplay(p, "moonrise", lang);
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

export function dmsInRashiToDegreeCells(dms: string): string | undefined {
  const match = dms.match(/(\d+)°(\d+)'(\d+)"/);
  if (!match) return undefined;
  return [match[1], match[2], match[3]].map((n) => toNepaliDigits(Number(n))).join("|");
}

function planetLabelPair(key: string): { label: string; labelEn: string } {
  const g = GRAHA_NAME[key as GrahaKey];
  return { label: g?.ne ?? key, labelEn: g?.en ?? key };
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
  const anchor = detail?.planets_anchor ?? p.planets_anchor;
  return p.mode === "ephemeris" || anchor?.type === "instant";
}

function resolvePlanetsRecord(
  p: PanchangaDay,
): Record<string, PlanetDetail | string> | undefined {
  const detail = getPanchangaDetail(p);
  const fromDetail = detail?.planets;
  const fromTop = p.planets;
  if (isInstantPlanetsMode(p)) {
    return fromDetail ?? fromTop;
  }
  return fromDetail ?? fromTop;
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

  const order: GrahaKey[] = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
  ];

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

function formatMuhurtaRange(start?: string, end?: string, lang?: string): string | undefined {
  if (!start || !end) return undefined;
  const s = formatClockNepali(start, lang) ?? start;
  const e = formatClockNepali(end, lang) ?? end;
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

export function computeAbhijitFromSunTimes(
  sunrise?: string | null,
  sunset?: string | null,
  lang?: string,
): AbhijitMuhurtaInfo | null {
  const sr = clockMinutes(sunrise);
  const ss = clockMinutes(sunset);
  if (sr == null || ss == null || ss <= sr) return null;
  const total = ss - sr;
  const muh = total / 15;
  const start_time = minutesToClock(sr + 7 * muh);
  const end_time = minutesToClock(sr + 8 * muh);
  const solar_noon = minutesToClock(sr + total / 2);
  const rangeDisplay = formatMuhurtaRange(start_time, end_time, lang) ?? `${start_time} – ${end_time}`;
  return {
    start_time,
    end_time,
    solar_noon,
    rangeDisplay,
    noonDisplay: formatClockNepali(solar_noon, lang),
  };
}

export function getAbhijitMuhurta(p: PanchangaDay, lang?: string): AbhijitMuhurtaInfo | null {
  const detail = getPanchangaDetail(p);
  const m = detail?.muhurta ?? p.muhurta;
  return abhijitFromWindow(m?.abhijit, lang);
}

/** Abhijit window the month calendar already computed. */
export function abhijitFromCalendarDay(day: CalendarDay, lang?: string): AbhijitMuhurtaInfo | null {
  const nested = day.panchanga as { muhurta?: { abhijit?: { start_time?: string; end_time?: string; solar_noon?: string } } } | undefined;
  return abhijitFromWindow(day.abhijit ?? nested?.muhurta?.abhijit, lang);
}

function abhijitFromWindow(
  ab?: { start_time?: string; end_time?: string; solar_noon?: string } | null,
  lang?: string,
): AbhijitMuhurtaInfo | null {
  if (!ab?.start_time || !ab?.end_time) return null;
  const rangeDisplay = formatMuhurtaRange(ab.start_time, ab.end_time, lang);
  if (!rangeDisplay) return null;
  return {
    start_time: ab.start_time,
    end_time: ab.end_time,
    solar_noon: ab.solar_noon,
    rangeDisplay,
    noonDisplay: ab.solar_noon ? formatClockNepali(ab.solar_noon, lang) : undefined,
  };
}

export function getTarabalaTable(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return p.tarabala_table ?? detail?.tarabala_table;
}

export function getChandrabalamTable(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return p.chandrabala_table ?? detail?.chandrabala_table;
}

export function getHoraSlots(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = p.hora ?? detail?.hora;
  return Array.isArray(block) ? block : [];
}

export function getHoraDaySlots(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = p.hora_day ?? detail?.hora_day;
  if (Array.isArray(block) && block.length) return block;
  return getHoraSlots(p).filter((slot) => slot.phase === "day");
}

export function getUdayaLagna(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const rows = detail?.udaya_lagna ?? p.udaya_lagna;
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
  lang?: string,
): string | undefined {
  const a = formatShortClock(start, lang);
  const b = formatShortClock(end, lang);
  if (!a || !b) return undefined;
  return `${a} → ${b}`;
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
    getSunriseDisplay(p, lang) ??
    (selectedDay?.sunrise ? formatClockNepali(selectedDay.sunrise, lang) : undefined);
  const sunset =
    getSunsetDisplay(p, lang) ??
    (selectedDay?.sunset ? formatClockNepali(selectedDay.sunset, lang) : undefined);
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

// ─── Wheel / timeline helpers (shared with web patro) ─────────────────────

const RASHI_NE_LIST = [
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

export function formatRashiDisplayNe(nameNe?: string): string | undefined {
  if (!nameNe) return undefined;
  return RASHI_DISPLAY_NE[nameNe] ?? nameNe;
}

export function rashiNeFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_NE_LIST[rashi - 1];
}

export function rashiSymFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_SYM[rashi - 1];
}

export function getLagnaSpans(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const fromTop = (p as PanchangaDay & { lagna_spans?: unknown[] }).lagna_spans;
  const fromDetail = detail?.lagna_spans as PanchangaDay["lagna_spans"];
  if (fromTop?.length) return fromTop;
  if (fromDetail?.length) return fromDetail;
  return undefined;
}

export function getMoonrise(p: PanchangaDay): string | undefined {
  return getMoonTimeBlock(p, "moonrise")?.local_time_short;
}

export function getMoonset(p: PanchangaDay): string | undefined {
  return getMoonTimeBlock(p, "moonset")?.local_time_short;
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

export type PlanetRow = {
  key: string;
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

const RASHI_EN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

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

function rashiEnFromNumber(rashi?: number): string | undefined {
  if (rashi == null || rashi < 1 || rashi > 12) return undefined;
  return RASHI_EN_NAMES[rashi - 1];
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

export type InstantLagna = {
  number?: number;
  name_ne?: string;
  name?: string;
  degree_in_rashi?: number;
  longitude?: number;
};

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

export function getPlanetsAnchorLabel(p: PanchangaDay, lang?: string): string {
  const detail = getPanchangaDetail(p);
  const anchor = (detail?.planets_anchor ?? p.planets_anchor) as
    | { label_ne?: string; label_en?: string; local_time?: string; type?: string }
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
  const time = anchor?.local_time
    ? formatLocaleDigits(formatTimeShort(anchor.local_time) ?? anchor.local_time, lang)
    : undefined;
  return time ? `${label} (${time})` : label;
}

export interface InauspiciousWindow {
  key: string;
  nameNe: string;
  nameEn: string;
  start: string;
  end: string;
  tillFullNight?: boolean;
}

export function getInauspiciousWindows(p: PanchangaDay): InauspiciousWindow[] {
  const detail = getPanchangaDetail(p);
  const m = (detail?.muhurta ?? p.muhurta) as {
    rahu_kalam?: { start_time?: string; end_time?: string };
    yamaganda?: { start_time?: string; end_time?: string };
    gulika?: { start_time?: string; end_time?: string };
    inauspicious_timings?: Array<{
      key?: string;
      name_ne?: string;
      name_en?: string;
      segments?: Array<{
        start_local_time_short?: string;
        end_local_time_short?: string;
        until_full_night?: boolean;
      }>;
    }>;
  } | undefined;
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
        out.push({ key, nameNe: ne, nameEn: en, start: seg.start_local_time_short, end: "", tillFullNight: true });
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

/** `साउन १२, २०८३` — BS month + day + year, Nepali digits. */
export function formatBsMonthDayPatro(
  bsYear: number,
  bsMonth: number,
  bsDay: number,
): string {
  return `${BS_MONTHS_NE[bsMonth - 1]} ${toNepaliDigits(bsDay)}, ${toNepaliDigits(bsYear)}`;
}

/** `साउन १२, वि.सं. २०८३` for a holiday / festival start date. */
export function formatHolidayBsDisplay(
  holiday: { bs_start_date?: string; start_date: string },
  lang?: string,
): string {
  const fromApi = formatBsIsoDateNepali(holiday.bs_start_date, { lang });
  if (fromApi) return fromApi;
  const [y, m, d] = holiday.start_date.split("-").map(Number);
  if (!y || !m || !d) return "";
  const bs = adToBS(new Date(y, m - 1, d));
  const isEn = normalizeLang(lang) === "en";
  const months = isEn ? BS_MONTH_NAMES : BS_MONTHS_NE;
  const era = isEn ? "BS" : "वि.सं.";
  return `${months[bs.month - 1]} ${formatLocaleDigits(bs.day, lang)}, ${era} ${formatLocaleDigits(bs.year, lang)}`;
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
