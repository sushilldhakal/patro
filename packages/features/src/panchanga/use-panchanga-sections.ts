/**
 * The daily panchanga's detail sections, shared by the website's and the
 * app's `components/panchanga/PanchangaSections.tsx`: one hook per section
 * builds its rows (sun/moon/samvat, the five angas, nakshatra padas, balam,
 * panchaka and udaya lagna, ritu/ayana, muhurta timings, nivas/shool, special
 * observances with the day's festivals, planets). Each app keeps its own section layout
 * and only draws these values.
 */
import type { NivasShoolSegment, PanchangaDay } from "@vedic-patro/api-client";
import {
  findCurrentUdayaLagna,
  getChandraBalamCards,
  getTaraBalamCards,
  type BalamCardItem,
} from "@vedic-patro/read-models/panchanga/balam-cards";
import { shortWeekdayNe } from "@vedic-patro/domain/calendar/bs-calendar";
import { buildSaitRows, saitNote } from "../_shared/sait-rows";
import { bilingualText } from "@vedic-patro/domain/locale";
import {
  angaEndOrigin,
  angaEndWithDay,
  formatAayanLabel,
  formatDurationFull,
  formatMadhyahnaDisplay,
  formatNepalSambatDisplay,
  formatPakshaLabel,
  formatPakshaNepaliDisplay,
  formatRituLabel,
  formatShakaYear,
  formatShortClock,
  formatSolarCorrectionDisplay,
  formatSpanEndTime,
  formatTimeRangeShort,
  formatTimeShort,
  getAayanPauranik,
  getAayanVedic,
  getChandrabalamTable,
  getDinVisheshLabels,
  getLagnaDisplay,
  getMoonriseDisplay,
  getMoonsetDisplay,
  getMuhurtaRows,
  getNakshatraPadaSpans,
  getNivasShool,
  getPanchakaRahita,
  getPanchangaDetail,
  getPlanetRows,
  getPlanetsAnchorLabel,
  getRituPauranik,
  getRituVedic,
  getSolarCorrections,
  getSunriseDisplay,
  getSunsetDisplay,
  getTarabalaTable,
  getUdayaLagna,
  getVaaraEn,
  getVaaraNe,
  toNepaliDigits,
} from "@vedic-patro/read-models/panchanga/panchanga-format";
import { formatRashiDisplay } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { resolveSamvatsaraForBsYear } from "@vedic-patro/domain/calendar/samvatsara";
import { tithiIndexFromPanchanga } from "@vedic-patro/read-models/panchanga/tithi-wheel-data";
import { useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";

type AngaEnd = { name_ne?: string; name?: string; end_local_time?: string; end_ghati_clock?: string; end_hours_clock?: string };
type Anga = AngaEnd & { next?: AngaEnd };

/** An anga's name and end time, and the next one when it also ends today (a kshaya tithi). */
export type AngaValue = { name: string; endTime?: string; next?: { name: string; endTime?: string } };

/* ── sun, moon and samvat ── */
export function useSunMoonSamvatSection(p: PanchangaDay) {
  const { lang, digits } = useLocale();
  const { calendar } = useCalendarSystem();
  const solar = getSolarCorrections(p);
  const detail = getPanchangaDetail(p);
  const bs = (detail?.bs_date ?? p.bs_date) as
    | { year?: number; month_name_ne?: string; month_name?: string; day?: number }
    | undefined;
  const shaka = formatShakaYear(p);
  const samvatsara = bs?.year ? resolveSamvatsaraForBsYear(bs.year, p.samvatsara) : undefined;
  return {
    tithiIndex: tithiIndexFromPanchanga(p),
    sunrise: getSunriseDisplay(p) ?? "—",
    sunset: getSunsetDisplay(p) ?? "—",
    moonrise: getMoonriseDisplay(p, lang, calendar) ?? "—",
    moonset: getMoonsetDisplay(p, lang, calendar) ?? "—",
    /** Equation of time and longitude correction, when the payload has them. */
    belaantar: formatSolarCorrectionDisplay(solar?.belaantar, lang) ?? null,
    deshaantar: formatSolarCorrectionDisplay(solar?.deshaantar, lang) ?? null,
    paksha: formatPakshaLabel(p, lang) ?? "—",
    vikram:
      bs?.year && bs.day && (bs.month_name_ne || bs.month_name)
        ? `${digits(bs.year)} ${bilingualText(lang, bs.month_name_ne ?? bs.month_name ?? "", bs.month_name ?? bs.month_name_ne ?? "")} ${digits(bs.day)}`
        : (p.display?.bs_ne ?? "—"),
    samvatsara: samvatsara ? bilingualText(lang, samvatsara.name_ne, samvatsara.name_en) : "—",
    shaka: shaka ? digits(shaka) : "—",
    nepalSambat: formatNepalSambatDisplay(p, lang) ?? "—",
    note:
      solar?.ishtakaal_note_ne || solar?.ishtakaal_note_en
        ? bilingualText(lang, solar.ishtakaal_note_ne ?? "", solar.ishtakaal_note_en ?? solar.ishtakaal_note_ne ?? "")
        : null,
  };
}

/* ── the five angas ── */
export function usePanchangCoreSection(p: PanchangaDay) {
  const { lang } = useLocale();
  const detail = getPanchangaDetail(p);
  const instant = p.mode === "ephemeris";
  // Day-night payloads measure anga end-times from midnight (not sunrise), so
  // the tomorrow/day-after offset counts from a 00:00 origin.
  const sunriseHours = angaEndOrigin(p);
  const anga = (raw: unknown): AngaValue | null => {
    const a = raw as Anga | undefined;
    if (!a) return null;
    const next = a.next;
    const nextName = next?.name_ne ?? next?.name;
    return {
      name: bilingualText(lang, a.name_ne ?? a.name ?? "—", a.name ?? a.name_ne ?? "—"),
      endTime: angaEndWithDay(a, sunriseHours, lang) ?? undefined,
      next: nextName
        ? { name: bilingualText(lang, nextName, next?.name ?? next?.name_ne ?? nextName), endTime: angaEndWithDay(next, sunriseHours, lang) ?? undefined }
        : undefined,
    };
  };
  const vaaraNe = getVaaraNe(p, p.weekday);
  const vaaraEn = getVaaraEn(p, p.weekday);
  return {
    tithiIndex: tithiIndexFromPanchanga(p),
    tithi: anga(instant ? p.tithi : (detail?.tithi ?? p.tithi)),
    nakshatra: anga(instant ? p.nakshatra : (detail?.nakshatra ?? p.nakshatra)),
    yoga: anga(instant ? p.yoga : (detail?.yoga ?? p.yoga)),
    karana: anga(instant ? p.karana : (detail?.karana ?? p.karana)),
    /** The weekday, and a short form for narrow cards. */
    weekday: bilingualText(lang, vaaraNe ?? "—", vaaraEn ?? "—"),
    weekdayShort: bilingualText(lang, shortWeekdayNe(vaaraNe) ?? "—", vaaraEn ?? "—"),
    paksha: formatPakshaLabel(p, lang) ?? formatPakshaNepaliDisplay(p) ?? "—",
  };
}

/* ── nakshatra padas ── */
export function usePadaSection(p: PanchangaDay) {
  const { t, lang, digits } = useLocale();
  const spans = getNakshatraPadaSpans(p);
  if (!spans?.length) return null;
  return spans.map((span, i) => {
    const nakName = bilingualText(lang, span.nakshatra_name_ne ?? span.nakshatra_name ?? "", span.nakshatra_name ?? span.nakshatra_name_ne ?? "", "");
    const padaLabel = bilingualText(lang, span.pada_ne ?? digits(span.pada ?? ""), String(span.pada ?? span.pada_ne ?? ""));
    const endTime = formatSpanEndTime(span);
    return {
      key: `pada-${i}`,
      label: nakName ? `${nakName} — ${padaLabel} ${t("sections.pada_unit")}` : "—",
      value: endTime ? `${endTime} ${t("sections.until")}` : "—",
    };
  });
}

/* ── chandrabala and tarabala ── */
export type BalamBlock = {
  kind: "chandrabala" | "tarabala";
  label: string;
  moonRef?: string;
  cards: BalamCardItem[];
  formatName: (card: BalamCardItem) => string;
};

export function useBalamSection(p: PanchangaDay) {
  const { t, lang } = useLocale();
  const chandraCards = getChandraBalamCards(p);
  const taraCards = getTaraBalamCards(p);
  if (!chandraCards.length && !taraCards.length) return null;
  const chandraTable = getChandrabalamTable(p);
  const taraTable = getTarabalaTable(p);
  const moonLabel = (table?: { moon_label?: string; moon_label_en?: string } | null) =>
    table?.moon_label ? (lang === "en" ? (table.moon_label_en ?? table.moon_label) : table.moon_label) : null;
  const chandraMoon = moonLabel(chandraTable);
  const taraMoon = moonLabel(taraTable);
  const blocks: BalamBlock[] = [
    {
      kind: "chandrabala",
      label: t("muhurta_aside.chandrabal"),
      moonRef: chandraMoon ? t("sections.moon_rashi_at_sunrise", { name: chandraMoon }) : undefined,
      cards: chandraCards,
      formatName: (card) => formatRashiDisplay(card.name, card.nameEn, lang) ?? bilingualText(lang, card.name, card.nameEn ?? card.name),
    },
    {
      kind: "tarabala",
      label: t("muhurta_aside.tarabal"),
      moonRef: taraMoon ? t("sections.moon_nakshatra_at_sunrise", { name: taraMoon }) : undefined,
      cards: taraCards,
      formatName: (card) => bilingualText(lang, card.name, card.nameEn ?? card.name),
    },
  ];
  return { lang, blocks: blocks.filter((b) => b.cards.length > 0) };
}

/* ── panchaka rahita and udaya lagna ── */
export function usePanchakaLagnaSection(p: PanchangaDay, clock?: string) {
  const { t, lang } = useLocale();
  const panchaka = getPanchakaRahita(p) ?? [];
  const lagna = getUdayaLagna(p) ?? [];
  if (!panchaka.length && !lagna.length) return null;
  const current = findCurrentUdayaLagna(lagna, clock);
  return {
    panchaka: panchaka.map((pr, i) => ({
      key: `panchaka-${i}`,
      label: bilingualText(lang, pr.name_ne ?? pr.name ?? "—", pr.name ?? pr.name_ne ?? "—"),
      time: formatTimeRangeShort(pr.start_local_time_short ?? pr.start_local_time, pr.end_local_time_short ?? pr.end_local_time) ?? undefined,
      good: pr.good,
    })),
    lagna: lagna.map((lg, i) => ({
      key: `lagna-${lg.number ?? i}-${lg.start_local_time_short ?? i}`,
      rashi: formatRashiDisplay(lg.name_ne, lg.name, lang) ?? "—",
      time: formatTimeRangeShort(lg.start_local_time_short ?? lg.start_local_time, lg.end_local_time_short ?? lg.end_local_time) ?? undefined,
      pushkara:
        lg.pushkara_navamsha
          ?.map((h) => formatShortClock(h.local_time_short ?? h.local_time))
          .filter(Boolean)
          .join(", ") ?? "",
      isCurrent:
        current != null &&
        current.number === lg.number &&
        (current.start_local_time_short ?? current.start_local_time) === (lg.start_local_time_short ?? lg.start_local_time),
    })),
    copy: {
      panchaka: t("sections.today_panchaka"),
      lagna: t("sections.today_udaya_lagna"),
      pushkara: t("sections.pushkara"),
    },
  };
}

/* ── ritu and ayana (pauranik struck through when the vedic one differs) ── */
export type DualValue = { struck?: string; value?: string };

export function useRituSection(p: PanchangaDay) {
  const { lang } = useLocale();
  const dual = (pauranik?: string, vedic?: string, differs?: boolean): DualValue | null => {
    if (!pauranik && !vedic) return null;
    const strike = differs ?? (pauranik != null && vedic != null && pauranik !== vedic);
    return { struck: strike && pauranik ? pauranik : undefined, value: vedic ?? pauranik };
  };
  const rituP = getRituPauranik(p);
  const rituV = getRituVedic(p);
  const aayanP = getAayanPauranik(p);
  const aayanV = getAayanVedic(p);
  return {
    ritu: dual(formatRituLabel(rituP, lang), formatRituLabel(rituV, lang), rituP?.name !== rituV?.name),
    ayana: dual(formatAayanLabel(aayanP, lang), formatAayanLabel(aayanV, lang), aayanP?.name !== aayanV?.name),
    dinamana: formatDurationFull(p, "dinamaan", lang) ?? "—",
    ratrimana: formatDurationFull(p, "ratrimana", lang) ?? "—",
    madhyahna: formatMadhyahnaDisplay(p, lang) ?? "—",
  };
}

/* ── muhurta timings ── */
/** "until" in Nepali — a value carrying it is a phrase, not a plain range. */
const UNTIL_NE = "\u0938\u092e\u094d\u092e"; // copy-ok: matches the API text

/** One timing: a plain start–end range, or the lines to print as they are. */
export type MuhurtaTiming = { label: string; range?: { start: string; end?: string }; lines: string[] };

export function useMuhurtaTimingsSection(p: PanchangaDay) {
  const { t, lang } = useLocale();
  const rows = getMuhurtaRows(p, lang);
  if (!rows.length) return null;
  const timing = (row: { label: string; value: string }): MuhurtaTiming => {
    const lines = row.value.split("\n").filter(Boolean);
    if (lines.length === 1 && lines[0]!.includes(" – ") && !lines[0]!.includes(UNTIL_NE)) {
      const [start, end] = lines[0]!.split(" – ");
      return { label: row.label, range: { start: start!, end: end?.split(" (")[0] }, lines };
    }
    return { label: row.label, lines };
  };
  const good = rows.filter((r) => r.auspicious).map(timing);
  const bad = rows.filter((r) => !r.auspicious).map(timing);
  return {
    good,
    bad,
    /** Both kinds present: one section with two groups; otherwise one section per kind. */
    combined: good.length > 0 && bad.length > 0,
    copy: { good: t("sections.auspicious_timings"), bad: t("sections.inauspicious_timings") },
  };
}

/* ── nivas and shool ── */
export type NivasSegmentRow = {
  key: string;
  name: string;
  endTime?: string;
  badge?: string;
  /** "from <time> through the night", when only a start time is known. */
  fromNight?: string;
  /** A bare "through the night" note under the last segment. */
  fullNightNote?: string;
};

export type NivasRow =
  | { key: string; labelKey: string; nowrap?: boolean; kind: "direction"; value: string | null }
  | { key: string; labelKey: string; nowrap?: boolean; kind: "segments"; segments: NivasSegmentRow[] };

export function useNivasShoolSection(p: PanchangaDay, fallback?: PanchangaDay | null) {
  const { t, lang } = useLocale();
  const ns = getNivasShool(p) ?? (fallback ? getNivasShool(fallback) : undefined);
  if (!ns) return null;
  const nameOf = (seg: NivasShoolSegment) => bilingualText(lang, seg.name_ne ?? seg.name_en ?? "—", seg.name_en ?? seg.name_ne ?? "—");
  const clockOf = (raw?: string) => (raw ? toNepaliDigits(formatTimeShort(raw) ?? raw) : undefined);
  const segments = (list: NivasShoolSegment[] | undefined, opts: { subtitle?: boolean; guna?: boolean } = {}): NivasSegmentRow[] =>
    (list ?? []).map((seg, idx, all) => {
      const name = nameOf(seg);
      const subtitle = opts.subtitle
        ? bilingualText(lang, seg.subtitle_ne ?? seg.subtitle_en ?? "", seg.subtitle_en ?? seg.subtitle_ne ?? "", "")
        : "";
      const endTime = clockOf(seg.end_local_time_short);
      const fromTime = clockOf(seg.start_local_time_short);
      return {
        key: `${name}-${idx}`,
        name: subtitle ? `${name} (${subtitle})` : name,
        endTime,
        badge:
          opts.guna && seg.is_auspicious !== undefined
            ? seg.is_auspicious
              ? t("sections.nivas_auspicious")
              : t("sections.nivas_inauspicious")
            : undefined,
        fromNight: fromTime && !endTime ? `${t("sections.nivas_from")} ${fromTime} ${t("sections.nivas_to_full_night")}` : undefined,
        fullNightNote:
          seg.until_full_night && idx === all.length - 1 && all.length > 1 && !endTime && !fromTime
            ? t("sections.nivas_to_full_night")
            : undefined,
      };
    });
  const rows: NivasRow[] = [
    { key: "homahuti", labelKey: "sections.homahuti", kind: "segments", segments: segments(ns.homahuti?.segments) },
    { key: "disha", labelKey: "sections.disha_shool", nowrap: true, kind: "direction", value: ns.disha_shool ? nameOf(ns.disha_shool) : null },
    { key: "rahu", labelKey: "sections.rahu_vasa", nowrap: true, kind: "direction", value: ns.rahu_vasa ? nameOf(ns.rahu_vasa) : null },
    { key: "agnivasa", labelKey: "sections.agnivasa", kind: "segments", segments: segments(ns.agnivasa?.segments, { subtitle: true }) },
    { key: "chandra", labelKey: "sections.chandra_vasa", kind: "segments", segments: segments(ns.chandra_vasa?.segments) },
    { key: "shiva", labelKey: "sections.shivavasa", kind: "segments", segments: segments(ns.shivavasa?.segments) },
    ...(ns.bhadravasa?.active
      ? [{ key: "bhadra", labelKey: "sections.bhadravasa", kind: "segments" as const, segments: segments(ns.bhadravasa.segments, { subtitle: true }) }]
      : []),
    { key: "kumbha", labelKey: "sections.kumbha_chakra", kind: "segments", segments: segments(ns.kumbha_chakra?.segments, { guna: true }) },
  ];
  return rows;
}

/* ── special observances and festivals ── */
/**
 * दिन विशेष: the day's festivals, one card each — what it is, when it falls,
 * how it is observed and, for a timed rite, its sait and the direction to face
 * — then the day's other markers (Purnima, Ekadashi, shraddha) not already
 * named by a festival, and the day's ceremony saits.
 */
export function useDinVisheshSection(p: PanchangaDay) {
  const { t, lang, digits } = useLocale();
  const english = lang === "en";
  const saits = buildSaitRows(p.festival_saits, { t, lang, digits, selectedAdDate: p.date_ad ?? "" });
  const pick = (text: { ne: string; en: string } | null | undefined) => (text ? (english ? text.en : text.ne) : null);

  const festivals = (p.festivals ?? []).map((f) => ({
    id: f.id,
    name: bilingualText(lang, f.name_ne ?? f.name ?? "", f.name_en ?? f.name ?? f.name_ne ?? "", ""),
    holiday: Boolean(f.is_public_holiday),
    when: pick(f.when),
    about: pick(f.about),
    steps: (f.vidhi ? (english ? f.vidhi.en : f.vidhi.ne) : [])
      .filter(Boolean)
      .map((text, i) => ({ key: `${i}`, number: `${digits(i + 1)}.`, text })),
    sait: saits.find((row) => row.kind === "festival" && row.festivalId === f.id) ?? null,
  }));
  const named = new Set(festivals.map((f) => f.name));
  const markers = getDinVisheshLabels(p, [], lang).filter((label) => !named.has(label));
  const ceremonies = saits.filter((row) => row.kind === "ceremony");

  return {
    festivals,
    markers,
    ceremonies,
    empty: !festivals.length && !markers.length && !ceremonies.length,
    copy: {
      holiday: t("sections.public_holiday"),
      vidhi: t("sections.festival_vidhi"),
      sait: t("ui.home.sait_heading"),
      ceremonies: t("sections.ceremony_saits"),
      note: saits.length ? saitNote(p.festival_saits, t) : null,
    },
  };
}

/* ── planets at the anchor moment ── */
export function usePlanetsPanel(p: PanchangaDay) {
  const { t, lang } = useLocale();
  const planets = getPlanetRows(p);
  const lagna = getLagnaDisplay(p);
  if (!planets.length && !lagna) return null;
  return {
    title: t("sections.planet_positions"),
    anchor: getPlanetsAnchorLabel(p, lang),
    lagna: lagna
      ? {
          badge: t("panchanga.asc"),
          title: t("sections.lagna"),
          sign: formatRashiDisplay(lagna.nameNe, undefined, lang) ?? lagna.nameNe,
          degree: lagna.degree ? `${lagna.degree}°` : null,
        }
      : null,
    planets: planets.map(({ key, label, labelEn, rashiNe, rashiEn, coords, isRetrograde, isCombust }) => ({
      key,
      name: bilingualText(lang, label, labelEn),
      rashi: rashiNe || rashiEn ? (formatRashiDisplay(rashiNe, rashiEn, lang) ?? bilingualText(lang, rashiNe ?? "", rashiEn ?? "")) : null,
      coords,
      isRetrograde,
      isCombust,
    })),
  };
}
