/**
 * The calendar header, shared by the website and the app: one control for
 * month + year (a button that opens a panel with the year stepper, a box to
 * jump to any year, and the month grid), the date badge that jumps to today,
 * and which panel ("month" | "location") is open — only one at a time.
 *
 * The apps only draw what this returns. Where the browsed month lives (URL on
 * the website, screen state in the app) is passed in as `year`, `month` and
 * `onChange`. The location panel is `useLocationSelector` (panchanga feature),
 * opened with `panel === "location"`.
 */
import { useState } from "react";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { patroBrowseTodayEra } from "@vedic-patro/domain/calendar/era";
import { defaultMonthBrowseParts } from "@vedic-patro/domain/calendar/patro-browse-params";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga/panchanga-format";
import { isGregorianEraBrowse, monthLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { shiftPatroBrowseMonth, stepPatroBrowseYear } from "@vedic-patro/domain/calendar/patro-year-browse-step";
import { maxBrowseYearForEra } from "@vedic-patro/domain/calendar/patro-year-axis";
import { monthLengthInBrowseEra } from "@vedic-patro/domain/calendar/patro-browse-range";
import { patroEraShortLabel } from "@vedic-patro/domain/calendar/patro-era-label";
import { useLocale } from "@vedic-patro/i18n/react";
import { monthOptions, parseYearInput } from "./calendar-header-model";
import { useSamvatsaraLabel } from "./use-samvatsara-label";
import { usePatroYearEraToggle } from "./use-patro-year-era-toggle";

export type CalendarHeaderPanel = "month" | "location";

export function usePatroCalendarHeader({
  era,
  year,
  month,
  onChange,
}: {
  era: Era;
  year: number;
  month: number;
  /** Called with the new browsed month; the caller stores it (URL or state). */
  onChange: (next: { year: number; month: number }) => void;
}) {
  const { t, lang } = useLocale();
  const [panel, setPanel] = useState<CalendarHeaderPanel | null>(null);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);

  const yearLabel = (y: number) => toNepaliDigits(y, lang);
  const monthName = monthLabel(era, month, lang);

  const openPanel = (next: CalendarHeaderPanel | null) => {
    if (next === "month") {
      setDraft(yearLabel(year));
      setInvalid(false);
    }
    setPanel(next);
  };

  /** The year in the box when it parses (stepped or typed, not yet loaded), else the browsed one. */
  const pendingYear = () => parseYearInput(draft, era) ?? year;

  const setYear = (next: number) => {
    setDraft(yearLabel(next));
    setInvalid(false);
    onChange({ year: next, month });
  };

  const samvatsara = useSamvatsaraLabel(era, year);
  const eraToggle = usePatroYearEraToggle(era);
  // Fixed order (BS before AD) so the segments do not swap places when pressed.
  const eras = eraToggle
    ? [
        { era, label: patroEraShortLabel(era, lang), active: true },
        { era: eraToggle.targetEra, label: eraToggle.label, active: false },
      ].sort((a, b) => Number(isGregorianEraBrowse(a.era)) - Number(isGregorianEraBrowse(b.era)))
    : [];

  const today = defaultMonthBrowseParts(patroBrowseTodayEra(era));

  return {
    panel,
    openPanel,
    closePanel: () => setPanel(null),
    /** Taps on the month/year button and on the location button. */
    togglePanel: (which: CalendarHeaderPanel) => openPanel(panel === which ? null : which),

    title: { month: monthName, year: yearLabel(year) },
    /** The date badge's lower line: first–last day of the month. */
    dayRange: `${yearLabel(1)}–${yearLabel(monthLengthInBrowseEra(era, year, month))}`,
    /** Short name of the era being browsed ("वि.सं."), shown beside the year. */
    eraLabel: patroEraShortLabel(era, lang),
    /** Samvatsara name of the browsed year ("" when none). */
    samvatsara,
    /** The era switch in the month panel (empty when the era has no pair); pressing one calls `onEraChange(era)`. */
    eras,
    eraAria: t("calendar.era_aria"),
    isToday: today.year === year && today.month === month,
    /** The date badge: back to the current month. */
    goToday: () => {
      setPanel(null);
      setDraft(yearLabel(today.year));
      setInvalid(false);
      onChange(today);
    },

    stepMonth: (delta: 1 | -1) => onChange(shiftPatroBrowseMonth(era, year, month, delta)),
    /** The arrows beside the year box only change the box; "Go" (or a month) loads that year. */
    stepYear: (direction: "prev" | "next") => {
      setDraft(yearLabel(stepPatroBrowseYear(era, pendingYear(), direction)));
      setInvalid(false);
    },

    months: monthOptions(era, month, lang).map((m) => ({
      ...m,
      pick: () => {
        setPanel(null);
        onChange({ year: pendingYear(), month: m.month });
      },
    })),

    /** The jump-to-year box: `value` is what the reader typed (any digits), `commit` applies it. */
    yearInput: {
      value: draft,
      invalid,
      onChange: (text: string) => {
        setDraft(text);
        setInvalid(false);
      },
      commit: () => {
        const parsed = parseYearInput(draft, era);
        if (parsed === null) setInvalid(true);
        else setYear(parsed);
      },
      maxYear: maxBrowseYearForEra(era),
    },

    labels: {
      today: t("calendar.today_jump"),
      prevMonth: t("calendar.prev_month"),
      nextMonth: t("calendar.next_month"),
      picker: t("calendar.pick_month_year"),
      monthSection: t("calendar.month_aria"),
      yearSection: t("calendar.year_aria"),
      yearInput: t("calendar.year_input"),
      yearGo: t("calendar.year_go"),
      yearInvalid: t("calendar.year_invalid", { max: yearLabel(maxBrowseYearForEra(era) ?? 9999) }),
      prevYear: t("calendar.prev_year"),
      nextYear: t("calendar.next_year"),
    },
  };
}
