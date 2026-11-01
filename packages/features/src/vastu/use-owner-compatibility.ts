/**
 * Does the owner's own nakshatra suit the day they mean to start building?
 * Shared by the website's and the app's `components/vastu/OwnerCompatibility.tsx`:
 * the picked profile, the candidate date (with year/month/day options for an
 * app that asks for it in three selects) and place, the two queries, that
 * day's tarabala row for the owner, and copy. Each app passes how it loads a
 * civil (AD) day.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJanmaRashi, type LocationParams, type NavataraTone, type PanchangaDay, type Profile } from "@vedic-patro/api-client";
import { profileChartParams } from "@vedic-patro/read-models/jyotish/kundali/profile-chart";
import { bilingualText } from "@vedic-patro/domain/locale";
import { DEFAULT_PANCHANGA_LOCATION, resolveLocationTimezone, type PanchangaLocation } from "@vedic-patro/read-models/geography/panchanga-location";
import { useCalendarSystem, useLocale, type Lang } from "@vedic-patro/i18n/react";
import {
  adMonthLabel,
  adToBS,
  bsFromCivilIso,
  bsMonthLabel,
  bsToAdOrNull,
  getBSMonthLength,
} from "@vedic-patro/domain/calendar/bs-calendar";
import { civilIsoFromDate } from "@vedic-patro/domain/calendar/patro-day";

const TONE_LABEL_KEY: Record<NavataraTone, string> = {
  best: "vastu.plot.tone.best",
  good: "vastu.plot.tone.good",
  neutral: "vastu.plot.tone.neutral",
  bad: "vastu.plot.tone.bad",
  worst: "vastu.plot.tone.worst",
};

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Days in an AD month, leap years included. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function todayIso(): string {
  const n = new Date();
  return isoOf(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

export type FetchCivilDay = (dateAd: string, location: LocationParams, lang: Lang) => Promise<PanchangaDay>;

export function useOwnerCompatibility({ fetchDay }: { fetchDay: FetchCivilDay }) {
  const { t, lang, digits } = useLocale();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const chartParams = selectedProfile ? profileChartParams(selectedProfile) : null;

  // Independent from the shared site-wide location, which would otherwise be
  // overwritten by what is picked here.
  const [plotLocation, setPlotLocation] = useState<PanchangaLocation>(DEFAULT_PANCHANGA_LOCATION);
  const [candidateDate, setCandidateDate] = useState(() => todayIso());
  const { calendar } = useCalendarSystem();
  const [thisYear] = useState(() => new Date().getFullYear());
  const [thisBsYear] = useState(() => adToBS(new Date()).year);

  const janmaQ = useQuery({
    queryKey: ["vastu-owner-nakshatra", chartParams?.moment, chartParams?.location.params],
    queryFn: () => fetchJanmaRashi(chartParams!.moment, resolveLocationTimezone(chartParams!.location)),
    enabled: !!chartParams,
    staleTime: 1000 * 60 * 5,
  });

  const dayQ = useQuery({
    queryKey: ["vastu-construction-day", candidateDate, plotLocation.params, lang],
    queryFn: () => fetchDay(candidateDate, plotLocation.params, lang),
    enabled: !!chartParams,
    staleTime: 1000 * 60 * 5,
  });

  // janma_nakshatra is 1..27; NavataraRow.index is 0-based — convert once, here.
  const ownerIndex = janmaQ.data ? janmaQ.data.janma_nakshatra - 1 : null;
  const row = ownerIndex !== null ? (dayQ.data?.tarabala_table?.rows.find((r) => r.index === ownerIndex) ?? null) : null;

  const isLoading = chartParams != null && (janmaQ.isLoading || dayQ.isLoading);
  const isError = chartParams != null && (janmaQ.isError || dayQ.isError);

  const dateParts = calendar === "ad" ? adDateParts(candidateDate, thisYear, lang, digits, setCandidateDate) : bsDateParts(candidateDate, thisBsYear, lang, digits, setCandidateDate);

  return {
    selectedProfile,
    setSelectedProfile,
    hasProfile: chartParams != null,
    plotLocation,
    setPlotLocation,
    candidateDate,
    setCandidateDate,
    /** The date as three selects (year, month, day) in the calendar system the reader has chosen. */
    dateFields: [
      { id: "vastu-construction-year", label: t("vastu.plot.construction_year"), value: dateParts.year, onChange: dateParts.setYear, options: dateParts.yearOptions },
      { id: "vastu-construction-month", label: t("vastu.plot.construction_month"), value: dateParts.month, onChange: dateParts.setMonth, options: dateParts.monthOptions },
      { id: "vastu-construction-day", label: t("vastu.plot.construction_day"), value: dateParts.day, onChange: dateParts.setDay, options: dateParts.dayOptions },
    ].map((field) => ({ ...field, options: field.options.map((o) => ({ id: o.value, label: o.label })) })),
    status: isLoading ? t("vastu.plot.owner_loading") : null,
    error: isError ? t("vastu.plot.owner_error") : null,
    result: row
      ? {
          tone: row.tone,
          title: `${t("vastu.plot.owner_nakshatra_label")}: ${bilingualText(lang, row.name, row.name_en ?? row.name)}`,
          verdict: t("vastu.plot.construction_result", { tone: t(TONE_LABEL_KEY[row.tone]) }),
          disclaimer: t("vastu.plot.construction_disclaimer"),
        }
      : null,
    copy: {
      heading: t("vastu.plot.owner_heading"),
      blurb: t("vastu.plot.owner_blurb"),
      dateLabel: t("vastu.plot.construction_date_label"),
      placeLabel: t("vastu.plot.construction_place_label"),
    },
  };
}

type DateOption = { value: string; label: string };

export type OwnerDateParts = {
  year: string;
  month: string;
  day: string;
  yearOptions: DateOption[];
  monthOptions: DateOption[];
  dayOptions: DateOption[];
  setYear: (v: string) => void;
  setMonth: (v: string) => void;
  setDay: (v: string) => void;
};

type Digits = (n: number) => string;

/** Twelve years around this one: last year, this year and ten ahead. */
const yearsAround = (thisYear: number, digits: Digits): DateOption[] =>
  Array.from({ length: 12 }, (_, i) => {
    const year = thisYear - 1 + i;
    return { value: String(year), label: digits(year) };
  });

const dayRange = (count: number, digits: Digits): DateOption[] =>
  Array.from({ length: count }, (_, i) => ({ value: String(i + 1), label: digits(i + 1) }));

/** Gregorian selects — only when the reader has switched the calendar to AD. */
function adDateParts(iso: string, thisYear: number, lang: Lang, digits: Digits, setIso: (iso: string) => void): OwnerDateParts {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const set = (year: number, month: number, day: number) => setIso(isoOf(year, month, Math.min(day, daysInMonth(year, month))));
  return {
    year: String(y),
    month: String(m),
    day: String(d),
    yearOptions: yearsAround(thisYear, digits),
    monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: adMonthLabel(i + 1, lang) })),
    dayOptions: dayRange(daysInMonth(y, m), digits),
    setYear: (v) => set(Number(v), m, d),
    setMonth: (v) => set(y, Number(v), d),
    setDay: (v) => set(y, m, Number(v)),
  };
}

/** Bikram Sambat selects (वैशाख … चैत), the default. Each pick is stored back as its AD day. */
function bsDateParts(iso: string, thisBsYear: number, lang: Lang, digits: Digits, setIso: (iso: string) => void): OwnerDateParts {
  const bs = bsFromCivilIso(iso);
  const set = (year: number, month: number, day: number) => {
    const ad = bsToAdOrNull(year, month, Math.min(day, getBSMonthLength(year, month)));
    if (ad) setIso(civilIsoFromDate(ad));
  };
  return {
    year: String(bs.year),
    month: String(bs.month),
    day: String(bs.day),
    yearOptions: yearsAround(thisBsYear, digits),
    monthOptions: Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: bsMonthLabel(i + 1, lang) })),
    dayOptions: dayRange(getBSMonthLength(bs.year, bs.month), digits),
    setYear: (v) => set(Number(v), bs.month, bs.day),
    setMonth: (v) => set(bs.year, Number(v), bs.day),
    setDay: (v) => set(bs.year, bs.month, Number(v)),
  };
}
