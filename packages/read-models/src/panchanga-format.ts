import type { ApiHoraSlot, BalamBlock, NakshatraPadaSpan, NavataraTableBlock, PanchakaSegment, RashiSpan, UdayaLagnaRow } from "@vedic-patro/api-client";
import type { CalendarDay, ElementStamp, Festival, NivasShoolBlock, PanchangaDay } from "@vedic-patro/api-client";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { formatRashiDisplayNe, rashiNeFromNumber } from "@vedic-patro/domain/rashi-i18n";
import { formatLocaleDigits } from "@vedic-patro/domain/locale";
import { normalizeLang, pickLocale } from "@vedic-patro/domain/locale";
import { addDaysCivilIso, civilDayDiffIso, civilIsoDatePart, formatCivilIsoParts, parseCivilIso, positiveGregorianCivilIso } from "@vedic-patro/domain/patro-day";
import { formatGregorianEraYearLabel } from "@vedic-patro/domain/patro-headline-subtitle";
import { type AayanBlock, type AbhijitMuhurtaInfo, type AngaDetail, type AuspiciousWindow, type AyanaMark, type DurationBlock, type InauspiciousWindow, type InstantLagna, LUNAR_MONTH_NE_TO_EN, type MonthFestivalEntry, type MoonTimeBlock, type MuhurtaDetail, type PlanetDetail, type PlanetRow, RITU_NAME_TO_SEASON, type RituBlock, type SolarCorrections, abhijitFromWindow, ayanaMarkFromName, dedupeDayFestivalNames, formatBsIsoDateNepali, formatClockNepali, formatEventDate, formatGregorianEventPartsLabel, formatMuhurtaRange, formatMuhurtaTimingEntry, formatPlanetGocharParts, formatTimeShort, getShraddhaLabel, hasNamedPurnimaFestival, isTithiOnlyLabel, lagnaRashiFromLongitude, longitudeToDegreeCells, nakshatraFieldsFromLongitude, normalizeFestKey, offsetBsIsoByCivilDayDelta, parseTimeToMinutes, planetDegreeCells, planetLabelPair, planetNakshatraFields, preferLocalizedName, rashiEnFromNumber, resolveFestivalAlias, resolveLagnaSiderealLongitude, tithiNameOnly, titleizeWords, toNepaliDigits } from "@vedic-patro/domain/panchanga-format";

export * from "@vedic-patro/domain/panchanga-format";

/** Sunrise as decimal hours-of-day (e.g. 5.37), for day-offset math. */
export function getSunriseHours(p: PanchangaDay): number | undefined {
  const sr = getSunrise(p);
  if (!sr) return undefined;
  const [h, m] = sr.split(":").map((x) => Number(x));
  if (Number.isNaN(h)) return undefined;
  return h + (Number.isNaN(m) ? 0 : m) / 60;
}

/**
 * The hour the day's anga end-times count from, for {@link angaEndDayOffset}:
 * sunrise normally, 0 for दिन-रात payloads (they measure from midnight).
 */
export function angaEndOrigin(p: PanchangaDay): number | undefined {
  return p.boundary === "midnight" ? 0 : getSunriseHours(p);
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

export function getSunriseDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatClockNepali(getSunrise(p), lang);
}

export function getSunsetDisplay(p: PanchangaDay, lang?: string): string | undefined {
  return formatClockNepali(getSunset(p), lang);
}

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
    ishtakaal_note_ne: fromDetail?.ishtakaal_note_ne ?? fromTop?.ishtakaal_note_ne,
    ishtakaal_note_en: fromDetail?.ishtakaal_note_en ?? fromTop?.ishtakaal_note_en,
    sunrise_includes_corrections:
      fromDetail?.sunrise_includes_corrections ?? fromTop?.sunrise_includes_corrections,
  };
}

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
  const rawRitu = getDetailValue<RituBlock | string>(p, "ritu");
  const ritu = typeof rawRitu === "object" ? rawRitu : getDetailValue<RituBlock>(p, "ritu_pauranik");
  const top = typeof p.ritu === "object" ? p.ritu : undefined;
  const ne = ritu?.name_ne ?? top?.name_ne ?? p.ritu_ne;
  const rituName =
    ritu?.name ?? top?.name ?? (typeof rawRitu === "string" ? rawRitu : typeof p.ritu === "string" ? p.ritu : undefined);
  // English leads with the season (Summer); the Sanskrit ritu name is the hint
  // underneath it, so the headline value is a word the reader knows.
  const en =
    ritu?.season ??
    top?.season ??
    (rituName ? RITU_NAME_TO_SEASON[rituName] : undefined) ??
    rituName ??
    ne;
  return pickLocale(lang, ne, en);
}

export function getRituSeason(p?: PanchangaDay | null, lang?: string): string | undefined {
  if (!p) return undefined;
  const ritu = getDetailValue<RituBlock>(p, "ritu") ?? getDetailValue<RituBlock>(p, "ritu_pauranik");
  const season =
    ritu?.season ??
    (typeof p.ritu === "object" ? p.ritu?.season : undefined);
  if (!season) return undefined;
  // English shows the season as the headline value, so the hint carries the
  // Sanskrit name instead of repeating it.
  if (normalizeLang(lang) === "en") {
    return ritu?.name ?? (typeof p.ritu === "object" ? p.ritu?.name : undefined) ?? season;
  }
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
  try {
    const { year, month, day } = parseCivilIso(dateAd.split("T")[0] ?? dateAd);
    const locale = normalizeLang(lang) === "en" ? "en-US" : "ne-NP";
    const monthLong = new Date(Date.UTC(Math.max(year, 1), month - 1, 15)).toLocaleDateString(
      locale,
      { month: "long" },
    );
    const digit = (n: number | string) =>
      normalizeLang(lang) === "en" ? String(n) : formatLocaleDigits(n);
    return `${digit(day)} ${monthLong} ${formatGregorianEraYearLabel(year, lang ?? "en", digit)}`;
  } catch {
    return dateAd;
  }
}

export function formatAdShort(
  _p: PanchangaDay,
  dateAd: string,
  lang?: string,
): string {
  try {
    const { year, month, day } = parseCivilIso(dateAd.split("T")[0] ?? dateAd);
    const locale = normalizeLang(lang) === "en" ? "en-US" : "ne-NP";
    const monthShort = new Date(Date.UTC(Math.max(year, 1), month - 1, 15)).toLocaleDateString(
      locale,
      { month: "short" },
    );
    const digit = (n: number | string) =>
      normalizeLang(lang) === "en" ? String(n) : formatLocaleDigits(n);
    return `${digit(day)} ${monthShort} ${formatGregorianEraYearLabel(year, lang ?? "en", digit)}`;
  } catch {
    return dateAd;
  }
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

/** Home-aside ayana: mark (उ/द) plus a short locale name. */
export function getAyanaDisplay(
  p?: PanchangaDay | null,
  day?: CalendarDay | null,
  lang?: string,
): { mark: AyanaMark; label: string } | undefined {
  const aayan = getAayanVedic(p) ?? getAayanPauranik(p);
  const mark =
    day?.ayana_mark ??
    ayanaMarkFromName(aayan?.name) ??
    ayanaMarkFromName(aayan?.name_ne) ??
    ayanaMarkFromName(day?.aayan) ??
    ayanaMarkFromName(day?.aayan_ne);
  if (!mark) return undefined;

  const isEn = normalizeLang(lang) === "en";
  const label = isEn
    ? (aayan?.name ??
      day?.aayan ??
      aayan?.name_ne ??
      day?.aayan_ne ??
      (mark === "उ" ? "Uttarayana" : "Dakshinayana"))
    : (aayan?.name_ne ??
      day?.aayan_ne ??
      aayan?.name ??
      day?.aayan ??
      (mark === "उ" ? "उत्तरायण" : "दक्षिणायण"));
  return { mark, label };
}

/** Vikram or Gregorian label for the civil day a moon event falls on. */
function formatPatroMoonEventDate(p: PanchangaDay, eventCivilIso: string, lang?: string): string {
  const normalized = positiveGregorianCivilIso(eventCivilIso);
  const greg = p.date_parts?.gregorian;
  const vikram = p.date_parts?.vikram;

  if (vikram?.year && vikram.month && vikram.day && greg?.year && greg.month && greg.day && p.date_bs) {
    const anchor = formatCivilIsoParts(greg.year, greg.month, greg.day);
    const delta = civilDayDiffIso(normalized, anchor);
    const bsIso = offsetBsIsoByCivilDayDelta(p.date_bs, delta);

    if (normalizeLang(lang) === "en") {
      if (delta === 0) {
        return formatGregorianEventPartsLabel(greg, lang);
      }
      const parts = parseCivilIso(normalized);
      return formatGregorianEventPartsLabel(
        { era: greg.era, year: parts.year, month: parts.month, day: parts.day },
        lang,
      );
    }

    const label = formatBsIsoDateNepali(bsIso ?? p.date_bs, { includeYear: false, lang });
    if (label) return label;
  }

  return formatEventDate(normalized, lang);
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
  const dayDate = p.date_ad ? positiveGregorianCivilIso(p.date_ad) : undefined;
  if (!dayDate) return block.local ? positiveGregorianCivilIso(civilIsoDatePart(block.local)) : undefined;

  const eventDateRaw = block.local ? civilIsoDatePart(block.local) : undefined;
  const eventDate = eventDateRaw ? positiveGregorianCivilIso(eventDateRaw) : undefined;
  const eventMin = parseTimeToMinutes(block.local_time_short);
  const sunriseMin = parseTimeToMinutes(getSunrise(p));

  if (eventDate && dayDate && eventDate !== dayDate) {
    return eventDate;
  }

  if (key === "moonrise" && eventMin != null && sunriseMin != null && eventMin < sunriseMin) {
    return addDaysCivilIso(dayDate, 1);
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
  return `${formatPatroMoonEventDate(p, eventDate, lang)} · ${time}`;
}

/** Span element boundary — locale-aware date + clock (tithi/nakshatra month pages). */
export function formatElementStampDisplay(
  stamp: ElementStamp,
  lang?: string,
): string {
  const time = formatTimeShort(stamp.time_label) ?? stamp.time_label;
  const timeOut = formatLocaleDigits(time, lang);
  const datePart = stamp.iso.includes("T") ? stamp.iso.split("T")[0]! : stamp.iso.slice(0, 10);
  let dateOut: string;
  try {
    dateOut = formatEventDate(datePart, lang);
  } catch {
    dateOut = formatLocaleDigits(stamp.date_label, lang);
  }
  if (normalizeLang(lang) === "en") {
    return `${timeOut} on ${dateOut}`;
  }
  return `${timeOut} · ${dateOut}`;
}

export function formatMonthMoonEventDisplay(
  day: {
    date_ad: string;
    date_bs?: string;
    date_parts?: PanchangaDay["date_parts"];
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
  const pseudo = {
    date_ad: day.date_ad,
    date_bs: day.date_bs,
    date_parts: day.date_parts,
    sunrise: day.sunrise,
  } as PanchangaDay;
  const eventDate = resolveMoonEventAdDate(pseudo, key, block);
  const short = formatTimeShort(time) ?? time;
  const timeLabel = formatLocaleDigits(short, lang);
  if (!timeLabel) return undefined;
  if (!eventDate) return timeLabel;
  return `${formatPatroMoonEventDate(pseudo, eventDate, lang)} · ${timeLabel}`;
}

export function getMonthDayChandraRashi(
  day: CalendarDay,
  lang: "ne" | "en" | "hi",
): string | undefined {
  const moon = day.panchanga?.planets?.moon;
  const moonRashiNe =
    moon?.rashi_ne ??
    (moon?.rashi_no != null ? rashiNeFromNumber(moon.rashi_no) : undefined);
  const moonRashiEn = moon?.rashi ?? moon?.rashi_name;

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

  // Prefer a clean Latin label from the API, title-cased \u2014 it arrives as
  // "Ashadh shukla paksha" and sits next to title-cased tithi/nakshatra.
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

export function formatNepalSambatDisplay(
  p: PanchangaDay,
  lang?: string,
): string | undefined {
  const detail = getPanchangaDetail(p);
  const display = detail?.display as { ns_ne?: string } | undefined;
  const ns = detail?.ns_date as {
    year?: number;
    paksha?: string;
    paksha_ne?: string;
    day?: number;
    label_ne?: string;
  } | undefined;
  const tithi = (detail?.tithi ?? p.tithi) as
    | { name?: string; name_ne?: string }
    | undefined;
  const isEn = normalizeLang(lang) === "en";

  // English builds the label from the Latin fields — the Nepali `label_ne` /
  // `ns_ne` strings the API pre-renders are Devanagari all the way through.
  if (isEn) {
    const paksha = ns?.paksha
      ? `${ns.paksha.charAt(0).toUpperCase()}${ns.paksha.slice(1)} Paksha`
      : undefined;
    if (ns?.year != null && paksha && tithi?.name && ns.day != null) {
      return `NS ${ns.year} ${paksha} ${tithi.name} - ${ns.day}`;
    }
    if (ns?.year != null) return `NS ${ns.year}`;
    return undefined;
  }

  if (ns?.year != null && ns.paksha_ne && tithi?.name_ne && ns.day != null) {
    return `ने.सं. ${toNepaliDigits(ns.year)} ${ns.paksha_ne} ${tithi.name_ne} - ${toNepaliDigits(ns.day)}`;
  }

  if (display?.ns_ne) return display.ns_ne;
  if (ns?.label_ne) {
    return ns.year != null ? `ने.सं. ${toNepaliDigits(ns.year)} ${ns.label_ne}` : ns.label_ne;
  }
  return p.display?.ns_ne;
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

export function getChandraRashiSpans(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const spans = (detail?.chandra_rashi_spans ?? p.chandra_rashi_spans) as
    | RashiSpan[]
    | undefined;
  return spans?.length ? spans : undefined;
}

export function getNakshatraPadaSpans(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const spans = (detail?.nakshatra_pada_spans ?? p.nakshatra_pada_spans) as
    | NakshatraPadaSpan[]
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
  // Always from udaya (sunrise→next-sunrise) daily payload in detail.raw
  return (detail?.chandrabalam ?? p.chandrabalam) as BalamBlock | undefined;
}

export function getTarabalam(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (detail?.tarabalam ?? p.tarabalam) as BalamBlock | undefined;
}

export function getTarabalaTable(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (p.tarabala_table ?? detail?.tarabala_table) as NavataraTableBlock | undefined;
}

export function getChandrabalamTable(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  return (p.chandrabala_table ?? detail?.chandrabala_table) as
    | NavataraTableBlock
    | undefined;
}

export function getHoraSlots(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = (p.hora ?? detail?.hora) as ApiHoraSlot[] | undefined;
  return Array.isArray(block) ? block : [];
}

export function getHoraDaySlots(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const block = (p.hora_day ?? detail?.hora_day) as ApiHoraSlot[] | undefined;
  if (Array.isArray(block) && block.length) return block;
  return getHoraSlots(p).filter((slot) => slot.phase === "day");
}

export function getPanchakaRahita(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const rows = (detail?.panchaka_rahita ?? p.panchaka_rahita) as
    | PanchakaSegment[]
    | undefined;
  return rows?.length ? rows : undefined;
}

export function getUdayaLagna(p: PanchangaDay) {
  const detail = getPanchangaDetail(p);
  const rows = (detail?.udaya_lagna ?? p.udaya_lagna ?? detail?.lagna_spans ?? p.lagna_spans) as
    | UdayaLagnaRow[]
    | undefined;
  return rows?.length ? rows : undefined;
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

/**
 * Sunrise ascendant (लग्न) as a {@link PlanetRow} so it can head the ग्रह card
 * grid alongside the spashtagraha, with its own rashi, coords and nakshatra.
 */
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

export function getAbhijitMuhurta(p: PanchangaDay): AbhijitMuhurtaInfo | null {
  const detail = getPanchangaDetail(p);
  const m = (detail?.muhurta ?? p.muhurta) as MuhurtaDetail | undefined;
  return abhijitFromWindow(m?.abhijit);
}

/** Abhijit window the month calendar already computed. */
export function abhijitFromCalendarDay(day: CalendarDay): AbhijitMuhurtaInfo | null {
  const nested = day.panchanga as
    | { muhurta?: { abhijit?: { start_time?: string; end_time?: string; solar_noon?: string } } }
    | undefined;
  return abhijitFromWindow(day.abhijit ?? nested?.muhurta?.abhijit);
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

  // Prefer the structured `inauspicious_timings` list (Rahu, Yamaganda, Gulika,
  // Varjyam, Dur Muhurtam, Aadal/Vidal yoga, Baana, tithi doshas …). Only when it
  // is absent do we fall back to the individual rahu/yama/gulika fields — using
  // both would double-count those three. Mirrors {@link getMuhurtaRows}.
  if (m.inauspicious_timings?.length) {
    for (const entry of m.inauspicious_timings) {
      const key = entry.key || "ashubha";
      const ne = entry.name_ne || entry.name_en || entry.key || "अशुभ";
      const en = entry.name_en || entry.name_ne || entry.key || "Ashubha";
      for (const seg of entry.segments ?? []) {
        if (!seg.start_local_time_short) continue;
        if (seg.until_full_night && !seg.end_local_time_short) {
          // Runs to next sunrise — no explicit end time.
          out.push({ key, nameNe: ne, nameEn: en, start: seg.start_local_time_short, end: "", tillFullNight: true });
        } else if (seg.end_local_time_short) {
          out.push({ key, nameNe: ne, nameEn: en, start: seg.start_local_time_short, end: seg.end_local_time_short });
        }
      }
    }
    return out;
  }

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
  pushWin("rahu_kalam", "राहु काल", "Rahu Kaal", m.rahu_kalam);
  pushWin("yamaganda", "यमगण्ड", "Yamaganda", m.yamaganda);
  pushWin("gulika", "गुलिक काल", "Gulika Kaal", m.gulika);
  return out;
}

/**
 * Raw auspicious day-periods (Amrit Kalam, Abhijit, Vijaya, Godhuli, the two
 * Sandhya, Nishita, Brahma muhurta, Sarvartha Siddhi yoga …) with their local
 * clock ranges — the शुभ counterpart to {@link getInauspiciousWindows}, used by
 * the day-cycle timeline's शुभ row. Returns machine-parseable times.
 */
export function getAuspiciousWindows(p: PanchangaDay): AuspiciousWindow[] {
  const detail = getPanchangaDetail(p);
  const m = (detail?.muhurta ?? p.muhurta) as MuhurtaDetail | undefined;
  if (!m) return [];

  const out: AuspiciousWindow[] = [];
  for (const entry of m.auspicious_timings ?? []) {
    const key = entry.key || "shubha";
    const ne = entry.name_ne || entry.name_en || entry.key || "शुभ";
    const en = entry.name_en || entry.name_ne || entry.key || "Shubha";
    for (const seg of entry.segments ?? []) {
      if (!seg.start_local_time_short) continue;
      if (seg.until_full_night && !seg.end_local_time_short) {
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
      label: isEn ? "Abhijit Moment" : "अभिजित् मुहूर्त",
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
    add(bsDay, name, {
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
    // The day payload names festivals in `name` (Latin); only the yearly
    // festivals API fills `name_en`. English reads both before falling back to
    // Devanagari.
    .map((f) =>
      isEn
        ? (f.name_en ?? f.name ?? f.name_ne ?? "")
        : (f.name_ne ?? f.name_en ?? f.name ?? ""),
    )
    .filter(Boolean);
  const merged = [...fromApi];
  for (const f of dayFestivals) {
    if (!merged.includes(f)) merged.push(f);
  }
  return merged;
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

  const tithiBlock = (detail?.tithi ?? p.tithi) as
    | { name?: string; name_ne?: string }
    | undefined;
  const tithiNe = tithiBlock?.name_ne;
  const tithiEn = tithiBlock?.name;
  const shraddha = getShraddhaLabel(tithiNe, lang, tithiEn);
  if (
    shraddha &&
    !labels.some((label) => label.includes(isEn ? (tithiEn ?? tithiNe ?? "") : (tithiNe ?? "")))
  ) {
    labels.push(shraddha);
  }

  return labels;
}

export function getNivasShool(p: PanchangaDay): NivasShoolBlock | undefined {
  return getDetailValue<NivasShoolBlock>(p, "nivas_shool");
}
