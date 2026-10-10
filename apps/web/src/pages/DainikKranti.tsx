import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Sunrise,
  Sunset,
} from "lucide-react";
import {
  fetchMonthCalendar,
  fetchGochar,
  fetchGocharIngress,
  fetchSpecialMonths,
  gocharKeys,
  specialMonthsKeys,
  type CalendarDay,
  type CalendarDayAnga,
  type PanchangaDay,
} from "@/lib/api";
import { getLanguageForEra } from "@/lib/era";
import { formatBsDateKey } from "@/lib/patro-day";
import { formatTimeShort, formatVedicPatroTime, getRituDisplay } from "@/lib/panchanga-format";
import {
  getRashiName,
  resolveRashiDisplay,
} from "@/lib/rashi-i18n";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "@/components/PageShell";
import { usePatroMonthUrlBrowse } from "@/hooks/use-patro-url-browse";
import { PatroMonthYearNav } from "@/components/patro-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import {
  searchToLocation,
} from "@/lib/url-state";
import {
  patroSegBtn,
  patroStickyHeadCell,
  patroStickyHeadRow,
} from "@/lib/patro-classes";
import { cn } from "@/lib/utils";
import { useLocale, bilingualText, bilingualNode } from "@/i18n/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DayPatroExpandPanel } from "@/components/dainikKranti/DayPatroExpandPanel";
import { GocharKundaliChart } from "@/components/dainikKranti/GocharKundaliChart";
import { GocharRashyadiTable } from "@/components/dainikKranti/GocharRashyadiTables";
import { buildRashyadiRangeTables } from "@/lib/dainikKranti/rashyadi-segments";
import { buildGapanshaLine, buildPapanshaDisplayLine } from "@/lib/dainikKranti/gapansha";
import { ingressEventBsDayForMonth } from "@/lib/dainikKranti/ingress-day-match";
import { grahaRashiNe, formatGocharBsLabel } from "@/lib/dainikKranti/gochar-display";
import { MonthLagnaMatrix } from "@/components/dainikKranti/MonthLagnaMatrix";
import { MonthGrahaSpashta } from "@/components/dainikKranti/MonthGrahaSpashta";
import { MonthCalcNotes } from "@/components/dainikKranti/MonthCalcNotes";
import {
  DainikKrantiMobileLoading,
  DainikKrantiTableLoading,
} from "@/components/dainikKranti/DainikKrantiDayListLoading";
import {
  buildCalcNotes,
  buildGrahaSpashtaMatrix,
  buildLagnaMatrix,
  type CalcNote,
  type GrahaSpashtaRow,
  type LagnaMatrixRow,
} from "@/lib/dainikKranti/month-patro-tables";

const COL_SPAN = 10;

const routeApi = getRouteApi("/panchanga-shell/dainikkranti");

type Phase = "krishna" | "shukla";
type PakshaFilter = Phase | "all";

const MOBILE_PAKSHA_MQ = "(max-width: 767px)";

function useMobilePakshaLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_PAKSHA_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_PAKSHA_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMobile;
}

function defaultMobilePaksha(days: CalendarDay[], todayAd: string): Phase {
  const today = days.find((d) => d.date_ad === todayAd);
  const phase = today ? phaseOf(today) : undefined;
  return phase === "krishna" || phase === "shukla" ? phase : "shukla";
}

function PakshaSegToggle({
  value,
  onChange,
  options,
  className,
  buttonClassName,
}: {
  value: PakshaFilter;
  onChange: (v: PakshaFilter) => void;
  options: readonly (readonly [PakshaFilter, string])[];
  className?: string;
  buttonClassName?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "inline-flex shrink-0 gap-0.5 rounded-lg border border-border bg-card p-0.5",
        className,
      )}
      role="radiogroup"
      aria-label={t("calendar.paksha_aria")}
    >
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          role="radio"
          aria-checked={value === optionValue}
          className={cn(patroSegBtn(value === optionValue), buttonClassName)}
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** 27 nakshatras in canonical order, matching the gochar API spellings. */
const NAKSHATRA_EN = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

/** Rāśi (Nepali) containing a given nakshatra·pada — 9 padas span each rāśi. */
function rashiNeFromNakPada(nakshatraEn?: string, pada?: number): string | undefined {
  if (!nakshatraEn || !pada) return undefined;
  const ni = NAKSHATRA_EN.findIndex((n) => n.toLowerCase() === nakshatraEn.toLowerCase());
  if (ni < 0) return undefined;
  const absPada = ni * 4 + (pada - 1); // 0..107
  return getRashiName(Math.floor(absPada / 9) + 1, "ne");
}

/** Insert the rāśi before the trailing "मा" — "कृत्तिका १ मा" → "कृत्तिका १ वृषमा". */
function embedRashi(labelNe: string, rashiNe?: string): string {
  if (!rashiNe) return labelNe;
  const out = labelNe.replace(/\s*मा\s*$/u, ` ${rashiNe}मा`);
  return out === labelNe ? `${labelNe} ${rashiNe}` : out;
}

/** Patro-style graha names (table column). */
const GRAHA_TABLE_NE: Record<string, string> = {
  sun: "सूर्य",
  moon: "चन्द्र",
  mars: "मंगल",
  mercury: "बुध",
  jupiter: "गुरु",
  venus: "शुक्र",
  saturn: "शनि",
  rahu: "राहु",
  ketu: "केतु",
};

function grahaTableNe(key: string, fallback?: string): string {
  return GRAHA_TABLE_NE[key] ?? fallback ?? key;
}

const GRAHA_TABLE_EN: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu",
};

function grahaTableEn(key: string, fallback?: string): string {
  return GRAHA_TABLE_EN[key.toLowerCase()] ?? fallback ?? key;
}

type TransitEvent = {
  planetNe: string;
  planetEn: string;
  labelNe: string;
  labelEn: string;
  time?: string;
  sortKey: string;
};

function phaseOf(day: CalendarDay): Phase | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}

function pakshaShort(day: CalendarDay, isEn = false): string {
  const p = phaseOf(day);
  if (isEn) return p === "shukla" ? "Shukla" : p === "krishna" ? "Krishna" : "";
  return p === "shukla" ? "शुक्ल" : p === "krishna" ? "कृष्ण" : "";
}

/** Lunar (chāndra) month names in Sanskrit-Nepali, keyed by the API's English name. */
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

function lunarMonthNe(en?: string, isEn = false): string | undefined {
  if (!en) return undefined;
  if (isEn) return en.charAt(0).toUpperCase() + en.slice(1);
  const key = en.toLowerCase().replace(/[^a-z]/g, "");
  return LUNAR_MONTH_NE[key] ?? en;
}

type PakshaSegment = { key: string; label: string };

/**
 * Lunar-paksha label for a day, e.g. "अधिक ज्येष्ठ शुक्लपक्ष" / "शुद्ध ज्येष्ठ कृष्णपक्ष".
 * Prefers the pūrṇimānta layer (`lunar_calendar.purnimant`) — the reckoning Nepali
 * patro uses — and falls back to amānta or the flat `lunar_month`.
 */
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

function fmtAd(dateAd: string, isEn: boolean): string {
  const d = new Date(`${dateAd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateAd;
  return d.toLocaleDateString(isEn ? "en-US" : "ne-NP", { day: "numeric", month: "short" });
}

/** BS gate large; AD month/day smaller underneath in Nepali. English AD browse: "Jul 1". */
function DayLabel({
  day,
  isEn,
  dg,
  adBrowse = false,
  accentClass,
}: {
  day: CalendarDay;
  isEn: boolean;
  dg: (v: string | number) => string;
  adBrowse?: boolean;
  accentClass?: string;
}) {
  const d = new Date(`${day.date_ad}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return (
      <span className={cn("font-num text-base font-bold tabular-nums", accentClass)}>
        {dg(day.day)}
      </span>
    );
  }
  const adDay = d.getDate();

  if (isEn && adBrowse) {
    return (
      <span className={cn("font-num text-sm font-semibold tabular-nums", accentClass)}>
        {dg(adDay)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className={cn("font-num text-base font-bold tabular-nums leading-none", accentClass)}>
        {dg(day.day)}
      </span>
      <span className="font-num text-xs tabular-nums font-normal text-muted-foreground">
        {dg(adDay)}
      </span>
    </span>
  );
}

function weekdayLabel(day: CalendarDay, isEn: boolean): string {
  if (isEn) return day.weekday_en ?? day.weekday ?? day.weekday_ne ?? "—";
  return day.weekday_ne ?? day.weekday ?? "—";
}

function sunRiseSetSignParts(
  day: CalendarDay,
  sunRashi: string | undefined,
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
}: {
  day: CalendarDay;
  sunRashi: string | undefined;
  ayanaMark: string | undefined;
  dg: (v: string | number) => string;
}) {
  const { times, sign } = sunRiseSetSignParts(day, sunRashi, ayanaMark, dg);
  return (
    <div className="min-w-0 font-mono tabular-nums leading-snug">
      <div className="whitespace-nowrap text-sm">{times}</div>
      <div className={cn(subLine, "break-words")}>{sign}</div>
    </div>
  );
}

/** Day-of-week index from an AD date string (0 = Sunday … 6 = Saturday). */
function dowOf(dateAd: string): number {
  const d = new Date(`${dateAd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
}

/** Local today as a "YYYY-MM-DD" key for highlighting. */
function todayKey(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/**
 * End-time label for a panchanga aṅga. The calendar endpoint returns `end`
 * as a full datetime ("2026-06-20 16:02"); we surface the clock part in
 * Nepali digits — e.g. "१६:०२ बजे".
 */
function angaEnd(anga: CalendarDayAnga | undefined, d: (v: string | number) => string, isEn: boolean): string | null {
  const t = formatTimeShort(anga?.end);
  if (!t) return null;
  return isEn ? d(t) : `${d(t)} बजे`;
}

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

const th = "whitespace-nowrap text-sm font-semibold align-middle";
const thWrap = "h-auto min-h-10 whitespace-normal py-2 text-sm font-semibold align-middle leading-tight";
const subLine = "text-xs leading-tight";
const sunColW = "w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem] whitespace-normal";
const moonColW = "w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] whitespace-normal break-words leading-snug";
/** Festival column — wide enough for two wrapped lines of names. */
const festivalColW = "min-w-[17rem] w-[19.5rem] max-w-[19.5rem] whitespace-normal";

function moonRashiLabel(
  day: CalendarDay,
  det: CalendarDay["panchanga"],
  lang: string,
): string {
  const span = det?.chandra_rashi_spans?.[0];
  if (span) {
    return resolveRashiDisplay(span.name_ne, span.name, lang) ?? "—";
  }
  return (
    resolveRashiDisplay(
      det?.chandra_rashi_ne ?? day.chandra_rashi_ne,
      det?.chandra_rashi ?? day.chandra_rashi,
      lang,
    ) ?? "—"
  );
}

/** End time when the Moon changes rashi before the next sunrise. */
function moonRashiEnd(
  det: CalendarDay["panchanga"],
  d: (v: string | number) => string,
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
  return isEn ? d(t) : `${d(t)} बजे`;
}

function MoonRashiValue({
  day,
  det,
  lang,
  dg,
  isEn,
}: {
  day: CalendarDay;
  det: CalendarDay["panchanga"];
  lang: string;
  dg: (v: string | number) => string;
  isEn: boolean;
}) {
    const label = moonRashiLabel(day, det, lang);
  const end = moonRashiEnd(det, dg, isEn);
  return (
    <>
      <div>{label}</div>
      {end ? <div className={subLine}>{bilingualText(lang, `${end} सम्म`, `until ${end}`)}</div> : null}
    </>
  );
}

/** ग्रह उदयास्त सङ्केत — heliacal rising/setting + motion abbreviations. */
const UDAYAST_LEGEND: { code: string; full: string; fullEn: string; meaning: string; meaningEn: string }[] = [
  { code: "व.उ.", full: "वक्र उदय", fullEn: "Retrograde rising", meaning: "ग्रह वक्र (उल्टो) अवस्थामा उदय भएको।", meaningEn: "The planet rises while retrograde (moving backward)." },
  { code: "बु.मा.उ.", full: "बुध मार्गी उदय", fullEn: "Mercury direct rising", meaning: "बुध मार्गी (सुल्टो) भएर उदय भएको।", meaningEn: "Mercury rises while direct (moving forward)." },
  { code: "वृ.व.उ.", full: "बृहस्पति वक्र उदय", fullEn: "Jupiter retrograde rising", meaning: "बृहस्पति (गुरु) वक्र अवस्थामा उदय भएको।", meaningEn: "Jupiter rises while retrograde." },
  { code: "शु.मा.उ.", full: "शुक्र मार्गी उदय", fullEn: "Venus direct rising", meaning: "शुक्र मार्गी भएर उदय भएको।", meaningEn: "Venus rises while direct." },
  { code: "श.मा.उ. ७अ.", full: "शनि मार्गी उदय, ७ अस्त", fullEn: "Saturn direct rising, sets on the 7th", meaning: "शनि मार्गी भएर उदय भएको र ७ गते अस्त हुने।", meaningEn: "Saturn rises while direct and sets on the 7th." },
];

/** गोचर / पापशान्ति घर-स्थिति सङ्केत. */
const GOCHAR_LEGEND: { code: string; meaning: string; meaningEn: string }[] = [
  { code: "पापाशाः", meaning: "पापशान्ति — कुण्डलीका अशुभ (पाप) ग्रहहरूको स्थिति।", meaningEn: "Papashanti — position of the malefic (papa) planets in the chart." },
  { code: "सू२", meaning: "सूर्य दोस्रो घर (भाव) मा रहेको।", meaningEn: "The Sun is in the second house (bhava)." },
  { code: "२७सू३", meaning: "२७ गते सूर्य तेस्रो घरमा प्रवेश गर्ने।", meaningEn: "The Sun enters the third house on the 27th." },
  { code: "म.१", meaning: "मंगल पहिलो घरमा रहेको।", meaningEn: "Mars is in the first house." },
  { code: "श.९", meaning: "शनि नवौँ घरमा रहेको।", meaningEn: "Saturn is in the ninth house." },
  { code: "रा.५ के.११", meaning: "राहु पाँचौँ र केतु एघारौँ घरमा रहेको।", meaningEn: "Rahu is in the fifth and Ketu in the eleventh house." },
];

/** Planet motion from the gochar `motion` / `is_retrograde` flags. */
function motionNe(g: { motion?: string; is_retrograde?: boolean }): { label: string; labelEn: string; vakri: boolean } {
  const vakri = g.is_retrograde === true || /vakr|retro/i.test(g.motion ?? "");
  return { label: vakri ? "वक्री" : "मार्गी", labelEn: vakri ? "Retrograde" : "Direct", vakri };
}

function CardField({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string | null;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-base">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
      {sub ? <div className="text-xs leading-tight text-base">{sub}</div> : null}
    </div>
  );
}

/**
 * Mobile (<md) card for one day — replaces the horizontally-scrolling table
 * row. The advanced लग्न / ग्रहस्पष्ट / notes data lives in a per-card
 * expandable so it's available without a wide table.
 */
function DayPatroCard({
  day,
  isToday,
  isExpanded,
  onToggle,
  transits,
  lagna,
  graha,
  notes,
  adBrowse = false,
}: {
  day: CalendarDay;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  transits: TransitEvent[] | undefined;
  lagna?: LagnaMatrixRow;
  graha?: GrahaSpashtaRow;
  notes?: CalcNote[];
  adBrowse?: boolean;
}) {
  const { t } = useTranslation();
  const { lang, digits: dg } = useLocale();
  const isEn = lang === "en";
  const det = day.panchanga;
  const tithiEnd = angaEnd(det?.tithi, dg, isEn);
  const nakEnd = angaEnd(det?.nakshatra, dg, isEn);
  const yogaEnd = angaEnd(det?.yoga, dg, isEn);
  const karanaEnd = angaEnd(det?.karana, dg, isEn);
  const sunRashi = resolveRashiDisplay(det?.surya_rashi_ne, det?.surya_rashi, lang);
  const isSaturday = dowOf(day.date_ad) === 6;
  const hasFestival = (day.festivals?.length ?? 0) > 0;
  const hasExtra = Boolean(lagna || graha || (notes?.length ?? 0) > 0);
  const dayColor =
    isSaturday || hasFestival ? "text-rose-600 dark:text-rose-400" : "text-foreground";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3.5 shadow-xs",
        isToday
          ? "border-secondary/60 bg-secondary/10"
          : hasFestival
          ? "border-rose-500/30 bg-rose-500/5"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <DayLabel day={day} isEn={isEn} dg={dg} adBrowse={adBrowse} accentClass={dayColor} />
          <span className={cn("text-xs text-base", isSaturday && "text-rose-600 dark:text-rose-400")}>
            {weekdayLabel(day, isEn)}
          </span>
        </div>
        {isToday ? (
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            {t("dainik.today")}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
        <CardField
          label={t("dainik.tithi")}
          value={
            <>
              <span>{pakshaShort(day, isEn)}</span> {bilingualText(lang, day.tithi_ne ?? day.tithi, day.tithi ?? day.tithi_ne) ?? "—"}
            </>
          }
          sub={tithiEnd ? bilingualText(lang, `${tithiEnd} सम्म`, `until ${tithiEnd}`) : null}
        />
        <CardField
          label={t("dainik.nakshatra")}
          value={bilingualText(lang, day.nakshatra_ne ?? day.nakshatra, day.nakshatra ?? day.nakshatra_ne) ?? "—"}
          sub={nakEnd ? bilingualText(lang, `${nakEnd} सम्म`, `until ${nakEnd}`) : null}
        />
        <CardField
          label={t("dainik.yoga")}
          value={bilingualText(lang, day.yoga_ne ?? day.yoga, day.yoga ?? day.yoga_ne) ?? "—"}
          sub={yogaEnd ? bilingualText(lang, `${yogaEnd} सम्म`, `until ${yogaEnd}`) : null}
        />
        <CardField
          label={t("dainik.karana")}
          value={bilingualText(lang, day.karana_ne ?? day.karana, day.karana ?? day.karana_ne) ?? "—"}
          sub={karanaEnd ? bilingualText(lang, `${karanaEnd} सम्म`, `until ${karanaEnd}`) : null}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg bg-muted/40 p-2.5">
        <div className="col-span-2">
          <CardField
            label={t("dainik.sun_rise_set_sign")}
            value={
              <SunRiseSetSignValue day={day} sunRashi={sunRashi} ayanaMark={det?.ayana_mark} dg={dg} />
            }
          />
        </div>
        <CardField
          label={t("dainik.moon_sign")}
          value={<MoonRashiValue day={day} det={det} lang={lang} dg={dg} isEn={isEn} />}
        />
      </div>

      {(transits?.length ?? 0) > 0 ? (
        <div className="mt-3">
          <div className="text-xs text-base">{t("dainik.transits_rise_set")}</div>
          <div className="mt-1 space-y-0.5">
            {transits!.map((ev, i) => (
              <div key={i} className="text-sm leading-tight">
                <span className="text-foreground">{bilingualText(lang, ev.labelNe, ev.labelEn)}</span>{" "}
                <span className="text-secondary">{bilingualText(lang, ev.planetNe, ev.planetEn)}</span>
                {ev.time ? <span> {dg(ev.time)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasFestival ? (
        <div className="mt-3 rounded-lg bg-rose-500/5 px-2.5 py-2">
          <div className="text-xs text-base">{t("dainik.festival")}</div>
          <div className="line-clamp-2 text-sm leading-snug text-rose-600 dark:text-rose-300">{day.festivals.join(" · ")}</div>
        </div>
      ) : null}

      {hasExtra ? (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background/60 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-muted"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            {isExpanded
              ? t("dainik.hide_details")
              : t("dainik.lagna_planets_more")}
          </button>
          {isExpanded ? (
            <div className="mt-1 border-t border-border">
              <DayPatroExpandPanel lagna={lagna} graha={graha} notes={notes} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function DainikKranti() {
  const { t } = useTranslation();
  const { lang, digits: dg } = useLocale();
  const isEn = lang === "en";
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  // Seed from the URL so a shared link opens on its month/paksha/location.
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const isMobilePaksha = useMobilePakshaLayout();
  const [paksha, setPaksha] = useState<PakshaFilter>(() => search.paksha ?? "all");
  const browseMirror = useMemo(
    () => (paksha === "all" ? undefined : { paksha }),
    [paksha],
  );
  const monthBrowse = usePatroMonthUrlBrowse(search, navigate, location, setLocation, {
    mirror: browseMirror,
  });
  const adBrowse = getLanguageForEra(monthBrowse.era) === "en";
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const expandResetKey = `${monthBrowse.era}|${monthBrowse.year}|${monthBrowse.month}|${paksha}|${location.params.lat}|${location.params.lon}`;
  const [trackedExpandKey, setTrackedExpandKey] = useState(expandResetKey);
  if (expandResetKey !== trackedExpandKey) {
    setTrackedExpandKey(expandResetKey);
    setExpandedDays(new Set());
  }
  const nowKey = useMemo(() => todayKey(), []);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Back/forward only — do not depend on local `paksha` or we revert clicks before URL updates.
  useEffect(() => {
    const urlPaksha = search.paksha ?? "all";
    setPaksha((current) => (current === urlPaksha ? current : urlPaksha));
  }, [search.paksha]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleDayExpand = (dateAd: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateAd)) next.delete(dateAd);
      else next.add(dateAd);
      return next;
    });
  };

  const stepMonth = (delta: number) => {
    monthBrowse.stepMonth(delta);
  };

  const monthQ = useQuery({
    queryKey: [
      "panchanga",
      "month",
      monthBrowse.era,
      monthBrowse.year,
      monthBrowse.month,
      location.params,
      "full",
    ] as const,
    queryFn: () =>
      fetchMonthCalendar(monthBrowse.year, monthBrowse.month, location.params, {
        era: monthBrowse.era,
      }),
    staleTime: 1000 * 60 * 30,
  });

  const allDays = useMemo(() => monthQ.data?.calendar ?? [], [monthQ.data]);

  const effectivePaksha = useMemo((): PakshaFilter => {
    if (!isMobilePaksha) return paksha;
    if (paksha === "krishna" || paksha === "shukla") return paksha;
    return defaultMobilePaksha(allDays, nowKey);
  }, [isMobilePaksha, paksha, allDays, nowKey]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Mobile never shows both pakshas at once — drop "all" for a Krishna/Shukla toggle.
  useEffect(() => {
    if (!isMobilePaksha || paksha !== "all" || allDays.length === 0) return;
    setPaksha(defaultMobilePaksha(allDays, nowKey));
  }, [isMobilePaksha, paksha, allDays, nowKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const days = useMemo(
    () =>
      effectivePaksha === "all"
        ? allDays
        : allDays.filter((d) => phaseOf(d) === effectivePaksha),
    [allDays, effectivePaksha],
  );

  // Adhik / kshaya maas info for the displayed year (drives शुद्ध vs अधिक labels).
  const specialQ = useQuery({
    queryKey: specialMonthsKeys.year(monthBrowse.year),
    queryFn: () => fetchSpecialMonths(monthBrowse.year),
    enabled: monthBrowse.era === "bs",
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

  // Lunar-paksha section header to render before the first day of each segment.
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

  // गोचर kundali + transit extraction are anchored to the month start so each
  // planet's `next_rashi_entry` covers the whole displayed month.
  const gocharApiEra: "bs" | "ad" = adBrowse ? "ad" : "bs";

  const gocharAnchor = useMemo(() => {
    if (!adBrowse) {
      return formatBsDateKey(monthBrowse.year, monthBrowse.month, 1);
    }
    return allDays[0]?.date_ad ?? null;
  }, [adBrowse, monthBrowse.year, monthBrowse.month, allDays]);

  const gocharEnd = useMemo(() => {
    if (!adBrowse) {
      const lastDay =
        allDays[allDays.length - 1]?.day ?? monthQ.data?.month_length ?? 30;
      return formatBsDateKey(monthBrowse.year, monthBrowse.month, lastDay);
    }
    return allDays[allDays.length - 1]?.date_ad ?? null;
  }, [adBrowse, monthBrowse.year, monthBrowse.month, allDays, monthQ.data?.month_length]);

  const gocharReady = Boolean(gocharAnchor && gocharEnd);

  const gocharQ = useQuery({
    queryKey: gocharKeys.dayLegacy(gocharAnchor ?? "", gocharApiEra, location.params),
    queryFn: () => fetchGochar(gocharAnchor!, gocharApiEra, location.params),
    enabled: gocharReady,
    staleTime: 1000 * 60 * 30,
  });

  const grahas = useMemo(
    () => Object.entries(gocharQ.data?.gochar ?? {}).map(([key, g]) => ({ key, ...g })),
    [gocharQ.data],
  );

  const ingressQ = useQuery({
    queryKey: gocharKeys.ingressEra(
      gocharAnchor ?? "",
      gocharEnd ?? "",
      "patro",
      gocharApiEra,
      location.params,
    ),
    queryFn: () =>
      fetchGocharIngress(gocharAnchor!, gocharEnd!, location.params, {
        level: "patro",
        era: gocharApiEra,
      }),
    enabled: gocharReady,
    staleTime: 1000 * 60 * 30,
  });

  // Per-day ग्रहचार / उदयास्त — keyed by BS गते (vedic sunrise day).
  const transitsByBsDay = useMemo(() => {
    const out: Record<number, TransitEvent[]> = {};
    const sunriseByDate = Object.fromEntries(allDays.map((d) => [d.date_ad, d.sunrise]));

    for (const ev of ingressQ.data?.events ?? []) {
      const bsDay = ingressEventBsDayForMonth(
        ev,
        monthBrowse.year,
        monthBrowse.month,
        allDays,
      );
      if (bsDay == null) continue;
      const rowDateAd = allDays.find((d) => d.day === bsDay)?.date_ad;
      if (!rowDateAd) continue;

      const planetNe = grahaTableNe(ev.graha, ev.graha_ne);
      const planetEn = grahaTableEn(ev.graha, ev.graha_ne);
      const isRashi = ev.level === "rashi";
      const isUdayast = ev.level === "udayast";
      const isMotion = ev.level === "motion";
      const baseLabel = isMotion
        ? (ev.label_ne ?? "")
        : isUdayast
        ? (ev.label_ne ?? "")
        : isRashi
        ? (ev.label_ne ?? `${ev.to_rashi_ne ?? ""}मा`)
        : (ev.label_ne ?? `${ev.to_nakshatra_ne ?? ""} ${ev.to_pada_ne ?? ""} मा`.trim());
      const rashiNe = isRashi
        ? ev.to_rashi_ne
        : rashiNeFromNakPada(ev.to_nakshatra, ev.to_pada);
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
    // `lang` looks unused here, but resolveRashiDisplay reads the active i18n
    // bundle. Without it these labels keep the language they were built under.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingressQ.data, allDays, lang, monthBrowse.year, monthBrowse.month]);

  const ingressBrowse = useMemo(
    () => ({ year: monthBrowse.year, month: monthBrowse.month }),
    [monthBrowse.year, monthBrowse.month],
  );

  const lagnaMatrix = useMemo(() => buildLagnaMatrix(days), [days]);
  const grahaMatrix = useMemo(() => buildGrahaSpashtaMatrix(days), [days]);
  const calcNotes = useMemo(
    () =>
      buildCalcNotes(
        days,
        ingressQ.data?.events ?? [],
        headerByDate,
        allDays,
        ingressBrowse,
      ),
    [days, ingressQ.data?.events, headerByDate, allDays, ingressBrowse],
  );
  const rashyadiRange = useMemo(
    () =>
      buildRashyadiRangeTables(
        days,
        allDays,
        ingressQ.data?.events ?? [],
        (d) => pakshaSegmentOf(d, adhikMonthEn, isEn),
        ingressBrowse,
      ),
    [days, allDays, ingressQ.data?.events, adhikMonthEn, isEn, ingressBrowse],
  );
  const papanshaLine = useMemo(() => {
    if (days.length === 0) return "";
    return buildPapanshaDisplayLine(days[0]!);
  }, [days]);
  const gapanshaLine = useMemo(() => {
    if (days.length === 0) return "";
    return buildGapanshaLine(days, allDays, ingressQ.data?.events ?? [], ingressBrowse);
  }, [days, allDays, ingressQ.data?.events, ingressBrowse]);
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
    return dp ? getRituDisplay(dp as PanchangaDay, lang) : undefined;
  }, [allDays, lang]);

  const monthLabel = bilingualText(
    lang,
    monthQ.data?.month_name_ne ?? monthQ.data?.month_name ?? "",
    monthQ.data?.month_name ?? monthQ.data?.month_name_ne ?? "",
  );
  const pakshaLabel = isEn
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
  const goToday = () => {
    monthBrowse.goToday(nowKey);
  };

  const pageLoading =
    monthQ.isLoading ||
    specialQ.isLoading ||
    gocharQ.isLoading ||
    ingressQ.isLoading;

  useRouteLoading(pageLoading);

  // Paksha filter + location controls are shared between the desktop header
  // (md+, right column) and the mobile drawer header slots (below md), so the
  // month/year picker matches the home page: a bottom sheet on mobile.
  const pakshaToggleDesktop = (
    <PakshaSegToggle
      value={paksha}
      onChange={setPaksha}
      options={[
        ["all", t("calendar.paksha_all")],
        ["krishna", t("calendar.paksha_krishna")],
        ["shukla", t("calendar.paksha_shukla")],
      ]}
    />
  );

  const mobilePakshaValue: Phase =
    effectivePaksha === "krishna" || effectivePaksha === "shukla"
      ? effectivePaksha
      : defaultMobilePaksha(allDays, nowKey);

  const pakshaToggleMobile = (
    <PakshaSegToggle
      value={mobilePakshaValue}
      onChange={setPaksha}
      options={[
        ["krishna", t("calendar.paksha_krishna")],
        ["shukla", t("calendar.paksha_shukla")],
      ]}
      className="w-full max-w-[10rem]"
      buttonClassName="flex-1 min-w-0 px-2"
    />
  );

  const locationControlDesktop = (
    <LocationSelector
      compact
      location={location}
      onLocationChange={setLocation}
      className="w-auto max-w-[11rem] sm:max-w-[12.5rem]"
    />
  );


  return (
    <PageShell>
      <PatroMonthYearNav
        era={monthBrowse.era}
        year={monthBrowse.year}
        month={monthBrowse.month}
        todayAd={nowKey}
        onToday={goToday}
        onMonthChange={(m) => monthBrowse.setYearMonth(monthBrowse.year, m)}
        onYearChange={(y) => monthBrowse.setYearMonth(y, monthBrowse.month)}
        onBrowseCommit={monthBrowse.commitEraYear}
        onPrev={() => stepMonth(-1)}
        onNext={() => stepMonth(1)}
        location={location}
        onLocationChange={setLocation}
        mobileToolbar={pakshaToggleMobile}
        desktopToolbar={
          <>
            {pakshaToggleDesktop}
            {locationControlDesktop}
          </>
        }
      />

      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-bold text-foreground">
            {monthLabel} {dg(monthBrowse.year)} · {pakshaLabel}
          </h2>
          {monthQ.data?.year_bs ? (
            <span className="text-sm">{dg(monthQ.data.year_bs)} {t("dainik.bs")}</span>
          ) : null}
          {ritu ? <span className="text-sm">· {t("dainik.season")}: {ritu}</span> : null}
          {allDays.length ? (
            <span className="text-xs">· {dg(days.length)} {t("dainik.days")}</span>
          ) : null}
        </div>
        <p className="text-sm">
          {bilingualText(lang, "पक्ष अनुसार दैनिक पञ्चाङ्ग — तिथि, नक्षत्र, योग, करण, सूर्योदय/अस्त, पर्व र ग्रह गोचर।", "Daily panchanga by paksha — tithi, nakshatra, yoga, karana, sunrise/sunset, festivals and planetary transits.",)}
        </p>
      </div>

      {monthHasAdhik && adhik?.month_name ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          {bilingualNode(lang, <>
              <span className="font-semibold">अधिक मास:</span> यस वर्ष <span className="font-semibold">अधिक {lunarMonthNe(adhik.month_name)}</span> मास परेको छ — त्यसैले यो महिनामा अधिक र शुद्ध पक्षहरू छुट्टाछुट्टै देखाइएका छन्। (अधिक मास = मलमास / पुरुषोत्तम मास; यसमा सङ्क्रान्ति पर्दैन।)
            </>, <>
              <span className="font-semibold">Adhik Maas:</span> this year has an{" "}
              <span className="font-semibold">Adhik {lunarMonthNe(adhik.month_name, true)}</span> month — so the adhik and shuddha pakshas are shown separately for this month. (Adhik Maas = Malamas / Purushottam Maas; it contains no sankranti.)
            </>,)}
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-8">
        <div className="w-full min-w-0 space-y-4">
        {/* mobile (<md): one card per day, wide table replaced to avoid horizontal scroll */}
        <div className="space-y-3 md:hidden">
          {monthQ.isError ? (
            <div className="rounded-xl border border-border py-8 text-center text-sm">
              {t("dainik.could_not_load_details_please_try_again")}
            </div>
          ) : monthQ.isLoading ? (
            <DainikKrantiMobileLoading />
          ) : days.length === 0 ? (
            <div className="rounded-xl border border-border py-8 text-center text-sm">
              {t("dainik.no_days_found_in_this_paksha")}
            </div>
          ) : (
            days.map((d) => {
              const segLabel = headerByDate[d.date_ad];
              return (
                <Fragment key={d.date_ad}>
                  {segLabel ? (
                    <h3 className="px-0.5 pt-2 text-sm font-bold text-secondary">{segLabel}</h3>
                  ) : null}
                  <DayPatroCard
                    day={d}
                    isToday={d.date_ad === nowKey}
                    isExpanded={expandedDays.has(d.date_ad)}
                    onToggle={() => toggleDayExpand(d.date_ad)}
                    transits={transitsByBsDay[d.day]}
                    lagna={lagnaByDate[d.date_ad]}
                    graha={grahaByDate[d.date_ad]}
                    notes={notesByDate[d.date_ad]}
                    adBrowse={adBrowse}
                  />
                </Fragment>
              );
            })
          )}
        </div>

        {/* desktop (md+): full daily table */}
        <div className="hidden w-full overflow-x-auto rounded-xl border border-border md:block">
          <Table className="w-full min-w-max text-sm">
            <TableHeader>
              <TableRow className={patroStickyHeadRow}>
                <TableHead className={cn(th, patroStickyHeadCell, "w-9 px-1")} aria-label={t("dainik.expand")} />
                <TableHead className={cn(th, patroStickyHeadCell)}>{bilingualText(lang, "गते", adBrowse ? "Date" : "Day")}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{t("dainik.tithi")}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{t("dainik.nakshatra")}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{t("dainik.yoga")}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{t("dainik.karana")}</TableHead>
                <TableHead className={cn(thWrap, patroStickyHeadCell, sunColW)}>
                  <span className="block">{t("dainik.sun_rise_set")}</span>
                  <span className="block">{t("dainik.sign")}</span>
                </TableHead>
                <TableHead className={cn(thWrap, patroStickyHeadCell, moonColW)}>
                  <span className="block">{t("dainik.moon")}</span>
                  <span className="block">{t("dainik.sign")}</span>
                </TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{t("dainik.transits_rise_set")}</TableHead>
                <TableHead className={cn(thWrap, patroStickyHeadCell, festivalColW)}>{t("dainik.festival")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthQ.isError ? (
                <TableRow><TableCell colSpan={COL_SPAN} className="py-8 text-center">{t("dainik.could_not_load_details_please_try_again")}</TableCell></TableRow>
              ) : monthQ.isLoading ? (
                <DainikKrantiTableLoading colSpan={COL_SPAN} />
              ) : days.length === 0 ? (
                <TableRow><TableCell colSpan={COL_SPAN} className="py-8 text-center">{t("dainik.no_days_found_in_this_paksha")}</TableCell></TableRow>
              ) : (
                days.map((d) => {
                  const det = d.panchanga;
                  const tithiEnd = angaEnd(det?.tithi, dg, isEn);
                  const nakEnd = angaEnd(det?.nakshatra, dg, isEn);
                  const yogaEnd = angaEnd(det?.yoga, dg, isEn);
                  const karanaEnd = angaEnd(det?.karana, dg, isEn);
                  const sunRashi = resolveRashiDisplay(det?.surya_rashi_ne, det?.surya_rashi, lang);
                  const dow = dowOf(d.date_ad);
                  const isSaturday = dow === 6;
                  const isToday = d.date_ad === nowKey;
                  const hasFestival = (d.festivals?.length ?? 0) > 0;
                  const segLabel = headerByDate[d.date_ad];
                  const isExpanded = expandedDays.has(d.date_ad);
                  return (
                    <Fragment key={d.date_ad}>
                    {segLabel ? (
                      <TableRow className="bg-muted/70 hover:bg-muted/70">
                        <TableCell colSpan={COL_SPAN} className="py-2.5 text-sm font-bold text-secondary">
                          {segLabel}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow
                      className={cn(
                        "cursor-pointer",
                        isToday && "bg-secondary/15 hover:bg-secondary/20",
                        !isToday && hasFestival && "bg-rose-500/5",
                        isExpanded && "border-b-0",
                      )}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-label={bilingualText(lang, `${dg(d.day)} गतेको लग्न र ग्रहस्पष्ट`, `Lagna & planets for day ${dg(d.day)}`)}
                      onClick={() => toggleDayExpand(d.date_ad)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleDayExpand(d.date_ad);
                        }
                      }}
                    >
                      <TableCell className="w-9 px-1">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md"
                          aria-hidden
                        >
                          <ChevronRight
                            className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")}
                          />
                        </span>
                      </TableCell>
                      <TableCell className={cn("align-top", isSaturday && "text-rose-600 dark:text-rose-400")}>
                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          {isToday ? <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden /> : null}
                          <DayLabel
                            day={d}
                            isEn={isEn}
                            dg={dg}
                            adBrowse={adBrowse}
                            accentClass={
                              isSaturday || hasFestival
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-foreground"
                            }
                          />
                        </div>
                        <div className={cn(subLine, isSaturday && "text-rose-600 dark:text-rose-400")}>
                          {weekdayLabel(d, isEn)}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div><span>{pakshaShort(d, isEn)}</span> {bilingualText(lang, d.tithi_ne ?? d.tithi, d.tithi ?? d.tithi_ne) ?? "—"}</div>
                        {tithiEnd ? <div className={subLine}>{bilingualText(lang, `${tithiEnd} सम्म`, `until ${tithiEnd}`)}</div> : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div>{bilingualText(lang, d.nakshatra_ne ?? d.nakshatra, d.nakshatra ?? d.nakshatra_ne) ?? "—"}</div>
                        {nakEnd ? <div className={subLine}>{bilingualText(lang, `${nakEnd} सम्म`, `until ${nakEnd}`)}</div> : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div>{bilingualText(lang, d.yoga_ne ?? d.yoga, d.yoga ?? d.yoga_ne) ?? "—"}</div>
                        {yogaEnd ? <div className={subLine}>{bilingualText(lang, `${yogaEnd} सम्म`, `until ${yogaEnd}`)}</div> : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div>{bilingualText(lang, d.karana_ne ?? d.karana, d.karana ?? d.karana_ne) ?? "—"}</div>
                        {karanaEnd ? <div className={subLine}>{bilingualText(lang, `${karanaEnd} सम्म`, `until ${karanaEnd}`)}</div> : null}
                      </TableCell>
                      <TableCell className={cn(sunColW, "align-top text-sm")}>
                        <SunRiseSetSignValue day={d} sunRashi={sunRashi} ayanaMark={det?.ayana_mark} dg={dg} />
                      </TableCell>
                      <TableCell className={cn(moonColW, "align-top text-sm")}>
                        <MoonRashiValue day={d} det={det} lang={lang} dg={dg} isEn={isEn} />
                      </TableCell>
                      <TableCell className="align-top">
                        {(transitsByBsDay[d.day]?.length ?? 0) > 0 ? (
                          <div className="space-y-0.5">
                            {transitsByBsDay[d.day]!.map((ev, i) => (
                              <div key={i} className="whitespace-nowrap text-sm leading-tight">
                                <span className="text-foreground">{bilingualText(lang, ev.labelNe, ev.labelEn)}</span>{" "}
                                <span className="text-secondary">{bilingualText(lang, ev.planetNe, ev.planetEn)}</span>
                                {ev.time ? (
                                  <span> {dg(ev.time)}</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(festivalColW, "align-top")}>
                        {hasFestival ? (
                          <div className="line-clamp-2 text-sm leading-snug text-rose-600 dark:text-rose-300">
                            {d.festivals.join(" · ")}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded ? (
                      <TableRow className="bg-muted/25 hover:bg-muted/25">
                        <TableCell
                          colSpan={COL_SPAN}
                          className="max-w-0 whitespace-normal px-2 py-2 sm:px-4"
                        >
                          <DayPatroExpandPanel
                            lagna={lagnaByDate[d.date_ad]}
                            graha={grahaByDate[d.date_ad]}
                            notes={notesByDate[d.date_ad]}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Accordion type="multiple" className="rounded-xl border border-border px-4">
          <AccordionItem value="lagna-month">
            <AccordionTrigger className="py-3 text-base font-semibold text-foreground hover:no-underline">
              {t("dainik.daily_lagna_start_timetable_full_month")}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="mb-3 text-sm leading-relaxed">
                {bilingualText(lang, "प्रत्येक गते सूर्योदयदेखि अर्को सूर्योदयसम्म कुन राशि कहिले लग्नमा आउँछ।", "For each day, which rashi rises as the lagna and when, from sunrise to the next sunrise.",)}
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <MonthLagnaMatrix
                  embedded
                  rows={lagnaMatrix}
                  todayKey={nowKey}
                  loading={monthQ.isLoading}
                  empty={!monthQ.isLoading && days.length === 0}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="graha-month">
            <AccordionTrigger className="py-3 text-base font-semibold text-foreground hover:no-underline">
              {t("dainik.planetary_positions_at_sunrise_full_month")}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="mb-3 text-sm leading-relaxed">
                {bilingualText(lang, "सूर्योदयको क्षणमा ग्रहहरूको राश्यादि स्थिति र दैनिक बेलान्तर।", "The planets' rashi positions at the moment of sunrise, and the daily time-difference.",)}
              </p>
              <MonthGrahaSpashta
                embedded
                rows={grahaMatrix}
                todayKey={nowKey}
                loading={monthQ.isLoading}
                empty={!monthQ.isLoading && days.length === 0}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="calc-notes">
            <AccordionTrigger className="py-3 text-base font-semibold text-foreground hover:no-underline">
              {t("dainik.calculation_notes_special_days")}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <MonthCalcNotes
                embedded
                notes={calcNotes}
                loading={monthQ.isLoading || ingressQ.isLoading}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </div>

        {/* bottom panels — was sidebar */}
        <aside className="grid w-full gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* sunrise / sunset quick glance for the reference day */}
          {(() => {
            const ref = days[0];
            if (!ref) return null;
            return (
              <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-4">
                <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                  <Sunrise className="h-5 w-5 text-amber-500" />
                  <div className="text-sm">
                    <div className="text-sm">{t("dainik.sunrise")}</div>
                    <div className="font-semibold text-foreground">{ref.sunrise ? dg(formatTimeShort(ref.sunrise) ?? ref.sunrise) : "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border p-3">
                  <Sunset className="h-5 w-5 text-indigo-500" />
                  <div className="text-sm">
                    <div className="text-sm">{t("dainik.sunset")}</div>
                    <div className="font-semibold text-foreground">{ref.sunset ? dg(formatTimeShort(ref.sunset) ?? ref.sunset) : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* gochar kundali flanked by rashyadi start / end */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:col-span-2 xl:col-span-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)_minmax(0,1fr)]">
            {rashyadiRange.start ? (
              <GocharRashyadiTable
                segment={rashyadiRange.start}
                kundaliGrahas={grahas}
                kundaliDateAd={gocharQ.data?.date_ad}
                loading={monthQ.isLoading || ingressQ.isLoading}
              />
            ) : null}
            <GocharKundaliChart
              className="flex flex-col justify-center lg:mx-auto lg:w-full lg:max-w-[300px]"
              grahas={grahas}
              gapanshaLine={gapanshaLine}
              papanshaLine={papanshaLine}
              dateBs={gocharQ.data?.date_bs}
              dateAd={gocharQ.data?.date_ad}
              loading={gocharQ.isLoading}
            />
            {rashyadiRange.end ? (
              <GocharRashyadiTable
                segment={rashyadiRange.end}
                loading={monthQ.isLoading || ingressQ.isLoading}
              />
            ) : null}
          </div>

          {/* graha gochar / udayast */}
          <div className="rounded-xl border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">{t("dainik.planetary_transits_next_sankranti")}</h3>
            {grahas.length === 0 ? (
              <p className="text-sm">{gocharQ.isLoading ? t("dainik.loading") : t("dainik.no_details_available")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {grahas.map((g) => (
                  <li key={g.key} className="flex items-baseline justify-between gap-2">
                    <span className="text-foreground">
                      {bilingualText(lang, g.name_ne, grahaTableEn(g.key, g.name_vedic ?? g.name_ne))}
                      <span className="ml-1">{resolveRashiDisplay(g.rashi_ne ?? grahaRashiNe(g), g.rashi, lang) ?? ""}</span>
                    </span>
                    {g.next_pada_entry ? (
                      <span className="shrink-0 text-right text-sm">
                        {bilingualText(lang, g.next_pada_entry.label_ne, g.next_pada_entry.to_rashi ?? g.next_pada_entry.label_ne)}
                        <br />
                        {dg(g.next_pada_entry.entry_time_local_short ?? g.next_pada_entry.entry_time_local ?? "")}
                      </span>
                    ) : g.next_rashi_entry ? (
                      <span className="shrink-0 text-right text-sm">
                        → {resolveRashiDisplay(g.next_rashi_entry.to_rashi_ne, g.next_rashi_entry.to_rashi, lang) ?? "—"}
                        <br />
                        {dg(g.next_rashi_entry.entry_time_local)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* kartavya */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 md:col-span-2 xl:col-span-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {pakshaLabel} {t("dainik.duties")}
            </h3>
            <div className="space-y-2 text-sm leading-relaxed">
              {effectivePaksha === "all" ? (
                <>
                  <p>{bilingualText(lang, KARTAVYA.krishna.ne, KARTAVYA.krishna.en)}</p>
                  <p>{bilingualText(lang, KARTAVYA.shukla.ne, KARTAVYA.shukla.en)}</p>
                </>
              ) : (
                <p>{bilingualText(lang, KARTAVYA[effectivePaksha].ne, KARTAVYA[effectivePaksha].en)}</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-border">
        <header className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <Sparkles className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold text-foreground">{t("dainik.planet_positions_rise_set_transit_legend")}</h3>
          {gocharQ.data?.date_ad ? (
            <span className="ml-auto text-sm">
              {bilingualText(lang, `${formatGocharBsLabel(gocharQ.data.date_bs, gocharQ.data.date_ad) ?? fmtAd(gocharQ.data.date_ad, false)} को स्थिति`, `Position on ${formatGocharBsLabel(gocharQ.data.date_bs, gocharQ.data.date_ad) ?? fmtAd(gocharQ.data.date_ad, true)}`,)}
            </span>
          ) : null}
        </header>

        <div className="grid gap-x-8 gap-y-6 p-4 md:grid-cols-2">
          {/* live graha spashta (degree · kala · vikala) + motion */}
          <div className="md:col-span-2">
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide">
              {t("dainik.planet_positions_deg_kala_vikala")}
            </h4>
            {grahas.length === 0 ? (
              <p className="text-sm">{gocharQ.isLoading ? t("dainik.loading") : t("dainik.no_details_available")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
                {grahas.map((g) => {
                  const m = motionNe(g);
                  return (
                    <div key={g.key} className="flex items-baseline gap-1.5 text-sm">
                      <span className="text-foreground">{bilingualText(lang, g.name_ne, grahaTableEn(g.key, g.name_vedic ?? g.name_ne))}</span>
                      <span>{resolveRashiDisplay(g.rashi_ne ?? grahaRashiNe(g), g.rashi, lang) ?? ""}</span>
                      {g.dms_in_rashi ? <span className="text-foreground">{dg(g.dms_in_rashi)}</span> : null}
                      <span
                        className={cn(
                          "ml-auto shrink-0 rounded px-1.5 text-xs",
                          m.vakri ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                        )}
                      >
                        {bilingualText(lang, m.label, m.labelEn)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-sm leading-relaxed">
              {bilingualNode(lang, 
                <>प्रत्येक पक्षको आरम्भमा ग्रहहरूको स्पष्ट स्थान अंश°, कला′, विकला″ (र प्रति-विकला) मा दिइन्छ — जस्तै “१३ ६ २९ ४०” = १३ अंश ६ कला २९ विकला ४० प्रति-विकला। <span className="text-rose-600 dark:text-rose-300">वक्री</span> = उल्टो गति, <span className="text-emerald-600 dark:text-emerald-300">मार्गी</span> = सुल्टो गति।</>,
                <>At the start of each paksha, each planet's exact position is given in degrees°, kala′, vikala″ (and prati-vikala) — e.g. “13 6 29 40” = 13 deg 6 kala 29 vikala 40 prati-vikala. <span className="text-rose-600 dark:text-rose-300">Vakri</span> = retrograde (backward) motion, <span className="text-emerald-600 dark:text-emerald-300">Margi</span> = direct (forward) motion.</>,
              )}
            </p>
          </div>

          {/* udayast symbol legend */}
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide">
              {t("dainik.planet_rise_set_symbols")}
            </h4>
            <dl className="space-y-1.5">
              {UDAYAST_LEGEND.map((it) => (
                <div key={it.code} className="flex gap-2 text-sm">
                  <dt className="w-24 shrink-0">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-secondary">{it.code}</span>
                  </dt>
                  <dd>
                    <span className="text-foreground">{bilingualText(lang, it.full, it.fullEn)}</span> — {bilingualText(lang, it.meaning, it.meaningEn)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* gochar / papashanti house legend */}
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide">
              {t("dainik.transit_papashanti_house_symbols")}
            </h4>
            <dl className="space-y-1.5">
              {GOCHAR_LEGEND.map((it) => (
                <div key={it.code} className="flex gap-2 text-sm">
                  <dt className="w-20 shrink-0">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-secondary">{it.code}</span>
                  </dt>
                  <dd>{bilingualText(lang, it.meaning, it.meaningEn)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm leading-relaxed">
              {bilingualNode(lang, <><span className="font-semibold text-foreground">दशा कोष्ठक:</span> जन्म-समयमा बाँकी विंशोत्तरी दशाको वर्ष/महिना/दिन। <span className="font-semibold text-foreground">समय सुधार:</span> मुद्रणमा “उ” वा “०” जस्ता सङ्केतले शून्य अंश/कला जनाउँछ।</>, <><span className="font-semibold text-foreground">Dasha bracket:</span> the years/months/days of Vimshottari dasha remaining at birth. <span className="font-semibold text-foreground">Time correction:</span> in print, symbols like “u” or “0” indicate zero degrees/kala.</>,)}
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default DainikKranti;
