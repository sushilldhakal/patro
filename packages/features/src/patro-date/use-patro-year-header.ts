/**
 * The year-only picker shared by the website and the app: the badge (jumps to
 * the current year), the title with the Gregorian years under it, prev/next
 * year, and one button opening a panel with the jump box, a paged grid of
 * twelve years (each with its Gregorian years) and a "this year" button.
 * Picking or applying a year closes the panel.
 *
 * The apps only draw what this returns; the year itself lives with the caller
 * (URL on the website, screen state in the app) and comes in as `year` / `onChange`.
 */
import { useState } from "react";
import type { Era } from "@vedic-patro/domain/era";
import { patroEraShortLabel } from "@vedic-patro/domain/patro-era-label";
import { stepPatroBrowseYear } from "@vedic-patro/domain/patro-year-browse-step";
import { useLocale } from "@vedic-patro/i18n/react";
import { gregorianSpanOfBsYear } from "./calendar-header-model";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { usePatroYearEraToggle } from "./use-patro-year-era-toggle";
import { useSamvatsaraLabel } from "./use-samvatsara-label";
import { useYearJump } from "./use-year-jump";

export function usePatroYearHeader({
  era,
  year,
  onChange,
  onToday,
  todayYear,
  subtitleOverride,
}: {
  era: Era;
  year: number;
  onChange: (year: number) => void;
  /** The badge and the "this year" button; the caller decides which year (and era) that is. */
  onToday: () => void;
  /** Outlined in the grid. */
  todayYear?: number;
  /** Replaces the Gregorian line under the title (the API's span, or a window caption). */
  subtitleOverride?: string | null;
}) {
  const { t, lang } = useLocale();
  const [open, setOpen] = useState(false);
  const jump = useYearJump({
    era,
    year,
    onApply: (y) => {
      setOpen(false);
      onChange(y);
    },
  });

  const samvatsara = useSamvatsaraLabel(era, year);
  const eraToggle = usePatroYearEraToggle(era);
  // Fixed order (BS before AD) so the segments do not swap places when pressed.
  const eras = eraToggle
    ? [
        { era, label: patroEraShortLabel(era, lang), active: true },
        { era: eraToggle.targetEra, label: eraToggle.label, active: false },
      ].sort((a, b) => Number(isGregorianEraBrowse(a.era)) - Number(isGregorianEraBrowse(b.era)))
    : [];
  const span = gregorianSpanOfBsYear(era, year);
  const spanText = span ? t("calendar.ad_years", { years: `${jump.label(span[0])}/${jump.label(span[1])}` }) : null;

  const step = (direction: "prev" | "next") => {
    const next = stepPatroBrowseYear(era, year, direction);
    jump.follow(next);
    onChange(next);
  };

  return {
    open,
    toggle: () => {
      if (!open) jump.reset(year);
      setOpen(!open);
    },
    close: () => setOpen(false),

    badge: { top: t("calendar.year_badge"), bottom: jump.label(year) },
    title: { main: [jump.label(year), patroEraShortLabel(era, lang), samvatsara].filter(Boolean).join(" "), sub: subtitleOverride ?? spanText },
    yearLabel: jump.label(year),
    goToday: () => {
      setOpen(false);
      onToday();
    },
    prev: () => step("prev"),
    next: () => step("next"),

    /** The era switch at the top of the panel (empty when the era has no pair). */
    eras,
    eraAria: t("calendar.era_aria"),
    input: jump.input,
    page: jump.page,
    chips: jump.page.years.map((y) => {
      const s = gregorianSpanOfBsYear(era, y);
      return {
        year: y,
        label: jump.label(y),
        sub: s ? `${jump.label(s[0])}/${jump.label(s[1])}` : null,
        selected: y === year,
        current: y === todayYear,
        pick: () => {
          setOpen(false);
          onChange(y);
        },
      };
    }),

    labels: {
      ...jump.labels,
      today: t("calendar.this_year_jump"),
      thisYear: t("patro_date.this_year"),
      prev: t("calendar.prev_year"),
      next: t("calendar.next_year"),
      picker: t("calendar.pick_year"),
    },
  };
}
