import { useTranslation } from "react-i18next";
import { useCallback, useMemo, useRef } from "react";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { BsHeadline } from "@/components/BsHeadline";
import { PatroYearPickerPopover } from "./PatroYearPickerPopover";
import {
  PatroDateChip,
  PatroDateSheet,
  PatroLocationChip,
  PatroMobileYearSheetDraft,
  type PatroMobileYearSheetDraft as MobileYearDraft,
} from "./PatroDateSheet";
import { buildPatroBrowseYearOptions } from "@/lib/patro-date-options";
import { isValidBrowseYear } from "@/lib/patro-year-axis";
import { usePatroDateSheet } from "./use-patro-date-sheet";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { stepPatroBrowseYear } from "@/lib/patro-year-browse-step";
import { patroBrowseTodayEra, patroBrowseTodayYear } from "@/hooks/use-patro-year-browse";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import {
  patroMonthChipButton,
  patroMonthChipDay,
  patroMonthChipHead,
  patroMonthChipShell,
  patroMonthNavBtn,
  patroMonthNavShell,
  patroMobileStepBtn,
} from "@/lib/patro-classes";
import { cn } from "@/lib/utils";
import { isGregorianEraBrowse } from "./patro-month-labels";
import {
  getLanguageForEra,
  type Era,
} from "@/lib/era";
import { resolveSamvatsaraForPatroYear } from "@/lib/samvatsara";
import { samvatsaraName } from "@/lib/samvatsara-i18n";
import { patroEraShortLabel } from "./patro-era-short-label";
import { usePatroYearHeadlineSubtitle } from "./use-patro-year-headline-subtitle";

export type PatroYearNavProps = {
  era: Era;
  year: number;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  /** Raw API gregorian year span — formatted for the headline subtitle. */
  gregorianRange?: { start: string; end: string } | null;
  /** Preformatted cross-era span (skip when {@link gregorianRange} is set). */
  rangeLabel?: string | null;
  /** Out-of-range or validation message from the backend (400 detail). */
  yearError?: string | null;
  /** Observer “today” (YYYY-MM-DD) for the chip jump — e.g. location timezone. */
  todayAd?: string;
  /** Override chip “go to today”; default sets year via {@link patroBrowseTodayYear}. */
  onToday?: () => void;
  displayLanguage?: import("@/lib/era").Language;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  className?: string;
};

/**
 * Year-only navigation — graha yearly pages (asta, vakri), holidays, suryakranti.
 * Positive {@link year} in the active {@link Era}; the backend validates range.
 */
export function PatroYearNav({
  era,
  year,
  onYearChange,
  onEraChange,
  gregorianRange,
  rangeLabel,
  yearError,
  todayAd,
  onToday,
  displayLanguage,
  location,
  onLocationChange,
  className,
}: PatroYearNavProps) {
  const { t } = useTranslation();
  const { lang, digits } = usePatroDisplayLocale(displayLanguage);
  const chipEra = patroEraShortLabel(era, t);
  const chipYear = year;
  const vikramHeadline = `${digits(year)} ${chipEra}`;
  const isGregorianEra = getLanguageForEra(era) === "en";
  const samvatsara = isGregorianEraBrowse(era)
    ? undefined
    : resolveSamvatsaraForPatroYear(era, year);
  const samvatsaraLabel = samvatsara ? samvatsaraName(samvatsara, lang) : undefined;

  const jumpToToday =
    onToday ??
    (() => {
      const targetEra = patroBrowseTodayEra(era);
      if (targetEra !== era) onEraChange?.(targetEra);
      onYearChange(patroBrowseTodayYear(era, todayAd));
    });

  const gregorianSubtitle = usePatroYearHeadlineSubtitle(
    era,
    year,
    gregorianRange,
    rangeLabel,
    displayLanguage,
  );

  const sheet = usePatroDateSheet();
  const showLocation = Boolean(location && onLocationChange);

  const locationDesktop = showLocation ? (
    <LocationSelector
      compact
      location={location!}
      onLocationChange={onLocationChange!}
      className="h-8 min-w-0 w-auto max-w-[12.5rem]"
    />
  ) : null;

  const locationMobile = showLocation ? (
    <PatroLocationChip location={location!} onOpen={sheet.openLocation} />
  ) : null;

  const canPrev = stepPatroBrowseYear(era, year, "prev") !== year;
  const canNext = stepPatroBrowseYear(era, year, "next") !== year;

  const pickerYearOptions = useMemo(() => {
    const base = buildPatroBrowseYearOptions(era);
    const filtered = base.filter((y) => Number.isFinite(y) && y >= 1);
    if (
      Number.isFinite(year) &&
      year >= 1 &&
      isValidBrowseYear(era, year) &&
      !filtered.includes(year)
    ) {
      return [...filtered, year].sort((a, b) => a - b);
    }
    return filtered;
  }, [era, year]);

  const mobileYearDraftRef = useRef<MobileYearDraft | null>(null);
  const rememberMobileYearDraft = useCallback((draft: MobileYearDraft) => {
    mobileYearDraftRef.current = draft;
  }, []);

  const commitMobileYearDraft = useCallback(() => {
    const draft = mobileYearDraftRef.current;
    if (!draft) return;
    if (draft.era !== era && onEraChange) onEraChange(draft.era);
    if (draft.year !== year || draft.era !== era) onYearChange(draft.year);
  }, [era, year, onEraChange, onYearChange]);

  const titleBlock = (sizeClass: string) => (
    <BsHeadline
      className={sizeClass}
      bs={
        isGregorianEra ? (
          <>
            <span className="font-num font-semibold text-secondary dark:text-secondary">
              {digits(year)}
            </span>{" "}
            <span>{chipEra}</span>
          </>
        ) : (
          <span className="font-num font-semibold text-secondary dark:text-secondary">
            {vikramHeadline}
          </span>
        )
      }
      bsClassName="min-w-0"
      gregorian={gregorianSubtitle}
      gregorianClassName="text-xs font-semibold text-muted-foreground"
      samvatsara={samvatsaraLabel}
      samvatsaraClassName="font-num font-semibold text-secondary dark:text-secondary"
    />
  );

  const yearStepperRow = (comfortable: boolean) => (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        className={patroMonthNavBtn}
        onClick={() => onYearChange(stepPatroBrowseYear(era, year, "prev"))}
        disabled={!canPrev}
        aria-label={t("patro_date.prev_year")}
      >
        {comfortable ? <Minus size={16} strokeWidth={2.25} /> : <ChevronLeft size={14} strokeWidth={2} />}
      </button>
      <PatroYearPickerPopover
        className={comfortable ? "w-[7.5rem]" : "w-[5.5rem] sm:w-[7rem]"}
        era={era}
        value={year}
        ariaLabel={t("calendar.year_aria")}
        onChange={onYearChange}
        onEraChange={onEraChange}
        displayLanguage={displayLanguage}
        comfortable={comfortable}
      />
      <button
        type="button"
        className={patroMonthNavBtn}
        onClick={() => onYearChange(stepPatroBrowseYear(era, year, "next"))}
        disabled={!canNext}
        aria-label={t("patro_date.next_year")}
      >
        {comfortable ? <Plus size={16} strokeWidth={2.25} /> : <ChevronRight size={14} strokeWidth={2} />}
      </button>
    </div>
  );

  const yearChipMobile = (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        className={patroMobileStepBtn}
        aria-label={t("patro_date.prev_year")}
        onClick={() => onYearChange(stepPatroBrowseYear(era, year, "prev"))}
        disabled={!canPrev}
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>
      <PatroDateChip
        label={vikramHeadline}
        labelCompact={digits(chipYear)}
        ariaLabel={t("calendar.year_aria")}
        onOpen={sheet.openDate}
      />
      <button
        type="button"
        className={patroMobileStepBtn}
        aria-label={t("patro_date.next_year")}
        onClick={() => onYearChange(stepPatroBrowseYear(era, year, "next"))}
        disabled={!canNext}
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </div>
  );

  const navRow = <div className={patroMonthNavShell}>{yearStepperRow(false)}</div>;

  const yearChip = (
    <button
      type="button"
      className={cn(patroMonthChipShell, patroMonthChipButton, "w-[2.85rem] sm:w-[3.75rem]")}
      onClick={jumpToToday}
      aria-label={t("calendar.today_btn")}
      title={t("calendar.today_btn")}
    >
      <div className={patroMonthChipHead}>{chipEra}</div>
      <div className={cn(patroMonthChipDay, "font-num px-0.5 text-[11px] sm:text-sm")}>
        {digits(chipYear)}
      </div>
    </button>
  );

  return (
    <div
      className={cn(
        "w-full flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-1.5 sm:gap-3">
          {yearChip}

          <div className="@container/month-head min-w-0 flex-1">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-0.5 md:hidden">
              <div className="col-start-1 row-start-1 min-w-0">{titleBlock("text-sm")}</div>
              <div className="col-start-1 row-start-2 min-w-0 flex flex-col gap-1">
                {yearChipMobile}
              </div>
              {locationMobile ? (
                <div className="col-start-2 row-start-2 flex shrink-0 items-end justify-end self-start">
                  {locationMobile}
                </div>
              ) : null}
            </div>

            <PatroDateSheet
              sheet={sheet}
              dateTitle={t("calendar.year_aria")}
              location={location}
              onLocationChange={onLocationChange}
              onDateCommit={commitMobileYearDraft}
            >
              <PatroMobileYearSheetDraft
                sheet={sheet}
                era={era}
                year={year}
                yearRange={pickerYearOptions}
                yearAriaLabel={t("calendar.year_aria")}
                onDraftChange={rememberMobileYearDraft}
              />
            </PatroDateSheet>

            <div className="hidden min-w-0 flex-col gap-0.5 sm:gap-1 md:flex">
              {titleBlock("text-xl text-base")}
              {navRow}
            </div>
          </div>
        </div>
        {yearError ? (
          <p className="mt-1 text-xs font-medium text-danger" role="alert">
            {yearError}
          </p>
        ) : null}
      </div>
      {locationDesktop ? (
        <div className="hidden shrink-0 md:flex md:w-auto md:flex-col md:items-end md:pt-0.5">
          {locationDesktop}
        </div>
      ) : null}
    </div>
  );
}
