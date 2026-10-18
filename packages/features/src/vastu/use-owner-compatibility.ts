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
import { useLocale, type Lang } from "@vedic-patro/i18n/react";
import { lazyList } from "@vedic-patro/i18n/runtime";

const TONE_LABEL_KEY: Record<NavataraTone, string> = {
  best: "vastu.plot.tone.best",
  good: "vastu.plot.tone.good",
  neutral: "vastu.plot.tone.neutral",
  bad: "vastu.plot.tone.bad",
  worst: "vastu.plot.tone.worst",
};

const AD_MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const AD_MONTHS_NE = lazyList("ne", "ui.panchanga_og_preview.x_483e5df7");

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
  const [thisYear] = useState(() => new Date().getFullYear());

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

  const [y, m, d] = candidateDate.split("-").map(Number) as [number, number, number];
  const setParts = (year: number, month: number, day: number) =>
    setCandidateDate(isoOf(year, month, Math.min(day, daysInMonth(year, month))));

  return {
    selectedProfile,
    setSelectedProfile,
    hasProfile: chartParams != null,
    plotLocation,
    setPlotLocation,
    candidateDate,
    setCandidateDate,
    /** The date as three selects (the app's date picker). */
    dateParts: {
      year: String(y),
      month: String(m),
      day: String(d),
      yearOptions: Array.from({ length: 12 }, (_, i) => {
        const year = thisYear - 1 + i;
        return { value: String(year), label: digits(year) };
      }),
      monthOptions: AD_MONTHS_EN.map((en, i) => ({ value: String(i + 1), label: bilingualText(lang, AD_MONTHS_NE[i]!, en) })),
      dayOptions: Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ value: String(i + 1), label: digits(i + 1) })),
      setYear: (v: string) => setParts(Number(v), m, d),
      setMonth: (v: string) => setParts(y, Number(v), d),
      setDay: (v: string) => setParts(y, m, Number(v)),
    },
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
