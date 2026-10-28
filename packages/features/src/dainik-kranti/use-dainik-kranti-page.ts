/**
 * Dainik kranti (daily patro) page logic, shared by the website
 * (`apps/web/src/pages/DainikKranti.tsx`) and the app
 * (`apps/mobile/app/(tabs)/dainikkranti.tsx`): the month's days filtered by
 * paksha, every day row (angas, sun and moon, transits, festivals, the
 * lagna/graha expand), the month tables, the gochar chart and its rashyadi
 * tables, the gochar list, kartavya, the legends, and copy.
 *
 * Each app passes what differs by platform: which month is browsed (the
 * website keeps it in the URL, the app in screen state), the paksha state,
 * whether the layout is compact (one paksha at a time), and the month query
 * source (the app reads it through its offline store).
 */
import { useEffect, useMemo, useState } from "react";
import type { NowHeroView } from "../common/now-hero";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import {
  fetchGochar,
  fetchGocharIngress,
  fetchSpecialMonths,
  gocharKeys,
  specialMonthsKeys,
  type CalendarDay,
  type CalendarDayAnga,
  type LocationParams,
  type MonthCalendar,
  type PanchangaDay,
} from "@vedic-patro/api-client";
import { todayAdString } from "@vedic-patro/domain/calendar/bs-calendar";
import {
  defaultMobilePaksha,
  dowOf,
  embedRashi,
  lunarMonthNe,
  pakshaSegmentOf,
  pakshaShort,
  phaseOf,
  weekdayLabel,
  type Phase,
} from "@vedic-patro/read-models/jyotish/dainikKranti/day-helpers";
import { buildGapanshaLine, buildPapanshaDisplayLine } from "@vedic-patro/read-models/jyotish/dainikKranti/gapansha";
import { formatGocharBsLabel, grahaRashiNe } from "@vedic-patro/read-models/jyotish/dainikKranti/gochar-display";
import { ingressEventBsDayForMonth } from "@vedic-patro/read-models/jyotish/dainikKranti/ingress-day-match";
import {
  buildCalcNotes,
  buildGrahaSpashtaMatrix,
  buildLagnaMatrix,
  type CalcNote,
  type GrahaSpashtaRow,
  type LagnaMatrixRow,
} from "@vedic-patro/read-models/jyotish/dainikKranti/month-patro-tables";
import { buildRashyadiRangeTables } from "@vedic-patro/read-models/jyotish/dainikKranti/rashyadi-segments";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { isGregorianEra } from "@vedic-patro/domain/calendar/era";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatTimeShort, formatVedicPatroTime, getRituDisplay } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { formatBsDateKey } from "@vedic-patro/domain/calendar/patro-day";
import { getRashiName, resolveRashiDisplay } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";
import { kshayaViewOf } from "../adhik-maas/kshaya-view";

export type DainikPakshaFilter = Phase | "all";

export const DAINIK_STALE_TIME = 1000 * 60 * 30;

const GRAHA_KEYS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"] as const;
const UDAYAST_LEGEND_COUNT = 5;
const GOCHAR_LEGEND_COUNT = 6;

/** 27 nakshatras in canonical order, matching the gochar API spellings. */
const NAKSHATRA_EN = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

/** Rashi (Nepali) containing a given nakshatra·pada — 9 padas span each rashi. */
function rashiNeFromNakPada(nakshatraEn?: string, pada?: number): string | undefined {
  if (!nakshatraEn || !pada) return undefined;
  const ni = NAKSHATRA_EN.findIndex((n) => n.toLowerCase() === nakshatraEn.toLowerCase());
  if (ni < 0) return undefined;
  const absPada = ni * 4 + (pada - 1);
  return getRashiName(Math.floor(absPada / 9) + 1, "ne");
}

function fmtAd(dateAd: string, isEn: boolean): string {
  const d = new Date(`${dateAd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateAd;
  return d.toLocaleDateString(isEn ? "en-US" : "ne-NP", { day: "numeric", month: "short" });
}

function isVakri(g: { motion?: string; is_retrograde?: boolean }): boolean {
  return g.is_retrograde === true || /vakr|retro/i.test(g.motion ?? "");
}

export type DainikAnga = { value: string; until: string | null };
export type DainikTransit = { label: string; planet: string; time?: string };

export type DainikDayRow = {
  key: string;
  day: CalendarDay;
  /** Paksha section heading drawn before this day, when a new one starts. */
  segLabel?: string;
  isToday: boolean;
  isSaturday: boolean;
  hasFestival: boolean;
  /** Saturday or festival: the day number is drawn in the holiday colour. */
  holiday: boolean;
  /** Large day number (BS gate, or the AD day when browsing AD). */
  dayNumber: string;
  /** Small AD day under/after the gate; null when the AD day is the main number. */
  adDay: string | null;
  weekday: string;
  tithi: DainikAnga;
  nakshatra: DainikAnga;
  yoga: DainikAnga;
  karana: DainikAnga;
  sun: { times: string; sign: string };
  moon: DainikAnga;
  transits: DainikTransit[];
  festivals: string | null;
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
  hasExtra: boolean;
  expanded: boolean;
  toggle: () => void;
  ariaLabel: string;
};

export type DainikGocharRow = {
  key: string;
  name: string;
  rashi: string;
  next: { label: string; time: string } | null;
  dms: string | null;
  motion: string;
  vakri: boolean;
};

export type DainikMonthSource = { queryKey: QueryKey; queryFn: () => Promise<MonthCalendar> };

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

export function useDainikKrantiPage({
  browse,
  location,
  paksha,
  setPaksha,
  compact,
  monthSource,
}: {
  browse: { era: Era; year: number; month: number };
  location: { params: LocationParams };
  /** The chosen paksha filter (the website keeps it in the URL). */
  paksha: DainikPakshaFilter;
  setPaksha: (next: DainikPakshaFilter) => void;
  /** Narrow layouts show one paksha at a time (Krishna/Shukla, no "all"). */
  compact: boolean;
  monthSource: DainikMonthSource;
}) {
  const { t, lang, digits: dg } = useLocale();
  const isEn = lang === "en";
  const { era, year, month } = browse;
  const params = location.params;
  // The browse era (the calendar preference) decides AD vs BS; `isEn` only picks the text language.
  const adBrowse = isGregorianEra(era);
  const nowKey = useMemo(() => todayAdString(), []);
  const at = (time: string) => t("dainik.at_time", { time: dg(time) });
  const angaEnd = (anga: CalendarDayAnga | undefined) => {
    const time = formatTimeShort(anga?.end ?? anga?.end_local_time);
    return time ? at(time) : null;
  };
  const grahaName = (key: string, ne?: string, en?: string) =>
    (GRAHA_KEYS as readonly string[]).includes(key.toLowerCase())
      ? t(`dainik.graha.${key.toLowerCase()}`)
      : (isEn ? en : ne) ?? ne ?? key;

  /* ── day expansion, reset whenever the month, paksha or place changes ── */
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const expandResetKey = `${era}|${year}|${month}|${paksha}|${params.lat}|${params.lon}`;
  const [trackedExpandKey, setTrackedExpandKey] = useState(expandResetKey);
  if (expandResetKey !== trackedExpandKey) {
    setTrackedExpandKey(expandResetKey);
    setExpandedDays(new Set());
  }
  const toggleDay = (dateAd: string) =>
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateAd)) next.delete(dateAd);
      else next.add(dateAd);
      return next;
    });

  /* ── the month ── */
  const monthQ = useQuery({ queryKey: monthSource.queryKey, queryFn: monthSource.queryFn, staleTime: DAINIK_STALE_TIME });
  const allDays = useMemo(() => monthQ.data?.calendar ?? [], [monthQ.data]);

  const effectivePaksha: DainikPakshaFilter =
    compact && paksha === "all" ? defaultMobilePaksha(allDays, nowKey) : paksha;

  // Compact layouts never show both pakshas at once — drop "all" for a Krishna/Shukla toggle.
  useEffect(() => {
    if (!compact || paksha !== "all" || allDays.length === 0) return;
    setPaksha(defaultMobilePaksha(allDays, nowKey));
  }, [compact, paksha, allDays, nowKey, setPaksha]);

  const compactPaksha: Phase =
    effectivePaksha === "krishna" || effectivePaksha === "shukla" ? effectivePaksha : defaultMobilePaksha(allDays, nowKey);

  const days = useMemo(
    () => (effectivePaksha === "all" ? allDays : allDays.filter((d) => phaseOf(d) === effectivePaksha)),
    [allDays, effectivePaksha],
  );

  // Adhik / kshaya maas info for the displayed year (drives shuddha vs adhik labels).
  const specialQ = useQuery({
    queryKey: specialMonthsKeys.year(year),
    queryFn: () => fetchSpecialMonths(year),
    enabled: era === "bs",
    staleTime: 1000 * 60 * 60,
  });
  // A BS year can hold two adhik months (BS 2039); use the one the browsed month sits in or just after.
  const firstDay = allDays[0]?.date_ad;
  const lastDay = allDays[allDays.length - 1]?.date_ad;
  const adhikMonths = specialQ.data?.adhik_months ?? (specialQ.data?.adhik_maas ? [specialQ.data.adhik_maas] : []);
  const adhik =
    (firstDay && lastDay
      ? adhikMonths.find(
          (a) =>
            a.has_adhik_maas &&
            a.start_date &&
            a.end_date &&
            a.start_date <= lastDay &&
            // the shuddha month that follows runs ~a lunar month past the adhik
            addDaysIso(a.end_date, 32) >= firstDay,
        )
      : undefined) ?? adhikMonths[0];
  const adhikMonthEn = adhik?.has_adhik_maas ? adhik.month_name : undefined;
  const monthHasAdhik = allDays.some((d) => {
    const lc = d.panchanga?.lunar_calendar;
    return lc?.purnimant?.is_adhik === true || lc?.amanta?.is_adhik === true || d.panchanga?.lunar_month?.is_adhik === true;
  });

  // A kshaya (dropped) month is announced while the browsed month overlaps it.
  const kshaya = kshayaViewOf(specialQ.data?.kshaya_maas, { lang, digits: dg, t });
  const monthHasKshaya =
    kshaya !== null && allDays.some((d) => d.date_ad >= kshaya.startDate && d.date_ad <= kshaya.endDate);

  const headerByDate = useMemo(() => {
    const out: Record<string, string> = {};
    let prevKey = "";
    for (const d of days) {
      const seg = pakshaSegmentOf(d, adhikMonthEn, isEn);
      if (seg.key !== prevKey) {
        out[d.date_ad] = seg.label;
        prevKey = seg.key;
      }
    }
    return out;
  }, [days, adhikMonthEn, isEn]);

  /* ── gochar, anchored to the month start so each planet's next entry covers the month ── */
  const gocharApiEra: "bs" | "ad" = adBrowse ? "ad" : "bs";
  const gocharAnchor = adBrowse ? (allDays[0]?.date_ad ?? null) : formatBsDateKey(year, month, 1);
  const gocharEnd = adBrowse
    ? (allDays[allDays.length - 1]?.date_ad ?? null)
    : formatBsDateKey(year, month, allDays[allDays.length - 1]?.day ?? monthQ.data?.month_length ?? 30);
  const gocharReady = Boolean(gocharAnchor && gocharEnd);

  const gocharQ = useQuery({
    queryKey: gocharKeys.dayLegacy(gocharAnchor ?? "", gocharApiEra, params),
    queryFn: () => fetchGochar(gocharAnchor!, gocharApiEra, params),
    enabled: gocharReady,
    staleTime: DAINIK_STALE_TIME,
  });
  const grahas = useMemo(
    () => Object.entries(gocharQ.data?.gochar ?? {}).map(([key, g]) => ({ key, ...g })),
    [gocharQ.data],
  );

  const ingressQ = useQuery({
    queryKey: gocharKeys.ingressEra(gocharAnchor ?? "", gocharEnd ?? "", "patro", gocharApiEra, params),
    queryFn: () => fetchGocharIngress(gocharAnchor!, gocharEnd!, params, { level: "patro", era: gocharApiEra }),
    enabled: gocharReady,
    staleTime: DAINIK_STALE_TIME,
  });
  const events = useMemo(() => ingressQ.data?.events ?? [], [ingressQ.data]);
  const ingressBrowse = useMemo(() => ({ year, month }), [year, month]);

  // Per-day grahachar / udayast — keyed by BS gate (vedic sunrise day).
  const transitsByBsDay = useMemo(() => {
    const out: Record<number, (DainikTransit & { sortKey: string })[]> = {};
    const sunriseByDate = Object.fromEntries(allDays.map((d) => [d.date_ad, d.sunrise]));
    for (const ev of events) {
      const bsDay = ingressEventBsDayForMonth(ev, year, month, allDays);
      if (bsDay == null) continue;
      const rowDateAd = allDays.find((d) => d.day === bsDay)?.date_ad;
      if (!rowDateAd) continue;
      const isRashi = ev.level === "rashi";
      const plain = ev.level === "motion" || ev.level === "udayast";
      let label: string;
      if (plain) label = ev.label_ne ?? "";
      else if (isEn)
        label = isRashi
          ? t("dainik.transit_into_rashi", { name: resolveRashiDisplay(ev.to_rashi_ne, ev.to_rashi, "en") ?? ev.to_rashi ?? ev.to_rashi_ne ?? "" }).trim()
          : ev.to_pada
            ? t("dainik.transit_into_nakshatra", { nakshatra: ev.to_nakshatra ?? ev.to_nakshatra_ne ?? "", pada: ev.to_pada }).trim()
            : (ev.to_nakshatra ?? ev.to_nakshatra_ne ?? "").trim();
      else if (isRashi) label = ev.label_ne ?? t("dainik.transit_into_rashi", { name: ev.to_rashi_ne ?? "" });
      else
        label = embedRashi(
          ev.label_ne ??
            t("dainik.transit_into_nakshatra", { nakshatra: ev.to_nakshatra_ne ?? "", pada: ev.to_pada_ne ?? "" })
              .replace(/\s+/g, " ")
              .trim(),
          rashiNeFromNakPada(ev.to_nakshatra, ev.to_pada),
        );
      const timeRaw = ev.entry_time_local_short ?? ev.entry_time_local?.split(" ")[1];
      const time = timeRaw ? (formatVedicPatroTime(timeRaw, sunriseByDate[rowDateAd]) ?? timeRaw) : undefined;
      (out[bsDay] ??= []).push({
        label,
        planet: grahaName(ev.graha, ev.graha_ne, ev.graha_ne),
        time: time ? dg(time) : undefined,
        sortKey: ev.entry_time_utc ?? `${rowDateAd}T${timeRaw ?? "00:00"}`,
      });
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return out;
    // `t`/`dg` follow `lang`; the rashi names also read the active bundle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, allDays, lang, year, month]);

  /* ── month tables ── */
  const lagnaMatrix = useMemo(() => buildLagnaMatrix(days), [days]);
  const grahaMatrix = useMemo(() => buildGrahaSpashtaMatrix(days), [days]);
  const calcNotes = useMemo(
    () => buildCalcNotes(days, events, headerByDate, allDays, ingressBrowse),
    [days, events, headerByDate, allDays, ingressBrowse],
  );
  const rashyadiRange = useMemo(
    () => buildRashyadiRangeTables(days, allDays, events, (d) => pakshaSegmentOf(d, adhikMonthEn, isEn), ingressBrowse),
    [days, allDays, events, adhikMonthEn, isEn, ingressBrowse],
  );
  const papanshaLine = useMemo(() => (days.length === 0 ? "" : buildPapanshaDisplayLine(days[0]!)), [days]);
  const gapanshaLine = useMemo(
    () => (days.length === 0 ? "" : buildGapanshaLine(days, allDays, events, ingressBrowse)),
    [days, allDays, events, ingressBrowse],
  );
  const lagnaByDate = useMemo(() => Object.fromEntries(lagnaMatrix.map((r) => [r.dateAd, r])), [lagnaMatrix]);
  const grahaByDate = useMemo(() => Object.fromEntries(grahaMatrix.map((r) => [r.dateAd, r])), [grahaMatrix]);
  const notesByDate = useMemo(() => {
    const out: Record<string, CalcNote[]> = {};
    for (const n of calcNotes) (out[n.dateAd] ??= []).push(n);
    return out;
  }, [calcNotes]);

  /* ── day rows ── */
  const pickName = (ne?: string | null, en?: string | null) => bilingualText(lang, ne ?? en, en ?? ne) ?? "—";
  const rowOf = (d: CalendarDay): DainikDayRow => {
    const det = d.panchanga;
    const isSaturday = dowOf(d.date_ad) === 6;
    const hasFestival = (d.festivals?.length ?? 0) > 0;
    const adDate = new Date(`${d.date_ad}T00:00:00`);
    const adDayNum = Number.isNaN(adDate.getTime()) ? null : adDate.getDate();
    const adOnly = adBrowse && adDayNum != null;
    const sunRashi = resolveRashiDisplay(det?.surya_rashi_ne, det?.surya_rashi, lang);
    const span = det?.chandra_rashi_spans?.[0];
    const moonLabel = span
      ? (resolveRashiDisplay(span.name_ne, span.name, lang) ?? "—")
      : (resolveRashiDisplay(det?.chandra_rashi_ne ?? d.chandra_rashi_ne, det?.chandra_rashi ?? d.chandra_rashi, lang) ?? "—");
    const spans = det?.chandra_rashi_spans;
    const moonEndRaw =
      span && ((spans?.length ?? 0) > 1 || Boolean(span.end_local_time_short ?? span.end_local_time ?? span.end_hours_clock))
        ? formatTimeShort(span.end_local_time_short ?? span.end_local_time ?? span.end_hours_clock)
        : null;
    const lagna = lagnaByDate[d.date_ad];
    const graha = grahaByDate[d.date_ad];
    const notes = notesByDate[d.date_ad];
    const until = (key: string, values: Record<string, string>) => t(key, values);
    const tithiEnd = angaEnd(det?.tithi);
    const nakEnd = angaEnd(det?.nakshatra);
    const yogaEnd = angaEnd(det?.yoga);
    const karanaEnd = angaEnd(det?.karana);
    const rise = d.sunrise ? dg(formatTimeShort(d.sunrise) ?? d.sunrise) : "—";
    const set = d.sunset ? dg(formatTimeShort(d.sunset) ?? d.sunset) : "—";
    return {
      key: d.date_ad,
      day: d,
      segLabel: headerByDate[d.date_ad],
      isToday: d.date_ad === nowKey,
      isSaturday,
      hasFestival,
      holiday: isSaturday || hasFestival,
      dayNumber: adOnly ? dg(adDayNum) : dg(d.day),
      adDay: adOnly || adDayNum == null ? null : dg(adDayNum),
      weekday: weekdayLabel(d, isEn),
      tithi: {
        value: `${pakshaShort(d, isEn)} ${pickName(d.tithi_ne, d.tithi)}`.trim(),
        until: tithiEnd ? until("ui.dainik_kranti.until_tithiend", { tithiEnd }) : null,
      },
      nakshatra: { value: pickName(d.nakshatra_ne, d.nakshatra), until: nakEnd ? until("ui.dainik_kranti.until_nakend", { nakEnd }) : null },
      yoga: { value: pickName(d.yoga_ne, d.yoga), until: yogaEnd ? until("ui.dainik_kranti.until_yogaend", { yogaEnd }) : null },
      karana: { value: pickName(d.karana_ne, d.karana), until: karanaEnd ? until("ui.dainik_kranti.until_karanaend", { karanaEnd }) : null },
      sun: { times: `${rise}/${set}`, sign: sunRashi ? (det?.ayana_mark ? `${sunRashi} ${det.ayana_mark}` : sunRashi) : "—" },
      moon: { value: moonLabel, until: moonEndRaw ? until("ui.dainik_kranti.until_end", { end: at(moonEndRaw) }) : null },
      transits: (transitsByBsDay[d.day] ?? []).map(({ label, planet, time }) => ({ label, planet, time })),
      festivals: hasFestival ? d.festivals.join(" · ") : null,
      lagna,
      graha,
      notes,
      hasExtra: Boolean(lagna || graha || (notes?.length ?? 0) > 0),
      expanded: expandedDays.has(d.date_ad),
      toggle: () => toggleDay(d.date_ad),
      ariaLabel: t("ui.dainik_kranti.lagna_planets_for_day_day", { day: dg(d.day) }),
    };
  };
  const rows: DainikDayRow[] = days.map(rowOf);

  // Today's panchanga on top, whichever paksha the table shows.
  const todayDay = allDays.find((d) => d.date_ad === nowKey);
  const todayRow = todayDay ? rowOf(todayDay) : undefined;
  const hero: NowHeroView | undefined = todayRow
    ? {
        eyebrow: t("now_hero.dainik_today"),
        live: true,
        tone: todayRow.holiday ? "bad" : "plain",
        title: todayRow.tithi.value,
        subtitle: [todayRow.weekday, todayRow.dayNumber].join(" · "),
        foot: { left: todayRow.tithi.until ?? undefined, right: todayRow.festivals ?? undefined },
        facts: [
          { label: t("dainik.nakshatra"), value: todayRow.nakshatra.value, sub: todayRow.nakshatra.until ?? undefined },
          { label: t("dainik.yoga"), value: todayRow.yoga.value, sub: todayRow.yoga.until ?? undefined },
          { label: t("dainik.karana"), value: todayRow.karana.value, sub: todayRow.karana.until ?? undefined },
          { label: t("dainik.moon_sign"), value: todayRow.moon.value, sub: todayRow.moon.until ?? undefined },
          { label: t("dainik.sun_rise_set"), value: todayRow.sun.times, sub: todayRow.sun.sign },
        ],
      }
    : undefined;

  /* ── gochar list and legend ── */
  const gocharRows: DainikGocharRow[] = grahas.map((g) => {
    const vakri = isVakri(g);
    const nextPada = g.next_pada_entry;
    const nextRashi = g.next_rashi_entry;
    return {
      key: g.key,
      name: bilingualText(lang, g.name_ne, isEn ? grahaName(g.key, g.name_ne, g.name_vedic ?? g.name_ne) : g.name_ne) ?? g.key,
      rashi: resolveRashiDisplay(g.rashi_ne ?? grahaRashiNe(g), g.rashi, lang) ?? "",
      next: nextPada
        ? {
            label: bilingualText(lang, nextPada.label_ne, nextPada.to_rashi ?? nextPada.label_ne) ?? "",
            time: dg(nextPada.entry_time_local_short ?? nextPada.entry_time_local ?? ""),
          }
        : nextRashi
          ? {
              label: `→ ${resolveRashiDisplay(nextRashi.to_rashi_ne, nextRashi.to_rashi, lang) ?? "—"}`,
              time: dg(nextRashi.entry_time_local),
            }
          : null,
      dms: g.dms_in_rashi ? dg(g.dms_in_rashi) : null,
      motion: vakri ? t("dainik.motion.vakri") : t("dainik.motion.margi"),
      vakri,
    };
  });

  const gocharData = gocharQ.data;
  const legendDate = gocharData?.date_ad
    ? t("ui.dainik_kranti.position_on_datelabel", {
        dateLabel: (adBrowse ? undefined : formatGocharBsLabel(gocharData.date_bs, gocharData.date_ad, lang)) ?? fmtAd(gocharData.date_ad, isEn),
      })
    : null;

  /* ── header copy ── */
  const ritu = useMemo(() => {
    const dp = allDays.find((d) => d.panchanga?.ritu_ne)?.panchanga;
    return dp ? getRituDisplay(dp as PanchangaDay, lang) : undefined;
  }, [allDays, lang]);
  const monthData = monthQ.data;
  const monthLabel = bilingualText(
    lang,
    monthData?.month_name_ne ?? monthData?.month_name ?? "",
    monthData?.month_name ?? monthData?.month_name_ne ?? "",
  );
  const pakshaTitle = t(`dainik.paksha_title.${effectivePaksha}`);
  const refDay = days[0];

  return {
    era,
    adBrowse,
    todayKey: nowKey,
    effectivePaksha,
    compactPaksha,
    status: {
      monthLoading: monthQ.isLoading,
      monthError: monthQ.isError,
      gocharLoading: gocharQ.isLoading,
      ingressLoading: ingressQ.isLoading,
      /** Anything on the page still loading for the first time. */
      pageLoading: monthQ.isLoading || specialQ.isLoading || gocharQ.isLoading || ingressQ.isLoading,
      hasMonth: Boolean(monthData),
      empty: !monthQ.isLoading && days.length === 0,
    },
    header: {
      title: `${monthLabel} ${dg(year)} · ${pakshaTitle}`,
      yearBs: monthData?.year_bs ? `${dg(monthData.year_bs)} ${t("dainik.bs")}` : null,
      ritu: ritu ? `${t("dainik.season")}: ${ritu}` : null,
      dayCount: allDays.length ? `${dg(days.length)} ${t("dainik.days")}` : null,
      intro: t("ui.dainikkranti.daily_panchanga_by_paksha_tithi_nakshatra"),
    },
    /** The adhik-maas notice (`Trans` key with <b> tags), when this month has one. */
    adhikNotice:
      monthHasAdhik && adhik?.month_name
        ? { i18nKey: "dainik.adhik_notice", values: { month: lunarMonthNe(adhik.month_name, isEn) ?? adhik.month_name } }
        : null,
    /** The kshaya-maas notice (`Trans` key with <b> tags), when this month falls in one. */
    kshayaNotice:
      monthHasKshaya && kshaya
        ? {
            i18nKey: "dainik.kshaya_notice",
            values: {
              month: kshaya.months,
              range: kshaya.range,
              adhikLine: kshaya.adhik ? t("dainik.kshaya_notice_adhik", { adhik: kshaya.adhik }) : "",
            },
          }
        : null,
    rows,
    hero,
    tables: { lagnaMatrix, grahaMatrix, calcNotes, rashyadiRange, papanshaLine, gapanshaLine },
    sunRef: refDay
      ? {
          sunrise: refDay.sunrise ? dg(formatTimeShort(refDay.sunrise) ?? refDay.sunrise) : "—",
          sunset: refDay.sunset ? dg(formatTimeShort(refDay.sunset) ?? refDay.sunset) : "—",
        }
      : null,
    gochar: {
      grahas,
      rows: gocharRows,
      dateBs: gocharData?.date_bs,
      dateAd: gocharData?.date_ad,
      emptyText: gocharQ.isLoading ? t("dainik.loading") : t("dainik.no_details_available"),
      legendDate,
    },
    kartavya: {
      title: `${pakshaTitle} ${t("dainik.duties")}`,
      paragraphs:
        effectivePaksha === "all"
          ? [t("dainik.kartavya.krishna"), t("dainik.kartavya.shukla")]
          : [t(`dainik.kartavya.${effectivePaksha}`)],
    },
    legends: {
      udayast: Array.from({ length: UDAYAST_LEGEND_COUNT }, (_, i) => ({
        code: t(`dainik.udayast_legend.${i + 1}.code`),
        full: t(`dainik.udayast_legend.${i + 1}.full`),
        meaning: t(`dainik.udayast_legend.${i + 1}.meaning`),
      })),
      gochar: Array.from({ length: GOCHAR_LEGEND_COUNT }, (_, i) => ({
        code: t(`dainik.gochar_legend.${i + 1}.code`),
        meaning: t(`dainik.gochar_legend.${i + 1}.meaning`),
      })),
      positionsNoteKey: "dainik.legend_note_positions",
      dashaNoteKey: "dainik.legend_note_dasha",
    },
    copy: {
      pakshaAria: t("calendar.paksha_aria"),
      pakshaOptions: [
        ["all", t("calendar.paksha_all")],
        ["krishna", t("calendar.paksha_krishna")],
        ["shukla", t("calendar.paksha_shukla")],
      ] as [DainikPakshaFilter, string][],
      today: t("dainik.today"),
      loadError: t("dainik.could_not_load_details_please_try_again"),
      noDays: t("dainik.no_days_found_in_this_paksha"),
      expand: t("dainik.expand"),
      colDay: adBrowse ? t("dainik.date") : t("dainik.col_gate"),
      tithi: t("dainik.tithi"),
      nakshatra: t("dainik.nakshatra"),
      yoga: t("dainik.yoga"),
      karana: t("dainik.karana"),
      sunRiseSet: t("dainik.sun_rise_set"),
      sign: t("dainik.sign"),
      moon: t("dainik.moon"),
      sunRiseSetSign: t("dainik.sun_rise_set_sign"),
      moonSign: t("dainik.moon_sign"),
      transits: t("dainik.transits_rise_set"),
      festival: t("dainik.festival"),
      hideDetails: t("dainik.hide_details"),
      showDetails: t("dainik.lagna_planets_more"),
      lagnaMonth: t("dainik.daily_lagna_start_timetable_full_month"),
      lagnaMonthIntro: t("ui.dainikkranti.for_each_day_which_rashi_rises"),
      grahaMonth: t("dainik.planetary_positions_at_sunrise_full_month"),
      grahaMonthIntro: t("ui.dainikkranti.the_planets_rashi_positions_at_the"),
      calcNotes: t("dainik.calculation_notes_special_days"),
      sunrise: t("dainik.sunrise"),
      sunset: t("dainik.sunset"),
      gocharTitle: t("dainik.planetary_transits_next_sankranti"),
      legendTitle: t("dainik.planet_positions_rise_set_transit_legend"),
      legendPositions: t("dainik.planet_positions_deg_kala_vikala"),
      legendUdayast: t("dainik.planet_rise_set_symbols"),
      legendGochar: t("dainik.transit_papashanti_house_symbols"),
    },
  };
}
