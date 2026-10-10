import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BS_MONTHS_NE,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  getBSMonthLength,
  getSupportedAdBounds,
} from "@/lib/bs-calendar";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { InstantQuery } from "@/lib/instant-query";

const BS_YEARS = Array.from(
  { length: BS_SUPPORTED_END_YEAR - BS_SUPPORTED_START_YEAR + 1 },
  (_, i) => BS_SUPPORTED_START_YEAR + i
);

const AD_BOUNDS = getSupportedAdBounds();
const AD_YEARS = Array.from(
  { length: AD_BOUNDS.maxYear - AD_BOUNDS.minYear + 1 },
  (_, i) => AD_BOUNDS.minYear + i,
);

/** Catalogue keys for the Gregorian month names, January first. */
const AD_MONTH_KEYS = [
  "kundali.x.month_january",
  "kundali.x.month_february",
  "kundali.x.month_march",
  "kundali.x.month_april",
  "kundali.x.month_may",
  "kundali.x.month_june",
  "kundali.x.month_july",
  "kundali.x.month_august",
  "kundali.x.month_september",
  "kundali.x.month_october",
  "kundali.x.month_november",
  "kundali.x.month_december",
];

const selectClass =
  "h-9 min-w-0 flex-1 px-2.5 rounded-lg border border-border bg-card text-foreground text-sm text-base cursor-pointer";

function getADMonthLength(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthLengthForPicker(era: "bs" | "ad", year: number, month: number): number {
  if (era === "ad") return getADMonthLength(year, month);
  try {
    return getBSMonthLength(year, month);
  } catch {
    return 30;
  }
}

interface Props {
  moment: InstantQuery;
  onMomentChange: (q: InstantQuery) => void;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
}

export function KundaliControls({
  moment,
  onMomentChange,
  location,
  onLocationChange,
}: Props) {
  const { t } = useTranslation();
  const calendarEra = useCalendarEra();
  const era: "bs" | "ad" =
    calendarEra === "ad" || calendarEra === "bc" ? "ad" : "bs";

  const pick = (year: number, month: number, day: number) => {
    const monthLen = monthLengthForPicker(era, year, month);
    onMomentChange({
      inputEra: era,
      year,
      month,
      day: Math.min(day, monthLen),
      clock: moment.clock,
    });
  };

  const year = moment.year;
  const month = moment.month;
  const day = moment.day;
  const monthLen = monthLengthForPicker(era, year, month);

  return (
    <div className="w-full flex flex-wrap items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]">
      {era === "bs" ? (
        <>
          <select
            className={selectClass}
            value={year}
            aria-label={t("kundali.year")}
            onChange={(e) => pick(Number(e.target.value), month, day)}
          >
            {BS_YEARS.map((y) => (
              <option key={y} value={y}>
                {toNepaliDigits(y)}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={month - 1}
            aria-label={t("kundali.month")}
            onChange={(e) => pick(year, Number(e.target.value) + 1, day)}
          >
            {BS_MONTHS_NE.map((ne, i) => (
              <option key={ne} value={i}>
                {ne}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={day}
            aria-label={t("kundali.day")}
            onChange={(e) => pick(year, month, Number(e.target.value))}
          >
            {Array.from({ length: monthLen }, (_, i) => i + 1).map((dd) => (
              <option key={dd} value={dd}>
                {toNepaliDigits(dd)}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <select
            className={selectClass}
            value={year}
            aria-label={t("kundali.year")}
            onChange={(e) => pick(Number(e.target.value), month, day)}
          >
            {AD_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={month - 1}
            aria-label={t("kundali.month")}
            onChange={(e) => pick(year, Number(e.target.value) + 1, day)}
          >
            {AD_MONTH_KEYS.map((monthKey, i) => (
              <option key={monthKey} value={i}>
                {t(monthKey)}
              </option>
            ))}
          </select>

          <select
            className={selectClass}
            value={day}
            aria-label={t("kundali.day")}
            onChange={(e) => pick(year, month, Number(e.target.value))}
          >
            {Array.from({ length: monthLen }, (_, i) => i + 1).map((dd) => (
              <option key={dd} value={dd}>
                {dd}
              </option>
            ))}
          </select>
        </>
      )}

      <label className="inline-flex items-center gap-1.5 h-9 shrink-0 px-2.5 rounded-lg border border-border bg-card text-sm text-base text-foreground min-w-[7.5rem]">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <input
          type="time"
          value={moment.clock}
          onChange={(e) => onMomentChange({ ...moment, clock: e.target.value })}
          className="bg-transparent border-0 p-0 m-0 w-full text-sm font-mono font-semibold text-foreground focus:outline-none focus:ring-0"
          aria-label={t("kundali.birth_time")}
        />
      </label>

      <LocationSelector
        compact
        className="h-9 flex-[2] min-w-[10rem] max-w-none w-auto"
        location={location}
        onLocationChange={onLocationChange}
      />
    </div>
  );
}
