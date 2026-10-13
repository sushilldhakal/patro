import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { AppShell } from "@/components/AppShell";
import { DayPatroCard, type TransitEvent } from "@/components/dainikKranti/DayPatroCard";
import { DayPatroExpandPanel } from "@/components/dainikKranti/DayPatroExpandPanel";
import {
  DainikKrantiHeader,
  type PakshaFilter,
} from "@/components/dainikKranti/DainikKrantiHeader";
import { GocharRashyadiBlock } from "@/components/dainikKranti/GocharRashyadiBlock";
import { SunriseSunsetIcon } from "@/components/panchanga/SunriseSunsetIcon";
import { MonthCalcNotes } from "@/components/dainikKranti/MonthCalcNotes";
import { MonthGrahaSpashta } from "@/components/dainikKranti/MonthGrahaSpashta";
import { MonthLagnaMatrix } from "@/components/dainikKranti/MonthLagnaMatrix";
import { PatroAccordion, PatroAccordionItem } from "@/components/dainikKranti/PatroAccordion";
import {
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableScrollShell,
} from "@/components/ui/DataTable";
import {
  apiKeys,
  fetchGochar,
  fetchGocharIngress,
  fetchSpecialMonths,
  gocharKeys,
  specialMonthsKeys,
  type CalendarDay,
  type CalendarDayAnga,
} from "@/lib/api";
import {
  BS_MONTHS_NE,
  BS_MONTH_NAMES,
  getCurrentBs,
  shiftBsMonth,
  todayAdString,
} from "@vedic-patro/domain/bs-calendar";
import { BS_SUPPORTED_END_YEAR, BS_SUPPORTED_START_YEAR } from "@/lib/bs-range";
import { buildGapanshaLine, buildPapanshaDisplayLine } from "@vedic-patro/domain/dainikKranti/gapansha";
import { ingressEventBsDayForMonth } from "@vedic-patro/domain/dainikKranti/ingress-day-match";
import { grahaRashiNe, formatGocharBsLabel } from "@vedic-patro/domain/dainikKranti/gochar-display";
import { buildRashyadiRangeTables } from "@vedic-patro/domain/dainikKranti/rashyadi-segments";
import {
  buildCalcNotes,
  buildGrahaSpashtaMatrix,
  buildLagnaMatrix,
} from "@vedic-patro/domain/dainikKranti/month-patro-tables";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatBsDateKey, parseCivilIso } from "@vedic-patro/domain/patro-day";
import { formatTimeShort, formatVedicPatroTime } from "@vedic-patro/domain/panchanga-format";
import { resolveRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { patroStickyHeadCell } from "@/lib/patro-classes";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";
import { type Phase, defaultMobilePaksha, embedRashi, phaseOf, pakshaShort, lunarMonthNe, pakshaSegmentOf, weekdayLabel, dowOf } from "@vedic-patro/domain/dainikKranti/day-helpers";

import { illustration } from "@vedic-patro/design-tokens";
const RASHI_NE = [
  "मेष", "वृष", "मिथुन", "कर्क", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
] as const;

const RASHI_EN = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;

const NAKSHATRA_EN = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

const GRAHA_TABLE_NE: Record<string, string> = {
  sun: "सूर्य", moon: "चन्द्र", mars: "मंगल", mercury: "बुध", jupiter: "गुरु",
  venus: "शुक्र", saturn: "शनि", rahu: "राहु", ketu: "केतु",
};

const GRAHA_TABLE_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu",
};

const KARTAVYA: Record<Phase, { ne: string; en: string }> = {
  krishna: {
    ne: "कृष्ण पक्षमा चन्द्रमा क्रमशः क्षीण हुँदै जान्छ। श्राद्ध, तर्पण र पितृकार्य, संयमित आहार, जप र दान शुभ मानिन्छ। एकादशीमा व्रत र औंसीमा पितृ-तर्पण गरिन्छ; नयाँ मांगलिक कार्य प्रायः शुक्ल पक्षमा सारिन्छ।",
    en: "During Krishna Paksha the Moon gradually wanes. Shraddha, tarpana and ancestral rites, moderate diet, japa and charity are considered auspicious. Ekadashi fasting and ancestral tarpana on Aaushi are observed; new auspicious ceremonies are usually moved to Shukla Paksha.",
  },
  shukla: {
    ne: "शुक्ल पक्षमा चन्द्रमा क्रमशः वृद्धि हुँदै जान्छ। विवाह, व्रतबन्ध, गृहप्रवेश, यात्रा र नयाँ कार्यारम्भ जस्ता मांगलिक कार्य शुभ मानिन्छन्। एकादशी व्रत र पूर्णिमामा सत्यनारायण पूजा/व्रत गरिन्छ।",
    en: "During Shukla Paksha the Moon gradually waxes. Auspicious ceremonies such as weddings, sacred-thread rites, house-warming, travel and new beginnings are considered favourable. Ekadashi fasting and Satyanarayan puja/fasting on the full moon are observed.",
  },
};

const UDAYAST_LEGEND = [
  { code: "व.उ.", full: "वक्र उदय", fullEn: "Retrograde rising", meaning: "ग्रह वक्र (उल्टो) अवस्थामा उदय भएको।", meaningEn: "The planet rises while retrograde (moving backward)." },
  { code: "बु.मा.उ.", full: "बुध मार्गी उदय", fullEn: "Mercury direct rising", meaning: "बुध मार्गी (सुल्टो) भएर उदय भएको।", meaningEn: "Mercury rises while direct (moving forward)." },
  { code: "वृ.व.उ.", full: "बृहस्पति वक्र उदय", fullEn: "Jupiter retrograde rising", meaning: "बृहस्पति (गुरु) वक्र अवस्थामा उदय भएको।", meaningEn: "Jupiter rises while retrograde." },
  { code: "शु.मा.उ.", full: "शुक्र मार्गी उदय", fullEn: "Venus direct rising", meaning: "शुक्र मार्गी भएर उदय भएको।", meaningEn: "Venus rises while direct." },
  { code: "श.मा.उ. ७अ.", full: "शनि मार्गी उदय, ७ अस्त", fullEn: "Saturn direct rising, sets on the 7th", meaning: "शनि मार्गी भएर उदय भएको र ७ गते अस्त हुने।", meaningEn: "Saturn rises while direct and sets on the 7th." },
];

const GOCHAR_LEGEND = [
  { code: "पापाशाः", meaning: "पापशान्ति — कुण्डलीका अशुभ (पाप) ग्रहहरूको स्थिति।", meaningEn: "Papashanti — position of the malefic (papa) planets in the chart." },
  { code: "सू२", meaning: "सूर्य दोस्रो घर (भाव) मा रहेको।", meaningEn: "The Sun is in the second house (bhava)." },
  { code: "२७सू३", meaning: "२७ गते सूर्य तेस्रो घरमा प्रवेश गर्ने।", meaningEn: "The Sun enters the third house on the 27th." },
  { code: "म.१", meaning: "मंगल पहिलो घरमा रहेको।", meaningEn: "Mars is in the first house." },
  { code: "श.९", meaning: "शनि नवौँ घरमा रहेको।", meaningEn: "Saturn is in the ninth house." },
  { code: "रा.५ के.११", meaning: "राहु पाँचौँ र केतु एघारौँ घरमा रहेको।", meaningEn: "Rahu is in the fifth and Ketu in the eleventh house." },
];

function rashiEnToNe(en?: string): string | undefined {
  if (!en) return undefined;
  const i = RASHI_EN.findIndex((r) => r.toLowerCase() === en.toLowerCase());
  return i >= 0 ? RASHI_NE[i] : en;
}

function rashiNeFromNakPada(nakshatraEn?: string, pada?: number): string | undefined {
  if (!nakshatraEn || !pada) return undefined;
  const ni = NAKSHATRA_EN.findIndex((n) => n.toLowerCase() === nakshatraEn.toLowerCase());
  if (ni < 0) return undefined;
  const absPada = ni * 4 + (pada - 1);
  return RASHI_NE[Math.floor(absPada / 9)];
}

function grahaTableNe(key: string, fallback?: string): string {
  return GRAHA_TABLE_NE[key] ?? fallback ?? key;
}

function grahaTableEn(key: string, fallback?: string): string {
  return GRAHA_TABLE_EN[key.toLowerCase()] ?? fallback ?? key;
}

function adDayOfMonth(dateAd: string): number {
  try {
    return parseCivilIso(dateAd).day;
  } catch {
    const d = new Date(`${dateAd}T00:00:00`);
    return Number.isNaN(d.getTime()) ? 0 : d.getDate();
  }
}

function fmtAd(dateAd: string, _isEn: boolean): string {
  const day = adDayOfMonth(dateAd);
  return day > 0 ? String(day) : dateAd;
}

function motionNe(g: { motion?: string; is_retrograde?: boolean }) {
  const vakri = g.is_retrograde === true || /vakr|retro/i.test(g.motion ?? "");
  return { label: vakri ? "वक्री" : "मार्गी", labelEn: vakri ? "Retrograde" : "Direct", vakri };
}

/** Fixed column widths — header and body must use the same `TableHeaderCell` / `TableCell` props. */
const DAINIK_COL_EXPAND = 36;
const DAINIK_COL_GATE = 88;
const DAINIK_COL_TITHI = 96;
const DAINIK_COL_NAK = 96;
const DAINIK_COL_YOGA = 72;
const DAINIK_COL_KARANA = 72;
const DAINIK_SUN_COL_W = 116;
const DAINIK_MOON_COL_W = 88;
const DAINIK_COL_TRANSIT = 218;
const DAINIK_FESTIVAL_COL_W = 330;

const DAINIK_TABLE_WIDTH =
  DAINIK_COL_EXPAND +
  DAINIK_COL_GATE +
  DAINIK_COL_TITHI +
  DAINIK_COL_NAK +
  DAINIK_COL_YOGA +
  DAINIK_COL_KARANA +
  DAINIK_SUN_COL_W +
  DAINIK_MOON_COL_W +
  DAINIK_COL_TRANSIT +
  DAINIK_FESTIVAL_COL_W;

function sunRiseSetSignParts(
  day: CalendarDay,
  sunRashi: string,
  ayanaMark: string | undefined,
  dg: (v: string | number) => string,
): { times: string; sign: string } {
  const rise = day.sunrise ? dg(formatTimeShort(day.sunrise) ?? day.sunrise) : "—";
  const set = day.sunset ? dg(formatTimeShort(day.sunset) ?? day.sunset) : "—";
  return {
    times: `${rise}/${set}`,
    sign: sunRashi ? (ayanaMark ? `${sunRashi} ${ayanaMark}` : sunRashi) : "—",
  };
}

function SunRiseSetSignValue({
  day,
  sunRashi,
  ayanaMark,
  dg,
  subLineClass,
}: {
  day: CalendarDay;
  sunRashi: string;
  ayanaMark?: string;
  dg: (v: string | number) => string;
  subLineClass: string;
}) {
  const { times, sign } = sunRiseSetSignParts(day, sunRashi, ayanaMark, dg);
  return (
    <View className={dainikKrantiClasses.field}>
      <Text className={cn(dainikKrantiClasses.sunRiseSetTimes, "font-num leading-snug")} style={nepaliTextStyle()}>{times}</Text>
      <Text className={cn(subLineClass, "leading-snug")} style={nepaliTextStyle()}>{sign}</Text>
    </View>
  );
}

function moonRashiLabel(
  day: CalendarDay,
  det: CalendarDay["panchanga"],
  pick: (ne: string, en: string) => string,
  lang: string,
): string {
  const span = det?.chandra_rashi_spans?.[0];
  if (span) {
    return (
      resolveRashiDisplay(span.name_ne, span.name, lang) ??
      pick(span.name_ne ?? span.name ?? "—", span.name ?? span.name_ne ?? "—")
    );
  }
  return (
    resolveRashiDisplay(det?.chandra_rashi_ne ?? day.chandra_rashi_ne, det?.chandra_rashi ?? day.chandra_rashi, lang) ??
    pick(det?.chandra_rashi_ne ?? day.chandra_rashi_ne ?? "—", det?.chandra_rashi ?? day.chandra_rashi ?? "—")
  );
}

function moonRashiEnd(
  det: CalendarDay["panchanga"],
  dg: (v: string | number) => string,
  isEn: boolean,
): string | null {
  const spans = det?.chandra_rashi_spans;
  const first = spans?.[0];
  if (!first) return null;
  const changesSameDay =
    (spans?.length ?? 0) > 1 ||
    Boolean(first.end_local_time_short ?? first.end_local_time ?? first.end_hours_clock);
  if (!changesSameDay) return null;
  const t = formatTimeShort(
    first.end_local_time_short ?? first.end_local_time ?? first.end_hours_clock,
  );
  if (!t) return null;
  return isEn ? dg(t) : `${dg(t)} बजे`;
}

function MoonRashiValue({
  day,
  det,
  dg,
  isEn,
  pick,
  subLineClass,
  lang,
}: {
  day: CalendarDay;
  det: CalendarDay["panchanga"];
  dg: (v: string | number) => string;
  isEn: boolean;
  pick: (ne: string, en: string) => string;
  subLineClass: string;
  lang: string;
}) {
  const label = moonRashiLabel(day, det, pick, lang);
  const end = moonRashiEnd(det, dg, isEn);
  return (
    <View>
      <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>{label}</Text>
      {end ? <Text className={subLineClass} style={nepaliTextStyle()}>{pick(`${end} सम्म`, `until ${end}`)}</Text> : null}
    </View>
  );
}

export default function DainikKrantiScreen() {
  const { t, pick, digits, lang, isEnglish } = useLocale();
  const { isCompact, isTablet, width: screenWidth } = useBreakpoint();
  const colors = useThemeColors();
  const grahaCols = screenWidth >= 1024 ? 4 : screenWidth >= 640 ? 3 : 2;
  const { location, setLocation } = usePanchangaLocation();
  const today = useMemo(() => getCurrentBs(), []);
  const todayAd = todayAdString();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);
  const [paksha, setPaksha] = useState<PakshaFilter>("all");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const toggleDayExpand = useCallback((dateAd: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateAd)) next.delete(dateAd);
      else next.add(dateAd);
      return next;
    });
  }, []);

  useEffect(() => {
    setExpandedDays(new Set());
  }, [year, month, paksha, location.params.lat, location.params.lon]);

  const goMonth = useCallback(
    (delta: number) => {
      const next = shiftBsMonth(year, month, delta);
      setYear(next.year);
      setMonth(next.month);
    },
    [year, month],
  );

  const goToday = () => {
    const c = getCurrentBs();
    setYear(c.year);
    setMonth(c.month);
  };

  const monthQ = useQuery({
    queryKey: apiKeys.month(year, month, location.params),
    queryFn: () => fetchMonthCalendarOffline(year, month, location.params),
    staleTime: 1000 * 60 * 30,
  });

  const allDays = useMemo(() => monthQ.data?.calendar ?? [], [monthQ.data]);

  const effectivePaksha = useMemo((): PakshaFilter => {
    if (!isCompact) return paksha;
    if (paksha === "krishna" || paksha === "shukla") return paksha;
    return defaultMobilePaksha(allDays, todayAd);
  }, [isCompact, paksha, allDays, todayAd]);

  useEffect(() => {
    if (!isCompact || paksha !== "all" || allDays.length === 0) return;
    setPaksha(defaultMobilePaksha(allDays, todayAd));
  }, [isCompact, paksha, allDays, todayAd]);

  const mobilePakshaDisplay =
    effectivePaksha === "krishna" || effectivePaksha === "shukla"
      ? effectivePaksha
      : defaultMobilePaksha(allDays, todayAd);

  const days = useMemo(
    () =>
      effectivePaksha === "all"
        ? allDays
        : allDays.filter((d) => phaseOf(d) === effectivePaksha),
    [allDays, effectivePaksha],
  );

  const specialQ = useQuery({
    queryKey: specialMonthsKeys.year(year),
    queryFn: () => fetchSpecialMonths(year),
    staleTime: 1000 * 60 * 60,
  });

  const adhik = specialQ.data?.adhik_maas;
  const adhikMonthEn = adhik?.has_adhik_maas ? adhik.month_name : undefined;
  const monthHasAdhik = useMemo(
    () =>
      allDays.some((d) => {
        const lc = d.panchanga?.lunar_calendar;
        return (
          lc?.purnimant?.is_adhik === true ||
          lc?.amanta?.is_adhik === true ||
          d.panchanga?.lunar_month?.is_adhik === true
        );
      }),
    [allDays],
  );

  const headerByDate = useMemo(() => {
    const out: Record<string, string> = {};
    let prevKey = "";
    for (const d of days) {
      const seg = pakshaSegmentOf(d, adhikMonthEn, isEnglish);
      if (seg.key !== prevKey) {
        out[d.date_ad] = seg.label;
        prevKey = seg.key;
      }
    }
    return out;
  }, [days, adhikMonthEn, isEnglish]);

  const gocharAnchor = useMemo(
    () => formatBsDateKey(year, month, 1),
    [year, month],
  );
  const gocharEnd = useMemo(() => {
    const lastDay = allDays[allDays.length - 1]?.day ?? monthQ.data?.month_length ?? 30;
    return formatBsDateKey(year, month, lastDay);
  }, [year, month, allDays, monthQ.data?.month_length]);
  const gocharReady = Boolean(allDays.length > 0);

  const gocharQ = useQuery({
    queryKey: gocharKeys.dayLegacy(gocharAnchor, "bs", location.params),
    queryFn: () => fetchGochar(gocharAnchor, "bs", location.params),
    enabled: gocharReady,
    staleTime: 1000 * 60 * 30,
  });

  const grahas = useMemo(
    () => Object.entries(gocharQ.data?.gochar ?? {}).map(([key, g]) => ({ key, ...g })),
    [gocharQ.data],
  );

  const monthEnd = gocharEnd;
  const ingressQ = useQuery({
    queryKey: gocharKeys.ingress(gocharAnchor, monthEnd, "patro", location.params),
    queryFn: () =>
      fetchGocharIngress(gocharAnchor, monthEnd, location.params, {
        level: "patro",
        era: "bs",
      }),
    enabled: gocharReady,
    staleTime: 1000 * 60 * 30,
  });

  const transitsByBsDay = useMemo(() => {
    const out: Record<number, TransitEvent[]> = {};
    const sunriseByDate = Object.fromEntries(allDays.map((d) => [d.date_ad, d.sunrise]));

    for (const ev of ingressQ.data?.events ?? []) {
      const bsDay = ingressEventBsDayForMonth(ev, year, month, allDays);
      if (bsDay == null) continue;
      const rowDateAd = allDays.find((d) => d.day === bsDay)?.date_ad;
      if (!rowDateAd) continue;

      const planetNe = grahaTableNe(ev.graha, ev.graha_ne);
      const planetEn = grahaTableEn(ev.graha, ev.graha_ne);
      const isRashi = ev.level === "rashi";
      const isUdayast = ev.level === "udayast";
      const isMotion = ev.level === "motion";
      const rashiDisplayNe = resolveRashiDisplay(ev.to_rashi_ne, ev.to_rashi, lang);
      const baseLabel = isMotion
        ? (ev.label_ne ?? "")
        : isUdayast
          ? (ev.label_ne ?? "")
          : isRashi
            ? (ev.label_ne ?? `${rashiDisplayNe ?? ev.to_rashi_ne ?? ""}मा`)
            : (ev.label_ne ?? `${ev.to_nakshatra_ne ?? ""} ${ev.to_pada_ne ?? ""} मा`.trim());
      const rashiNe = isRashi ? ev.to_rashi_ne : rashiNeFromNakPada(ev.to_nakshatra, ev.to_pada);
      const labelNe =
        isMotion || isUdayast || isRashi ? baseLabel : embedRashi(baseLabel, rashiNe);
      const labelEn =
        isMotion || isUdayast
          ? (ev.label_ne ?? "")
          : isRashi
            ? `→ ${resolveRashiDisplay(ev.to_rashi_ne, ev.to_rashi, "en") ?? ev.to_rashi ?? ev.to_rashi_ne ?? ""}`.trim()
            : `${ev.to_nakshatra ?? ev.to_nakshatra_ne ?? ""}${ev.to_pada ? ` pada ${ev.to_pada}` : ""}`.trim();
      const timeRaw = ev.entry_time_local_short ?? ev.entry_time_local?.split(" ")[1];
      const time = timeRaw
        ? formatVedicPatroTime(timeRaw, sunriseByDate[rowDateAd]) ?? timeRaw
        : undefined;

      (out[bsDay] ??= []).push({
        planetNe,
        planetEn,
        labelNe,
        labelEn,
        time,
        sortKey: ev.entry_time_utc ?? `${rowDateAd}T${timeRaw ?? "00:00"}`,
      });
    }

    for (const day of Object.keys(out)) {
      out[Number(day)]!.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }
    return out;
  }, [ingressQ.data, allDays, year, month, lang]);

  const lagnaMatrix = useMemo(() => buildLagnaMatrix(days), [days]);
  const grahaMatrix = useMemo(() => buildGrahaSpashtaMatrix(days), [days]);
  const calcNotes = useMemo(
    () => buildCalcNotes(days, ingressQ.data?.events ?? [], headerByDate),
    [days, ingressQ.data?.events, headerByDate],
  );
  const rashyadiRange = useMemo(
    () =>
      buildRashyadiRangeTables(
        days,
        allDays,
        ingressQ.data?.events ?? [],
        (d) => pakshaSegmentOf(d, adhikMonthEn, isEnglish),
      ),
    [days, allDays, ingressQ.data?.events, adhikMonthEn, isEnglish],
  );
  const papanshaLine = useMemo(() => (days.length === 0 ? "" : buildPapanshaDisplayLine(days[0]!)), [days]);
  const gapanshaLine = useMemo(
    () => (days.length === 0 ? "" : buildGapanshaLine(days, allDays, ingressQ.data?.events ?? [])),
    [days, allDays, ingressQ.data?.events],
  );

  const lagnaByDate = useMemo(
    () => Object.fromEntries(lagnaMatrix.map((r) => [r.dateAd, r])),
    [lagnaMatrix],
  );
  const grahaByDate = useMemo(
    () => Object.fromEntries(grahaMatrix.map((r) => [r.dateAd, r])),
    [grahaMatrix],
  );
  const notesByDate = useMemo(() => {
    const out: Record<string, typeof calcNotes> = {};
    for (const n of calcNotes) {
      (out[n.dateAd] ??= []).push(n);
    }
    return out;
  }, [calcNotes]);

  const ritu = useMemo(() => {
    const dp = allDays.find((d) => d.panchanga?.ritu_ne)?.panchanga;
    if (!dp) return undefined;
    return isEnglish ? ((dp as { ritu?: string }).ritu ?? dp.ritu_ne) : dp.ritu_ne;
  }, [allDays, isEnglish]);

  const monthLabel = isEnglish
    ? `${BS_MONTH_NAMES[month - 1]} (${BS_MONTHS_NE[month - 1]})`
    : BS_MONTHS_NE[month - 1];
  const pakshaLabel = isEnglish
    ? effectivePaksha === "krishna"
      ? "Krishna Paksha"
      : effectivePaksha === "shukla"
        ? "Shukla Paksha"
        : "Full month"
    : effectivePaksha === "krishna"
      ? "कृष्णपक्ष"
      : effectivePaksha === "shukla"
        ? "शुक्लपक्ष"
        : "पूरा महिना";

  const pageLoading =
    monthQ.isLoading || specialQ.isLoading || gocharQ.isLoading || ingressQ.isLoading;

  const refDay = days[0];

  return (
    <AppShell title={t("sidebar_nav.items.dainikkranti.label")} showHeader={false}>
      <View className={dainikKrantiClasses.pageBody}>
      <DainikKrantiHeader
        year={year}
        month={month}
        paksha={paksha}
        mobilePakshaDisplay={mobilePakshaDisplay}
        onPakshaChange={setPaksha}
        onToday={goToday}
        onMonthChange={setMonth}
        onYearChange={setYear}
        onPrev={() => goMonth(-1)}
        onNext={() => goMonth(1)}
        prevDisabled={month === 1 && year <= BS_SUPPORTED_START_YEAR}
        nextDisabled={month === 12 && year >= BS_SUPPORTED_END_YEAR}
        location={location}
        onLocationChange={setLocation}
      />

      <View className={cn(dainikKrantiClasses.monthHead, "gap-1")}>
        <View className={dainikKrantiClasses.monthTitleRow}>
          <Text className={dainikKrantiClasses.monthTitle} style={nepaliTextStyle()}>
            {monthLabel} {digits(year)} · {pakshaLabel}
          </Text>
          {monthQ.data?.year_bs ? (
            <Text className={dainikKrantiClasses.metaText} style={nepaliTextStyle()}>
              {digits(monthQ.data.year_bs)} {t("dainik.bs")}
            </Text>
          ) : null}
          {ritu ? (
            <Text className={dainikKrantiClasses.metaText} style={nepaliTextStyle()}>
              · {t("ui.dainikkranti.ritu")}: {ritu}
            </Text>
          ) : null}
          {allDays.length ? (
            <Text className={dainikKrantiClasses.metaSmall} style={nepaliTextStyle()}>
              · {digits(days.length)} {t("common.days")}
            </Text>
          ) : null}
        </View>
        <Text className={dainikKrantiClasses.metaText} style={nepaliTextStyle()}>
          {t("ui.dainikkranti.daily_panchanga_by_paksha_tithi_nakshatra")}
        </Text>
      </View>

      {monthHasAdhik && adhik?.month_name ? (
        <View className={dainikKrantiClasses.adhikBox}>
          <Text className={dainikKrantiClasses.adhikText} style={nepaliTextStyle()}>
            <Text className={cn(dainikKrantiClasses.adhikText, dainikKrantiClasses.adhikStrong)}>{t("ui.dainikkranti.adhik_maas")}</Text>
            {pick(
              ` यस वर्ष अधिक ${lunarMonthNe(adhik.month_name)} मास परेको छ — त्यसैले यो महिनामा अधिक र शुद्ध पक्षहरू छुट्टाछुट्टै देखाइएका छन्। (अधिक मास = मलमास / पुरुषोत्तम मास; यसमा सङ्क्रान्ति पर्दैन।)`,
              ` this year has an Adhik ${lunarMonthNe(adhik.month_name, true)} month — so the adhik and shuddha pakshas are shown separately for this month. (Adhik Maas = Malamas / Purushottam Maas; it contains no sankranti.)`,
            )}
          </Text>
        </View>
      ) : null}

      {pageLoading && !monthQ.data ? (
        <View className="py-16">
          <VedicPatroLoader />
        </View>
      ) : (
        <View className={dainikKrantiClasses.pageBody}>
          <View className="gap-4">
          {isCompact ? (
            <View className="gap-3">
              {monthQ.isError ? (
                <View className={dainikKrantiClasses.stateBox}>
                  <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
                    {t("dainik.could_not_load_details_please_try_again")}
                  </Text>
                </View>
              ) : days.length === 0 ? (
                <View className={dainikKrantiClasses.stateBox}>
                  <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
                    {t("dainik.no_days_found_in_this_paksha")}
                  </Text>
                </View>
              ) : (
                days.map((d, dayIndex) => {
                  const segLabel = headerByDate[d.date_ad];
                  return (
                    <Fragment key={d.date_ad}>
                      {segLabel ? (
                        <Text className={dainikKrantiClasses.segLabel} style={nepaliTextStyle()}>
                          {segLabel}
                        </Text>
                      ) : null}
                      <DayPatroCard
                        day={d}
                        isToday={d.date_ad === todayAd}
                        isExpanded={expandedDays.has(d.date_ad)}
                        onToggle={() => toggleDayExpand(d.date_ad)}
                        transits={transitsByBsDay[d.day]}
                        lagna={lagnaByDate[d.date_ad]}
                        graha={grahaByDate[d.date_ad]}
                        notes={notesByDate[d.date_ad]}
                      />
                    </Fragment>
                  );
                })
              )}
            </View>
          ) : (
            <DesktopPatroTable
              days={days}
              todayAd={todayAd}
              headerByDate={headerByDate}
              transitsByBsDay={transitsByBsDay}
              expandedDays={expandedDays}
              onToggleDay={toggleDayExpand}
              lagnaByDate={lagnaByDate}
              grahaByDate={grahaByDate}
              notesByDate={notesByDate}
              isError={monthQ.isError}
              pick={pick}
              digits={digits}
              lang={lang}
            />
          )}

          <PatroAccordion>
            <PatroAccordionItem
              value="lagna-month"
              title={t("dainik.daily_lagna_start_timetable_full_month")}
            >
              <Text className={dainikKrantiClasses.accordionIntro} style={nepaliTextStyle()}>
                {t("ui.dainikkranti.for_each_day_which_rashi_rises")}
              </Text>
              <View className={cn(dainikKrantiClasses.accordionTable, "overflow-hidden")}>
                <MonthLagnaMatrix
                  embedded
                  rows={lagnaMatrix}
                  todayKey={todayAd}
                  loading={monthQ.isLoading}
                  empty={!monthQ.isLoading && days.length === 0}
                />
              </View>
            </PatroAccordionItem>

            <PatroAccordionItem
              value="graha-month"
              title={t("dainik.planetary_positions_at_sunrise_full_month")}
            >
              <Text className={dainikKrantiClasses.accordionIntro} style={nepaliTextStyle()}>
                {t("ui.dainikkranti.the_planets_rashi_positions_at_the")}
              </Text>
              <MonthGrahaSpashta
                embedded
                rows={grahaMatrix}
                todayKey={todayAd}
                loading={monthQ.isLoading}
                empty={!monthQ.isLoading && days.length === 0}
              />
            </PatroAccordionItem>

            <PatroAccordionItem
              value="calc-notes"
              title={t("dainik.calculation_notes_special_days")}
            >
              <MonthCalcNotes embedded notes={calcNotes} loading={monthQ.isLoading || ingressQ.isLoading} />
            </PatroAccordionItem>
          </PatroAccordion>

          </View>

          <View className="gap-5">
          {refDay ? (
            <View className="flex-row gap-3">
              <View className={cn(dainikKrantiClasses.sunBox, "flex-1")}>
                <SunriseSunsetIcon variant="rise" size={20} color={illustration.orange50} />
                <View>
                  <Text className={dainikKrantiClasses.sunLabel} style={nepaliTextStyle()}>{t("kundali.sunrise")}</Text>
                  <Text className={dainikKrantiClasses.sunValue} style={nepaliTextStyle()}>
                    {refDay.sunrise ? digits(formatTimeShort(refDay.sunrise) ?? refDay.sunrise) : "—"}
                  </Text>
                </View>
              </View>
              <View className={cn(dainikKrantiClasses.sunBox, "flex-1")}>
                <SunriseSunsetIcon variant="set" size={20} color={illustration.blue67} />
                <View>
                  <Text className={dainikKrantiClasses.sunLabel} style={nepaliTextStyle()}>{t("kundali.sunset")}</Text>
                  <Text className={dainikKrantiClasses.sunValue} style={nepaliTextStyle()}>
                    {refDay.sunset ? digits(formatTimeShort(refDay.sunset) ?? refDay.sunset) : "—"}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          <GocharRashyadiBlock
            rashyadiRange={rashyadiRange}
            grahas={grahas}
            papanshaLine={papanshaLine}
            gapanshaLine={gapanshaLine}
            dateBs={gocharQ.data?.date_bs}
            dateAd={gocharQ.data?.date_ad}
            gocharLoading={gocharQ.isLoading}
            rashyadiLoading={monthQ.isLoading || ingressQ.isLoading}
          />

          <View className={dainikKrantiClasses.panel}>
            <Text className={dainikKrantiClasses.panelTitle} style={nepaliTextStyle()}>
              {t("dainik.planetary_transits_next_sankranti")}
            </Text>
            {grahas.length === 0 ? (
              <Text className={dainikKrantiClasses.panelText} style={nepaliTextStyle()}>
                {gocharQ.isLoading ? t("rashifal.profile.loading") : t("dainik.no_details_available")}
              </Text>
            ) : (
              <View className="gap-1.5">
                {grahas.map((g) => (
                  <View key={g.key} className={dainikKrantiClasses.gocharRow}>
                    <Text className={cn("flex-1 text-sm", dainikKrantiClasses.gocharName)} style={nepaliTextStyle()}>
                      {pick(g.name_ne, grahaTableEn(g.key, g.name_vedic ?? g.name_ne))}
                      <Text className="text-sm"> {pick(grahaRashiNe(g) ?? "", g.rashi ?? grahaRashiNe(g) ?? "")}</Text>
                    </Text>
                    {g.next_pada_entry ? (
                      <Text className={dainikKrantiClasses.gocharNext} style={nepaliTextStyle()}>
                        {pick(g.next_pada_entry.label_ne ?? "", g.next_pada_entry.to_rashi ?? g.next_pada_entry.label_ne ?? "")}
                        {"\n"}
                        {digits(g.next_pada_entry.entry_time_local_short ?? g.next_pada_entry.entry_time_local ?? "")}
                      </Text>
                    ) : g.next_rashi_entry ? (
                      <Text className={dainikKrantiClasses.gocharNext} style={nepaliTextStyle()}>
                        → {pick(g.next_rashi_entry.to_rashi_ne ?? rashiEnToNe(g.next_rashi_entry.to_rashi) ?? g.next_rashi_entry.to_rashi ?? "", g.next_rashi_entry.to_rashi ?? g.next_rashi_entry.to_rashi_ne ?? "")}
                        {"\n"}
                        {digits(g.next_rashi_entry.entry_time_local)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View className={dainikKrantiClasses.panelMuted}>
            <Text className={dainikKrantiClasses.panelTitle} style={nepaliTextStyle()}>
              {pakshaLabel} {t("dainik.duties")}
            </Text>
            <View className="gap-2">
              {effectivePaksha === "all" ? (
                <>
                  <Text className={dainikKrantiClasses.kartavyaText} style={nepaliTextStyle()}>
                    {pick(KARTAVYA.krishna.ne, KARTAVYA.krishna.en)}
                  </Text>
                  <Text className={dainikKrantiClasses.kartavyaText} style={nepaliTextStyle()}>
                    {pick(KARTAVYA.shukla.ne, KARTAVYA.shukla.en)}
                  </Text>
                </>
              ) : (
                <Text className={dainikKrantiClasses.kartavyaText} style={nepaliTextStyle()}>
                  {pick(KARTAVYA[effectivePaksha].ne, KARTAVYA[effectivePaksha].en)}
                </Text>
              )}
            </View>
          </View>
          </View>
        </View>
      )}

      {!(pageLoading && !monthQ.data) ? (
        <View className={dainikKrantiClasses.legendCard}>
          <View className={dainikKrantiClasses.legendHead}>
            <Ionicons name="sparkles-outline" size={16} color={colors.secondary} />
            <Text className={dainikKrantiClasses.legendTitle} style={nepaliTextStyle()}>
              {t("dainik.planet_positions_rise_set_transit_legend")}
            </Text>
            {gocharQ.data?.date_ad ? (
              <Text className={dainikKrantiClasses.legendDate} style={nepaliTextStyle()}>
                {pick(
                  `${formatGocharBsLabel(gocharQ.data.date_bs, gocharQ.data.date_ad) ?? fmtAd(gocharQ.data.date_ad, false)} को स्थिति`,
                  `Position on ${formatGocharBsLabel(gocharQ.data.date_bs, gocharQ.data.date_ad) ?? fmtAd(gocharQ.data.date_ad, true)}`,
                )}
              </Text>
            ) : null}
          </View>

          <View className={cn(dainikKrantiClasses.legendBody, "gap-y-6")}>
            <View>
              <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
                {t("dainik.planet_positions_deg_kala_vikala")}
              </Text>
              {grahas.length === 0 ? (
                <Text className={dainikKrantiClasses.panelText} style={nepaliTextStyle()}>
                  {gocharQ.isLoading ? t("rashifal.profile.loading") : t("dainik.no_details_available")}
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-y-1.5">
                  {grahas.map((g) => {
                    const m = motionNe(g);
                    return (
                      <View
                        key={g.key}
                        style={{ width: `${100 / grahaCols}%` }}
                        className="pr-4"
                      >
                        <View className={dainikKrantiClasses.legendPlanetRow}>
                          <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)} style={nepaliTextStyle()}>
                            {pick(g.name_ne, grahaTableEn(g.key, g.name_vedic ?? g.name_ne))}
                          </Text>
                          <Text className={dainikKrantiClasses.legendPlanetText} style={nepaliTextStyle()}>{pick(grahaRashiNe(g) ?? "", g.rashi ?? grahaRashiNe(g) ?? "")}</Text>
                          {g.dms_in_rashi ? (
                            <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)} style={nepaliTextStyle()}>{digits(g.dms_in_rashi)}</Text>
                          ) : null}
                          <View
                            className={cn(
                              dainikKrantiClasses.motionPill,
                              m.vakri ? dainikKrantiClasses.motionVakriBg : dainikKrantiClasses.motionMargiBg,
                            )}
                          >
                            <Text
                              className={cn(
                                dainikKrantiClasses.metaSmall,
                                m.vakri ? dainikKrantiClasses.motionVakriText : dainikKrantiClasses.motionMargiText,
                              )}
                              style={nepaliTextStyle()}
                            >
                              {pick(m.label, m.labelEn)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              <Text className={cn(dainikKrantiClasses.legendNote, "mt-2")} style={nepaliTextStyle()}>
                {t("ui.dainikkranti.at_the_start_of_each_paksha")}
                <Text className={cn(dainikKrantiClasses.legendNote, dainikKrantiClasses.motionVakriText)}>{t("ui.dainikkranti.vakri")}</Text>
                {t("ui.dainikkranti.retrograde_backward_motion")}
                <Text className={cn(dainikKrantiClasses.legendNote, dainikKrantiClasses.motionMargiText)}>{t("ui.dainikkranti.margi")}</Text>
                {t("ui.dainikkranti.direct_forward_motion")}
              </Text>
            </View>

            <View className="gap-6 md:flex-row md:gap-x-8">
              <View className="flex-1">
                <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
                  {t("dainik.planet_rise_set_symbols")}
                </Text>
                <View className="gap-1.5">
                  {UDAYAST_LEGEND.map((it) => (
                    <View key={it.code} className={dainikKrantiClasses.legendRow}>
                      <View className={cn("w-24 items-start", dainikKrantiClasses.legendCodeCol)}>
                        <View className={dainikKrantiClasses.legendCodeChip}>
                          <Text className={dainikKrantiClasses.legendCodeText} style={nepaliTextStyle()}>{it.code}</Text>
                        </View>
                      </View>
                      <Text className="flex-1 text-sm" style={nepaliTextStyle()}>
                        <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendMeaning)}>{pick(it.full, it.fullEn)}</Text> — {pick(it.meaning, it.meaningEn)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="flex-1">
                <Text className={dainikKrantiClasses.legendHeading} style={nepaliTextStyle()}>
                  {t("dainik.transit_papashanti_house_symbols")}
                </Text>
                <View className="gap-1.5">
                  {GOCHAR_LEGEND.map((it) => (
                    <View key={it.code} className={dainikKrantiClasses.legendRow}>
                      <View className={cn("w-20 items-start", dainikKrantiClasses.legendCodeCol)}>
                        <View className={dainikKrantiClasses.legendCodeChip}>
                          <Text className={dainikKrantiClasses.legendCodeText} style={nepaliTextStyle()}>{it.code}</Text>
                        </View>
                      </View>
                      <Text className="flex-1 text-sm" style={nepaliTextStyle()}>
                        {pick(it.meaning, it.meaningEn)}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className={cn(dainikKrantiClasses.legendNote, "mt-3")} style={nepaliTextStyle()}>
                  <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendStrong)}>{t("ui.dainikkranti.dasha_bracket")}</Text>
                  {t("ui.dainikkranti.the_years_months_days_of_vimshottari")}
                  <Text className={cn(dainikKrantiClasses.legendPlanetText, dainikKrantiClasses.legendStrong)}>{t("ui.dainikkranti.time_correction")}</Text>
                  {t("ui.dainikkranti.in_print_symbols_like_u_or")}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
      </View>
    </AppShell>
  );
}

function angaEnd(anga: CalendarDayAnga | undefined, dg: (v: string | number) => string, isEn: boolean): string | null {
  const t = formatTimeShort(anga?.end ?? anga?.end_local_time);
  if (!t) return null;
  return isEn ? dg(t) : `${dg(t)} बजे`;
}

type DesktopProps = {
  days: CalendarDay[];
  todayAd: string;
  headerByDate: Record<string, string>;
  transitsByBsDay: Record<number, TransitEvent[]>;
  expandedDays: Set<string>;
  onToggleDay: (dateAd: string) => void;
  lagnaByDate: Record<string, ReturnType<typeof buildLagnaMatrix>[number]>;
  grahaByDate: Record<string, ReturnType<typeof buildGrahaSpashtaMatrix>[number]>;
  notesByDate: Record<string, ReturnType<typeof buildCalcNotes>>;
  isError: boolean;
  pick: (ne: string, en: string) => string;
  digits: (v: string | number) => string;
  lang: string;
};

function DesktopPatroTable({
  days,
  todayAd,
  headerByDate,
  transitsByBsDay,
  expandedDays,
  onToggleDay,
  lagnaByDate,
  grahaByDate,
  notesByDate,
  isError,
  pick,
  digits,
  lang,
}: DesktopProps) {
  const colors = useThemeColors();
  const isEn = lang === "en";
  const th = cn(dainikKrantiClasses.th, "text-foreground");
  const thWrap = cn(dainikKrantiClasses.thWrap, "text-foreground");
  const subLine = dainikKrantiClasses.subLine;

  return (
    <TableScrollShell stretch={false} className="w-full rounded-xl">
      <View style={{ width: DAINIK_TABLE_WIDTH }}>
        <TableHeader>
          <TableHeaderCell width={DAINIK_COL_EXPAND} className={patroStickyHeadCell}>
            {null}
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_GATE} className={patroStickyHeadCell}>
            <Text className={th}>{pick("गते", "Day")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_TITHI} className={patroStickyHeadCell}>
            <Text className={th}>{pick("तिथि", "Tithi")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_NAK} className={patroStickyHeadCell}>
            <Text className={th}>{pick("नक्षत्र", "Nakshatra")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_YOGA} className={patroStickyHeadCell}>
            <Text className={th}>{pick("योग", "Yoga")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_KARANA} className={patroStickyHeadCell}>
            <Text className={th}>{pick("करण", "Karana")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_SUN_COL_W} className={cn(patroStickyHeadCell, "min-h-10")}>
            <Text className={thWrap}>{pick("सूर्य उदय/अस्त", "Sun rise/set")}</Text>
            <Text className={thWrap}>{pick("राशि", "Sign")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_MOON_COL_W} className={cn(patroStickyHeadCell, "min-h-10")}>
            <Text className={thWrap}>{pick("चन्द्र", "Moon")}</Text>
            <Text className={thWrap}>{pick("राशि", "Sign")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_COL_TRANSIT} className={patroStickyHeadCell}>
            <Text className={thWrap}>{pick("ग्रहचार / उदयास्त (बजे)", "Transits / rise-set")}</Text>
          </TableHeaderCell>
          <TableHeaderCell width={DAINIK_FESTIVAL_COL_W} className={patroStickyHeadCell}>
            <Text className={th}>{pick("पर्व", "Festival")}</Text>
          </TableHeaderCell>
        </TableHeader>

        {isError ? (
          <View className="py-8">
            <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
              {pick("विवरण ल्याउन सकिएन।", "Could not load details.")}
            </Text>
          </View>
        ) : days.length === 0 ? (
          <View className="py-8">
            <Text className={dainikKrantiClasses.stateText} style={nepaliTextStyle()}>
              {pick("यो पक्षमा कुनै दिन भेटिएन।", "No days found in this paksha.")}
            </Text>
          </View>
        ) : (
          days.map((d, dayIndex) => {
            const det = d.panchanga;
            const tithiEnd = angaEnd(det?.tithi, digits, isEn);
            const nakEnd = angaEnd(det?.nakshatra, digits, isEn);
            const yogaEnd = angaEnd(det?.yoga, digits, isEn);
            const karanaEnd = angaEnd(det?.karana, digits, isEn);
            const sunRashi =
              resolveRashiDisplay(det?.surya_rashi_ne, det?.surya_rashi, lang) ??
              pick(det?.surya_rashi_ne ?? "", det?.surya_rashi ?? "");
            const isSaturday = dowOf(d.date_ad) === 6;
            const isToday = d.date_ad === todayAd;
            const hasFestival = (d.festivals?.length ?? 0) > 0;
            const segLabel = headerByDate[d.date_ad];
            const isExpanded = expandedDays.has(d.date_ad);

            return (
              <Fragment key={d.date_ad}>
                {segLabel ? (
                  <View className={cn("border-b border-border px-3", dainikKrantiClasses.segRow)}>
                    <Text className={dainikKrantiClasses.segRowText} style={nepaliTextStyle()}>
                      {segLabel}
                    </Text>
                  </View>
                ) : null}
                <TableRow
                  rowIndex={dayIndex}
                  highlight={isToday}
                  borderTop={false}
                  className="border-b border-border"
                  onPress={() => onToggleDay(d.date_ad)}
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={pick(
                    `${digits(d.day)} गते — लग्न र ग्रहस्पष्ट`,
                    `Day ${digits(d.day)} — lagna & planets`,
                  )}
                >
                  <TableCell width={DAINIK_COL_EXPAND} align="center">
                    <View className="h-7 w-7 items-center justify-center" accessibilityElementsHidden>
                      <Ionicons
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={16}
                        color={colors.foreground}
                      />
                    </View>
                  </TableCell>
                  <TableCell width={DAINIK_COL_GATE} className={cn(isSaturday && dainikKrantiClasses.saturday)}>
                    <View className={cn(dainikKrantiClasses.dateCell, "flex-row items-center")}>
                      {isToday ? (
                        <View className={dainikKrantiClasses.todayDot} accessibilityElementsHidden />
                      ) : null}
                      <Text
                        className={cn(dainikKrantiClasses.dayNumBs, (isSaturday || hasFestival) ? dainikKrantiClasses.saturday : "text-foreground")}
                        style={nepaliTextStyle()}
                      >
                        {digits(d.day)}{" "}
                        <Text className={dainikKrantiClasses.dayNumAdSmall} style={nepaliTextStyle()}>{digits(fmtAd(d.date_ad, isEn))}</Text>
                      </Text>
                    </View>
                    <Text className={cn(subLine, isSaturday && dainikKrantiClasses.saturday)} style={nepaliTextStyle()}>
                      {weekdayLabel(d, isEn)}
                    </Text>
                  </TableCell>
                  <TableCell width={DAINIK_COL_TITHI}>
                    <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>
                      {pakshaShort(d, isEn)} {pick(d.tithi_ne ?? d.tithi, d.tithi ?? d.tithi_ne) ?? "—"}
                    </Text>
                    {tithiEnd ? <Text className={subLine} style={nepaliTextStyle()}>{pick(`${tithiEnd} सम्म`, `until ${tithiEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_COL_NAK}>
                    <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>{pick(d.nakshatra_ne ?? d.nakshatra ?? "—", d.nakshatra ?? d.nakshatra_ne ?? "—")}</Text>
                    {nakEnd ? <Text className={subLine} style={nepaliTextStyle()}>{pick(`${nakEnd} सम्म`, `until ${nakEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_COL_YOGA}>
                    <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>{pick(d.yoga_ne ?? d.yoga ?? "—", d.yoga ?? d.yoga_ne ?? "—")}</Text>
                    {yogaEnd ? <Text className={subLine} style={nepaliTextStyle()}>{pick(`${yogaEnd} सम्म`, `until ${yogaEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_COL_KARANA}>
                    <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>{pick(d.karana_ne ?? d.karana ?? "—", d.karana ?? d.karana_ne ?? "—")}</Text>
                    {karanaEnd ? <Text className={subLine} style={nepaliTextStyle()}>{pick(`${karanaEnd} सम्म`, `until ${karanaEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_SUN_COL_W}>
                    <SunRiseSetSignValue
                      day={d}
                      sunRashi={sunRashi}
                      ayanaMark={det?.ayana_mark}
                      dg={digits}
                      subLineClass={subLine}
                    />
                  </TableCell>
                  <TableCell width={DAINIK_MOON_COL_W}>
                    <MoonRashiValue
                      day={d}
                      det={det}
                      dg={digits}
                      isEn={isEn}
                      pick={pick}
                      subLineClass={subLine}
                      lang={lang}
                    />
                  </TableCell>
                  <TableCell width={DAINIK_COL_TRANSIT}>
                    {(transitsByBsDay[d.day]?.length ?? 0) > 0 ? (
                      transitsByBsDay[d.day]!.map((ev, i) => (
                        <Text key={i} className={dainikKrantiClasses.transitRow} style={nepaliTextStyle()}>
                          {pick(ev.labelNe, ev.labelEn)} {pick(ev.planetNe, ev.planetEn)}
                          {ev.time ? ` ${digits(ev.time)}` : ""}
                        </Text>
                      ))
                    ) : (
                      <Text className={dainikKrantiClasses.cellText} style={nepaliTextStyle()}>—</Text>
                    )}
                  </TableCell>
                  <TableCell width={DAINIK_FESTIVAL_COL_W}>
                    <Text numberOfLines={2} className={hasFestival ? dainikKrantiClasses.festivalText : dainikKrantiClasses.cellText} style={nepaliTextStyle()}>
                      {hasFestival ? d.festivals.join(" · ") : "—"}
                    </Text>
                  </TableCell>
                </TableRow>
                {isExpanded ? (
                  <View className={cn("border-b border-border px-4 py-2", dainikKrantiClasses.expandRow)}>
                    <DayPatroExpandPanel
                      lagna={lagnaByDate[d.date_ad]}
                      graha={grahaByDate[d.date_ad]}
                      notes={notesByDate[d.date_ad]}
                    />
                  </View>
                ) : null}
              </Fragment>
            );
          })
        )}
      </View>
    </TableScrollShell>
  );
}
