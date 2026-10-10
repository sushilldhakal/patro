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
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  getCurrentBs,
  shiftBsMonth,
  todayAdString,
} from "@/lib/bs-calendar";
import { buildGapanshaLine, buildPapanshaDisplayLine } from "@/lib/dainikKranti/gapansha";
import { ingressEventBsDayForMonth } from "@/lib/dainikKranti/ingress-day-match";
import { grahaRashiNe, formatGocharBsLabel } from "@/lib/dainikKranti/gochar-display";
import { buildRashyadiRangeTables } from "@/lib/dainikKranti/rashyadi-segments";
import {
  buildCalcNotes,
  buildGrahaSpashtaMatrix,
  buildLagnaMatrix,
} from "@/lib/dainikKranti/month-patro-tables";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { formatBsDateKey, parseCivilIso } from "@/lib/patro-day";
import { formatTimeShort, formatVedicPatroTime } from "@/lib/panchanga-format";
import { resolveRashiDisplay } from "@/lib/rashi-i18n";
import { patroStickyHeadCell } from "@/lib/patro-classes";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { cn } from "@/lib/utils";
import { fetchMonthCalendarOffline } from "@/lib/offline/offline-month";

type Phase = "krishna" | "shukla";

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

const LUNAR_MONTH_NE: Record<string, string> = {
  baisakh: "वैशाख", baishakh: "वैशाख", vaisakha: "वैशाख", vaishakha: "वैशाख",
  jestha: "ज्येष्ठ", jyeshtha: "ज्येष्ठ", jyestha: "ज्येष्ठ",
  ashadh: "आषाढ", ashadha: "आषाढ", asar: "आषाढ",
  shrawan: "श्रावण", shrawn: "श्रावण", shravan: "श्रावण", shravana: "श्रावण",
  bhadra: "भाद्रपद", bhadau: "भाद्रपद", bhadrapada: "भाद्रपद",
  ashwin: "आश्विन", ashwina: "आश्विन", aswin: "आश्विन",
  kartik: "कार्तिक", kartika: "कार्तिक",
  mangsir: "मार्गशीर्ष", margashir: "मार्गशीर्ष", margashirsha: "मार्गशीर्ष", margasirsa: "मार्गशीर्ष",
  poush: "पौष", paush: "पौष", pausha: "पौष", push: "पौष",
  magh: "माघ", magha: "माघ",
  falgun: "फाल्गुन", phalgun: "फाल्गुन", phalguna: "फाल्गुन",
  chaitra: "चैत्र", chait: "चैत्र", chaitya: "चैत्र",
};

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


function phaseOf(day: CalendarDay): Phase | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}

function defaultMobilePaksha(days: CalendarDay[], todayAd: string): Phase {
  const today = days.find((d) => d.date_ad === todayAd);
  const phase = today ? phaseOf(today) : undefined;
  return phase === "krishna" || phase === "shukla" ? phase : "shukla";
}

function pakshaShort(day: CalendarDay, isEn = false): string {
  const p = phaseOf(day);
  if (isEn) return p === "shukla" ? "Shukla" : p === "krishna" ? "Krishna" : "";
  return p === "shukla" ? "शुक्ल" : p === "krishna" ? "कृष्ण" : "";
}

function lunarMonthNe(en?: string, isEn = false): string | undefined {
  if (!en) return undefined;
  if (isEn) return en.charAt(0).toUpperCase() + en.slice(1);
  const key = en.toLowerCase().replace(/[^a-z]/g, "");
  return LUNAR_MONTH_NE[key] ?? en;
}

type PakshaSegment = { key: string; label: string };

function pakshaSegmentOf(day: CalendarDay, adhikMonthEn?: string, isEn = false): PakshaSegment {
  const lc = day.panchanga?.lunar_calendar;
  const layer = lc?.purnimant ?? lc?.amanta ?? day.panchanga?.lunar_month;
  const lunarEn = layer?.name;
  const lunar = lunarMonthNe(lunarEn, isEn) ?? lunarEn ?? "";
  const isAdhik = layer?.is_adhik === true || layer?.type === "adhik";
  const adhikName = lc?.adhik_maas?.name ?? adhikMonthEn;
  const isShuddha =
    !isAdhik &&
    Boolean(adhikName) &&
    Boolean(lunarEn) &&
    lunarEn!.toLowerCase() === adhikName!.toLowerCase();
  const prefix = isAdhik ? (isEn ? "Adhik " : "अधिक ") : isShuddha ? (isEn ? "Shuddha " : "शुद्ध ") : "";
  const phase = phaseOf(day);
  const phaseLabel = isEn
    ? phase === "shukla" ? "Shukla" : phase === "krishna" ? "Krishna" : ""
    : phase === "shukla" ? "शुक्ल" : phase === "krishna" ? "कृष्ण" : "";
  const pakshaWord = isEn ? (phaseLabel ? " Paksha" : "") : "पक्ष";
  return {
    key: `${prefix}${lunar}|${phase ?? ""}`,
    label: `${prefix}${lunar} ${phaseLabel}${pakshaWord}`.trim(),
  };
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

function dowOf(dateAd: string): number {
  const d = new Date(`${dateAd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
}

function embedRashi(labelNe: string, rashiNe?: string): string {
  if (!rashiNe) return labelNe;
  const out = labelNe.replace(/\s*मा\s*$/u, ` ${rashiNe}मा`);
  return out === labelNe ? `${labelNe} ${rashiNe}` : out;
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

function weekdayLabel(day: CalendarDay, isEn: boolean): string {
  if (isEn) return day.weekday_en ?? day.weekday ?? day.weekday_ne ?? "—";
  return day.weekday_ne ?? day.weekday ?? "—";
}

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
    <View className="min-w-0">
      <Text className="text-body font-num whitespace-nowrap text-foreground">{times}</Text>
      <Text className={subLineClass}>{sign}</Text>
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
      <Text>{label}</Text>
      {end ? <Text className={subLineClass}>{pick(`${end} सम्म`, `until ${end}`)}</Text> : null}
    </View>
  );
}

export default function DainikKrantiScreen() {
  const { pick, digits, lang, isEnglish } = useLocale();
  const { isCompact, isTablet } = useBreakpoint();
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
    <AppShell title={pick("दैनिक क्रान्ति", "Daily transits")} showHeader={false}>
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

      <View className="mb-4 gap-1">
        <View className="flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
          <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(18)}>
            {monthLabel} · {pakshaLabel}
          </Text>
          {monthQ.data?.year_bs ? (
            <Text className="text-body text-muted-foreground">
              {digits(monthQ.data.year_bs)} {pick("बि.सं.", "BS")}
            </Text>
          ) : null}
          {ritu ? (
            <Text className="text-body text-muted-foreground">
              · {pick("ऋतु", "Ritu")}: {ritu}
            </Text>
          ) : null}
          {allDays.length ? (
            <Text className="text-caption text-muted-foreground">
              · {digits(days.length)} {pick("दिन", "days")}
            </Text>
          ) : null}
        </View>
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick(
            "पक्ष अनुसार दैनिक पञ्चाङ्ग — तिथि, नक्षत्र, योग, करण, सूर्योदय/अस्त, पर्व र ग्रह गोचर।",
            "Daily panchanga by paksha — tithi, nakshatra, yoga, karana, sunrise/sunset, festivals and planetary transits.",
          )}
        </Text>
      </View>

      {monthHasAdhik && adhik?.month_name ? (
        <View className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <Text className="text-body leading-relaxed text-amber-700 dark:text-amber-300" style={nepaliTextStyle(14)}>
            <Text className="font-semibold">{pick("अधिक मास:", "Adhik Maas:")}</Text>
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
        <View className="gap-8">
          {isCompact ? (
            <View className="gap-3">
              {monthQ.isError ? (
                <View className="rounded-xl border border-border py-8">
                  <Text className="text-body text-center text-muted-foreground">
                    {pick("विवरण ल्याउन सकिएन। पुनः प्रयास गर्नुहोस्।", "Could not load details. Please try again.")}
                  </Text>
                </View>
              ) : days.length === 0 ? (
                <View className="rounded-xl border border-border py-8">
                  <Text className="text-body text-center text-muted-foreground">
                    {pick("यो पक्षमा कुनै दिन भेटिएन।", "No days found in this paksha.")}
                  </Text>
                </View>
              ) : (
                days.map((d, dayIndex) => {
                  const segLabel = headerByDate[d.date_ad];
                  return (
                    <Fragment key={d.date_ad}>
                      {segLabel ? (
                        <Text className="text-body px-0.5 pt-2 font-bold text-secondary" style={nepaliTextStyle(14)}>
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
              title={pick("दैनिक लग्न आरम्भ समयतालिका (पूरा महिना)", "Daily lagna start timetable (full month)")}
            >
              <Text className="text-body mb-3 leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
                {pick(
                  "प्रत्येक गते सूर्योदयदेखि अर्को सूर्योदयसम्म कुन राशि कहिले लग्नमा आउँछ।",
                  "For each day, which rashi rises as the lagna and when, from sunrise to the next sunrise.",
                )}
              </Text>
              <View className="overflow-hidden rounded-lg border border-border">
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
              title={pick("उदयकालिक सूर्यादिग्रहस्पष्ट (पूरा महिना)", "Planetary positions at sunrise (full month)")}
            >
              <Text className="text-body mb-3 leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
                {pick(
                  "सूर्योदयको क्षणमा ग्रहहरूको राश्यादि स्थिति र दैनिक बेलान्तर।",
                  "The planets' rashi positions at the moment of sunrise, and the daily time-difference.",
                )}
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
              title={pick("गणना सूचना र विशेष दिनहरू", "Calculation notes & special days")}
            >
              <MonthCalcNotes embedded notes={calcNotes} loading={monthQ.isLoading || ingressQ.isLoading} />
            </PatroAccordionItem>
          </PatroAccordion>

          {refDay ? (
            <View className="flex-row gap-3">
              <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border p-3">
                <SunriseSunsetIcon variant="rise" size={20} color="#f59e0b" />
                <View>
                  <Text className="text-body text-muted-foreground">{pick("सूर्योदय", "Sunrise")}</Text>
                  <Text className="font-num font-semibold text-foreground">
                    {refDay.sunrise ? digits(formatTimeShort(refDay.sunrise) ?? refDay.sunrise) : "—"}
                  </Text>
                </View>
              </View>
              <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-border p-3">
                <SunriseSunsetIcon variant="set" size={20} color="#6366f1" />
                <View>
                  <Text className="text-body text-muted-foreground">{pick("सूर्यास्त", "Sunset")}</Text>
                  <Text className="font-num font-semibold text-foreground">
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

          <View className="rounded-xl border border-border p-4">
            <Text className="text-body mb-2 font-semibold text-foreground">
              {pick("ग्रह गोचर र अर्को सङ्क्रान्ति", "Planetary transits & next sankranti")}
            </Text>
            {grahas.length === 0 ? (
              <Text className="text-body text-muted-foreground">
                {gocharQ.isLoading ? pick("लोड हुँदैछ…", "Loading…") : pick("विवरण उपलब्ध छैन।", "No details available.")}
              </Text>
            ) : (
              <View className="gap-1.5">
                {grahas.map((g) => (
                  <View key={g.key} className="flex-row items-baseline justify-between gap-2">
                    <Text className="text-body flex-1 text-foreground" style={nepaliTextStyle(14)}>
                      {pick(g.name_ne, grahaTableEn(g.key, g.name_vedic ?? g.name_ne))}{" "}
                      {pick(grahaRashiNe(g) ?? "", g.rashi ?? grahaRashiNe(g) ?? "")}
                    </Text>
                    {g.next_pada_entry ? (
                      <Text className="text-body shrink-0 text-right text-muted-foreground">
                        {pick(g.next_pada_entry.label_ne ?? "", g.next_pada_entry.to_rashi ?? g.next_pada_entry.label_ne ?? "")}
                        {"\n"}
                        {digits(g.next_pada_entry.entry_time_local_short ?? g.next_pada_entry.entry_time_local ?? "")}
                      </Text>
                    ) : g.next_rashi_entry ? (
                      <Text className="text-body shrink-0 text-right text-muted-foreground">
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

          <View className="rounded-xl border border-border bg-muted/30 p-4">
            <Text className="text-body mb-2 font-semibold text-foreground">
              {pakshaLabel} {pick("कर्तव्य", "duties")}
            </Text>
            <View className="gap-2">
              {effectivePaksha === "all" ? (
                <>
                  <Text className="text-body leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
                    {pick(KARTAVYA.krishna.ne, KARTAVYA.krishna.en)}
                  </Text>
                  <Text className="text-body leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
                    {pick(KARTAVYA.shukla.ne, KARTAVYA.shukla.en)}
                  </Text>
                </>
              ) : (
                <Text className="text-body leading-relaxed text-foreground" style={nepaliTextStyle(14)}>
                  {pick(KARTAVYA[effectivePaksha].ne, KARTAVYA[effectivePaksha].en)}
                </Text>
              )}
            </View>
          </View>

          <View className="rounded-xl border border-border">
            <View className="flex-row flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
              <Text className="text-body font-semibold text-foreground">
                ✦ {pick("ग्रह स्पष्ट, उदयास्त र गोचर सङ्केत", "Planet positions, rise-set & transit legend")}
              </Text>
              {gocharQ.data?.date_ad ? (
                <Text className="text-body ml-auto text-muted-foreground">
                  {pick(
                    `${formatGocharBsLabel(gocharQ.data.date_bs, gocharQ.data.date_ad) ?? fmtAd(gocharQ.data.date_ad, false)} को स्थिति`,
                    `Position on ${formatGocharBsLabel(gocharQ.data.date_bs, gocharQ.data.date_ad) ?? fmtAd(gocharQ.data.date_ad, true)}`,
                  )}
                </Text>
              ) : null}
            </View>

            <View className="gap-6 p-4">
              <View>
                <Text className="text-body mb-2 font-semibold uppercase tracking-wide text-foreground">
                  {pick("ग्रह स्पष्ट (अंश° कला′ विकला″)", "Planet positions (deg° kala′ vikala″)")}
                </Text>
                {grahas.length === 0 ? (
                  <Text className="text-body text-muted-foreground">
                    {gocharQ.isLoading ? pick("लोड हुँदैछ…", "Loading…") : pick("विवरण उपलब्ध छैन।", "No details available.")}
                  </Text>
                ) : (
                  <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
                    {grahas.map((g) => {
                      const m = motionNe(g);
                      return (
                        <View key={g.key} className="min-w-[45%] flex-row flex-wrap items-baseline gap-1.5">
                          <Text className="text-body text-foreground" style={nepaliTextStyle(14)}>
                            {pick(g.name_ne, grahaTableEn(g.key, g.name_vedic ?? g.name_ne))}
                          </Text>
                          <Text className="text-body">{pick(grahaRashiNe(g) ?? "", g.rashi ?? grahaRashiNe(g) ?? "")}</Text>
                          {g.dms_in_rashi ? (
                            <Text className="text-body font-num text-foreground">{digits(g.dms_in_rashi)}</Text>
                          ) : null}
                          <View
                            className={cn(
                              "rounded px-1.5",
                              m.vakri ? "bg-rose-500/15" : "bg-emerald-500/15",
                            )}
                          >
                            <Text
                              className={cn(
                                "text-caption",
                                m.vakri ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300",
                              )}
                            >
                              {pick(m.label, m.labelEn)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                <Text className="text-body mt-2 leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
                  {pick(
                    "प्रत्येक पक्षको आरम्भमा ग्रहहरूको स्पष्ट स्थान अंश°, कला′, विकला″ (र प्रति-विकला) मा दिइन्छ। वक्री = उल्टो गति, मार्गी = सुल्टो गति।",
                    "At the start of each paksha, each planet's exact position is given in degrees°, kala′, vikala″ (and prati-vikala). Vakri = retrograde, Margi = direct.",
                  )}
                </Text>
              </View>

              <View className="gap-6 md:flex-row">
                <View className="flex-1">
                  <Text className="text-body mb-2 font-semibold uppercase tracking-wide text-foreground">
                    {pick("ग्रह उदयास्त सङ्केत", "Planet rise-set symbols")}
                  </Text>
                  <View className="gap-1.5">
                    {UDAYAST_LEGEND.map((it) => (
                      <View key={it.code} className="flex-row gap-2">
                        <View className="w-24 shrink-0 rounded bg-muted px-1.5 py-0.5">
                          <Text className="text-caption font-semibold text-secondary">{it.code}</Text>
                        </View>
                        <Text className="text-body flex-1 text-foreground" style={nepaliTextStyle(14)}>
                          {pick(it.full, it.fullEn)} — {pick(it.meaning, it.meaningEn)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-body mb-2 font-semibold uppercase tracking-wide text-foreground">
                    {pick("गोचर / पापशान्ति घर-सङ्केत", "Transit / Papashanti house symbols")}
                  </Text>
                  <View className="gap-1.5">
                    {GOCHAR_LEGEND.map((it) => (
                      <View key={it.code} className="flex-row gap-2">
                        <View className="w-20 shrink-0 rounded bg-muted px-1.5 py-0.5">
                          <Text className="text-caption font-semibold text-secondary">{it.code}</Text>
                        </View>
                        <Text className="text-body flex-1 text-foreground" style={nepaliTextStyle(14)}>
                          {pick(it.meaning, it.meaningEn)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Text className="text-body mt-3 leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
                    {pick(
                      "दशा कोष्ठक: जन्म-समयमा बाँकी विंशोत्तरी दशाको वर्ष/महिना/दिन। समय सुधार: मुद्रणमा “उ” वा “०” जस्ता सङ्केतले शून्य अंश/कला जनाउँछ।",
                      "Dasha bracket: Vimshottari dasha remaining at birth. Time correction: symbols like “u” or “0” indicate zero degrees/kala.",
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
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
  const th = "text-body font-semibold text-foreground";
  const thWrap = "text-body font-semibold text-foreground";
  const subLine = "text-caption text-muted-foreground";

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
            <Text className="text-body text-center text-muted-foreground">
              {pick("विवरण ल्याउन सकिएन।", "Could not load details.")}
            </Text>
          </View>
        ) : days.length === 0 ? (
          <View className="py-8">
            <Text className="text-body text-center text-muted-foreground">
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
                  <View className="border-b border-border bg-muted/70 px-3 py-2.5">
                    <Text className="text-body font-bold text-secondary" style={nepaliTextStyle(14)}>
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
                  <TableCell width={DAINIK_COL_GATE} className={cn(isSaturday && "text-rose-600")}>
                    <View className="flex-row items-center gap-1.5">
                      {isToday ? (
                        <View className="h-1.5 w-1.5 rounded-full bg-secondary" accessibilityElementsHidden />
                      ) : null}
                      <Text className={cn("text-body font-num font-bold", (isSaturday || hasFestival) && "text-rose-600")}>
                        {digits(d.day)}{" "}
                        <Text className="text-caption font-normal text-muted-foreground">{digits(fmtAd(d.date_ad, isEn))}</Text>
                      </Text>
                    </View>
                    <Text className={cn(subLine, isSaturday && "text-rose-600")}>
                      {weekdayLabel(d, isEn)}
                    </Text>
                  </TableCell>
                  <TableCell width={DAINIK_COL_TITHI}>
                    <Text>
                      {pakshaShort(d, isEn)} {pick(d.tithi_ne ?? d.tithi, d.tithi ?? d.tithi_ne) ?? "—"}
                    </Text>
                    {tithiEnd ? <Text className={subLine}>{pick(`${tithiEnd} सम्म`, `until ${tithiEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_COL_NAK}>
                    <Text>{pick(d.nakshatra_ne ?? d.nakshatra ?? "—", d.nakshatra ?? d.nakshatra_ne ?? "—")}</Text>
                    {nakEnd ? <Text className={subLine}>{pick(`${nakEnd} सम्म`, `until ${nakEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_COL_YOGA}>
                    <Text>{pick(d.yoga_ne ?? d.yoga ?? "—", d.yoga ?? d.yoga_ne ?? "—")}</Text>
                    {yogaEnd ? <Text className={subLine}>{pick(`${yogaEnd} सम्म`, `until ${yogaEnd}`)}</Text> : null}
                  </TableCell>
                  <TableCell width={DAINIK_COL_KARANA}>
                    <Text>{pick(d.karana_ne ?? d.karana ?? "—", d.karana ?? d.karana_ne ?? "—")}</Text>
                    {karanaEnd ? <Text className={subLine}>{pick(`${karanaEnd} सम्म`, `until ${karanaEnd}`)}</Text> : null}
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
                        <Text key={i} className="text-body">
                          {pick(ev.labelNe, ev.labelEn)} {pick(ev.planetNe, ev.planetEn)}
                          {ev.time ? ` ${digits(ev.time)}` : ""}
                        </Text>
                      ))
                    ) : (
                      <Text>—</Text>
                    )}
                  </TableCell>
                  <TableCell width={DAINIK_FESTIVAL_COL_W}>
                    <Text className={hasFestival ? "text-body text-rose-600" : undefined}>
                      {hasFestival ? d.festivals.join(" · ") : "—"}
                    </Text>
                  </TableCell>
                </TableRow>
                {isExpanded ? (
                  <View className="border-b border-border bg-muted/25 px-4 py-2">
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
