/**
 * The jump-to-year box plus the paged year grid, shared by the year picker and
 * the date + time picker's year view: what was typed, whether it is valid for
 * the era, and which page of twelve years is showing.
 */
import { useState } from "react";
import type { Era } from "@vedic-patro/domain/era";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { maxBrowseYearForEra } from "@vedic-patro/domain/patro-year-axis";
import { useLocale } from "@vedic-patro/i18n/react";
import { parseYearInput, shiftYearPage, yearPageStart, yearPageYears } from "./calendar-header-model";

export function useYearJump({ era, year, onApply }: { era: Era; year: number; onApply: (year: number) => void }) {
  const { t, lang } = useLocale();
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [start, setStart] = useState(() => yearPageStart(year));
  const label = (y: number) => toNepaliDigits(y, lang);
  const max = maxBrowseYearForEra(era) ?? 9999;

  /** Show `y` in the box and its page of years (call when the picker opens). */
  const reset = (y: number) => {
    setDraft(label(y));
    setInvalid(false);
    setStart(yearPageStart(y));
  };

  const years = yearPageYears(era, start);
  const first = years[0] ?? start;
  const last = years[years.length - 1] ?? start;

  return {
    reset,
    input: {
      value: draft,
      invalid,
      onChange: (text: string) => {
        setDraft(text);
        setInvalid(false);
      },
      commit: () => {
        const parsed = parseYearInput(draft, era);
        if (parsed === null) setInvalid(true);
        else {
          setDraft(label(parsed));
          setStart(yearPageStart(parsed));
          onApply(parsed);
        }
      },
      maxLength: String(max).length,
      errorText: t("calendar.year_invalid", { max: label(max) }),
      placeholder: label(year),
    },
    page: {
      years,
      rangeText: `${label(first)} – ${label(last)}`,
      prev: () => setStart(shiftYearPage(era, start, -1)),
      next: () => setStart(shiftYearPage(era, start, 1)),
      prevDisabled: start <= 1,
      nextDisabled: last >= max,
    },
    /** Move the shown page (and the box) to `y` after the year changed elsewhere. */
    follow: reset,
    label,
    labels: {
      jump: t("calendar.year_jump"),
      input: t("calendar.year_input"),
      go: t("calendar.year_go"),
      prevPage: t("calendar.years_prev_page"),
      nextPage: t("calendar.years_next_page"),
    },
  };
}
