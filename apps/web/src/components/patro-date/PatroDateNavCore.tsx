import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { BELOW_MD_MQ, useMediaQuery } from "@/hooks/use-media-query";
import {
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  BS_MONTHS_SHORT,
  AD_MONTH_NAMES,
  AD_MONTHS_SHORT,
  adMonthLabel,
  bsMonthLabel,
  isGregorianEraBrowse,
} from "./patro-month-labels";
import type { Era, Language } from "@vedic-patro/domain/era";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { resolveSamvatsaraForPatroYear } from "@/lib/samvatsara";
import { samvatsaraName } from "@/lib/samvatsara-i18n";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { buildPatroBrowseYearOptions } from "@/lib/patro-date-options";
import {
  isValidBrowseYear,
} from "@vedic-patro/domain/patro-year-axis";

import { formatClockParts, parseClockParts } from "@/components/panchanga/use-panchanga-mode";
import { BsHeadline } from "@/components/BsHeadline";
import { BsNativeSelect, type BsNativeSelectOption } from "@/components/BsNativeSelect";
import { BsDateTimePicker } from "@/components/panchanga/BsDateTimePicker";
import {
  MonthGridPicker,
  PatroDateChip,
  PatroDateSheet,
  PatroLocationChip,
  PatroMobileDateSheetDraft,
  type PatroMobileDateSheetDraft as MobileSheetDraft,
  YearStepper,
} from "./PatroDateSheet";
import { PatroYearEraToggle } from "./PatroYearEraToggle";
import { patroEraShortLabel } from "./patro-era-short-label";
import { windowedBrowseYearSelectOptions } from "@/lib/patro-browse-year-items";
import { monthLengthInBrowseEra } from "@/lib/patro-browse-range";
import { PatroYearCombobox } from "./PatroYearCombobox";
import { PatroYearPickerPopover } from "./PatroYearPickerPopover";
import { usePatroDateSheet } from "./use-patro-date-sheet";
export type { PatroSheetTab } from "./use-patro-date-sheet";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  patroMonthChipButton,
  patroMonthChipDay,
  patroMonthChipHead,
  patroMonthChipSpan,
  patroMonthChipShell,
  patroMonthNavShell,
  patroMonthNavBtn,
  patroMonthRangeCompactBtn,
  patroMobilePickerBtn,
  patroMobileStepBtn,
} from "@/lib/patro-classes";

export type PatroDateNavCoreProps = {
  era: Era;
  /** Resolved Vikram era from the API — headline/samvatsara/year picker (not URL display alone). */
  vikramEra?: Era;
  year: number;
  month: number;
  /** Backend-rendered cross-era line under the headline (optional). */
  crossEraSubtitle?: string | null;
  todayAd?: string;
  onToday: () => void;
  todayAriaLabel: string;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  monthAriaLabel: string;
  yearAriaLabel: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  prevAriaLabel: string;
  nextAriaLabel: string;
  panchangaSubtitle?: string;
  day?: number;
  dayOptions?: BsNativeSelectOption[];
  onDayChange?: (day: number) => void;
  dayAriaLabel?: string;
  /** Combined year+month+day setter — enables the calendar popover date picker. */
  onSelectDate?: (year: number, month: number, day: number) => void;
  clock?: string;
  onClockChange?: (clock: string) => void;
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  /** Below md: hide inline nav and open date (and time when set) in a bottom sheet. */
  mobileDateTimeDrawer?: boolean;
  /** Below md: top-right on row 1 (toggle on home, location on panchanga). */
  mobileToolbar?: ReactNode;
  /** Below md: bottom-right on row 2 (location on home, under toggle). */
  mobileToolbarLower?: ReactNode;
  /** Given both, the mobile sheet grows a Location tab beside the date one. */
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  /** Share URL `language` — Nepali digits/labels when `ne`. */
  displayLanguage?: Language;
  /** Switch BS↔BBS or AD↔BC from the year dropdown (URL-backed pages). */
  onEraChange?: (era: Era) => void;
  /** Era + year applied together when the year popover commits (draft era toggle). */
  onBrowseCommit?: (era: Era, year: number) => void;
  /** Single commit for calendar popover / sheet — avoids era then date double-navigate. */
  onCommitBrowseDay?: (era: Era, year: number, month: number, day: number) => void;
}

function chipMonthLabel(month: number, lang: string, era: Era): string {
  if (isGregorianEraBrowse(era)) {
    return AD_MONTHS_SHORT[month - 1].toUpperCase();
  }
  if (lang === "en") {
    // Not a slice — that maps Ashadh and Ashwin onto the same "ASH".
    return BS_MONTHS_SHORT[month - 1].toUpperCase();
  }
  return BS_MONTHS_NE[month - 1];
}

/**
 * Day span for the month chip when no single day is selected (month browse).
 * Uses the real month length for the active era (BS months are 29–32 days).
 */
function monthChipSpan(
  era: Era,
  year: number,
  month: number,
  digits: (value: number) => string,
): string {
  const length = monthLengthInBrowseEra(era, year, month);
  return `${digits(1)}-${digits(length)}`;
}

type NavControlsProps = {
  day?: number;
  dayOptions?: BsNativeSelectOption[];
  onDayChange?: (day: number) => void;
  dayAriaLabel?: string;
  month: number;
  monthOptions: BsNativeSelectOption[];
  monthAriaLabel: string;
  onMonthChange: (month: number) => void;
  year: number;
  yearEra?: Era;
  yearRange?: readonly number[];
  yearDisplayLanguage?: Language;
  yearAriaLabel: string;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  onBrowseCommit?: (era: Era, year: number) => void;
  hour: number;
  minute: number;
  hourOptions: BsNativeSelectOption[];
  minuteOptions: BsNativeSelectOption[];
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  onClockPart: (hour: number, minute: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  prevAriaLabel: string;
  nextAriaLabel: string;
  showTime: boolean;
  /** comfortable widths inside the mobile drawer */
  spacious?: boolean;
  /** hide prev/next when the sheet already has outer step buttons */
  hideNavArrows?: boolean;
};

function MonthNavControls({
  day,
  dayOptions,
  onDayChange,
  dayAriaLabel,
  month,
  monthOptions,
  monthAriaLabel,
  onMonthChange,
  year,
  yearEra,
  yearRange,
  yearDisplayLanguage,
  yearAriaLabel,
  onYearChange,
  onEraChange,
  onBrowseCommit,
  hour,
  minute,
  hourOptions,
  minuteOptions,
  hourAriaLabel,
  minuteAriaLabel,
  onClockPart,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevAriaLabel,
  nextAriaLabel,
  showTime,
  spacious = false,
  hideNavArrows = false,
}: NavControlsProps) {
  const dayW = spacious ? "w-[4rem]" : "w-[2.75rem] sm:w-[3.5rem]";
  // Below sm these were too narrow for their own contents — "Sep" and "2026"
  // both ellipsised. Wide enough for a three-letter month and a four-digit year
  // plus the chevron; there is spare room in the row at 360px.
  const monthW = spacious ? "w-[6.5rem]" : "w-[3.75rem] sm:w-[5.25rem]";
  const yearW = spacious ? "w-[6.5rem]" : "w-[4.5rem] sm:w-[5.25rem]";
  const timeW = spacious ? "w-[4rem]" : "w-[2.75rem] sm:w-[3.5rem]";
  const btnClass = spacious ? patroMonthNavBtn : patroMonthRangeCompactBtn;
  const hasDayPicker = Boolean(dayOptions && onDayChange && dayAriaLabel);
  const browseEra = yearEra ?? "bs";
  const { digits: yearDigits } = usePatroDisplayLocale(yearDisplayLanguage);
  const yearSelectOptions = useMemo(() => {
    if (!yearRange?.length) return [];
    return windowedBrowseYearSelectOptions(yearRange, year, browseEra, yearDigits);
  }, [yearRange, year, browseEra, yearDigits]);
  const useNativeYearSelect = yearRange != null && yearRange.length > 0;
  const eraInYearDropdown = Boolean(onBrowseCommit && useNativeYearSelect);

  return (
    <>
      {!hideNavArrows ? (
        <button
          type="button"
          className={btnClass}
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label={prevAriaLabel}
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
      ) : null}

      {dayOptions && onDayChange && dayAriaLabel ? (
        <BsNativeSelect
          className={dayW}
          value={day ?? dayOptions[0]?.value ?? 1}
          options={dayOptions}
          ariaLabel={dayAriaLabel}
          onChange={onDayChange}
          comfortable={spacious}
        />
      ) : null}

      <BsNativeSelect
        className={monthW}
        value={month}
        options={monthOptions}
        ariaLabel={monthAriaLabel}
        onChange={onMonthChange}
        comfortable={spacious}
      />

      {eraInYearDropdown ? (
        <PatroYearPickerPopover
          className={yearW}
          era={browseEra}
          value={year}
          displayLanguage={yearDisplayLanguage}
          onChange={onYearChange}
          onBrowseCommit={onBrowseCommit}
          ariaLabel={yearAriaLabel}
          comfortable={spacious}
        />
      ) : useNativeYearSelect ? (
        <BsNativeSelect
          className={yearW}
          value={year}
          options={yearSelectOptions}
          ariaLabel={yearAriaLabel}
          onChange={(y) => {
            if (isValidBrowseYear(browseEra, y)) onYearChange(y);
          }}
          comfortable={spacious}
        />
      ) : (
        <PatroYearCombobox
          className={yearW}
          era={browseEra}
          value={year}
          displayLanguage={yearDisplayLanguage}
          onChange={onYearChange}
          ariaLabel={yearAriaLabel}
          comfortable={spacious}
        />
      )}
      {yearEra && onEraChange && hasDayPicker && !onBrowseCommit ? (
        <PatroYearEraToggle
          era={yearEra}
          onEraChange={onEraChange}
          compact
          comfortable={spacious}
        />
      ) : null}

      {showTime && hourAriaLabel && minuteAriaLabel ? (
        <>
          <BsNativeSelect
            className={timeW}
            value={hour}
            options={hourOptions}
            ariaLabel={hourAriaLabel}
            onChange={(nextHour) => onClockPart(nextHour, minute)}
            comfortable={spacious}
          />
          <BsNativeSelect
            className={timeW}
            value={minute}
            options={minuteOptions}
            ariaLabel={minuteAriaLabel}
            onChange={(nextMinute) => onClockPart(hour, nextMinute)}
            comfortable={spacious}
          />
        </>
      ) : null}

      {!hideNavArrows ? (
        <button
          type="button"
          className={btnClass}
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={nextAriaLabel}
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      ) : null}
    </>
  );
}

export function PatroDateNavCore({
  era,
  vikramEra,
  year,
  month,
  crossEraSubtitle,
  todayAd,
  onToday,
  todayAriaLabel,
  onMonthChange,
  onYearChange,
  monthAriaLabel,
  yearAriaLabel,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  prevAriaLabel,
  nextAriaLabel,
  panchangaSubtitle,
  day,
  dayOptions,
  onDayChange,
  dayAriaLabel,
  onSelectDate,
  clock,
  onClockChange,
  hourAriaLabel,
  minuteAriaLabel,
  mobileDateTimeDrawer = false,
  mobileToolbar,
  mobileToolbarLower,
  location,
  onLocationChange,
  displayLanguage,
  onEraChange,
  onBrowseCommit,
  onCommitBrowseDay,
}: PatroDateNavCoreProps) {
  const sheet = usePatroDateSheet();
  const isMobileDateNav = useMediaQuery(BELOW_MD_MQ);
  const { lang, digits } = usePatroDisplayLocale(displayLanguage);
  const { t } = useTranslation();
  const isGregorian = isGregorianEraBrowse(era);
  const headlineEra = vikramEra ?? era;
  const pickerYearOptions = useMemo(() => {
    const browseEra = era;
    const base = buildPatroBrowseYearOptions(browseEra);
    const filtered = base.filter((y) => Number.isFinite(y) && y >= 1);
    if (
      Number.isFinite(year) &&
      year >= 1 &&
      isValidBrowseYear(browseEra, year) &&
      !filtered.includes(year)
    ) {
      return [...filtered, year].sort((a, b) => a - b);
    }
    return filtered;
  }, [era, year]);

  const monthTitle = isGregorian
    ? adMonthLabel(month, lang)
    : bsMonthLabel(month, lang);
  /**
   * Phone heading: "SEP 2026" rather than "September 2026". Only the romanized
   * names run long — Devanagari is already compact, so Nepali keeps the full
   * name. The grid repeats the month beside day 1 either way.
   */
  const monthTitleShort =
    lang === "en"
      ? (isGregorian ? AD_MONTHS_SHORT[month - 1] : BS_MONTHS_SHORT[month - 1]).toUpperCase()
      : monthTitle;
  const samvatsara = isGregorian ? undefined : resolveSamvatsaraForPatroYear(headlineEra, year);
  const samvatsaraLabel = samvatsara ? samvatsaraName(samvatsara, lang) : undefined;
  // Always day → month → year (e.g. "२५ जुलाई २०२६" / "25 Jul 2026"). Relying on
  // toLocaleDateString's own ordering put ne-NP as year-month-day, which reads
  // backwards; build the parts explicitly instead.
  // `ne-NP` has no abbreviated month forms in ICU — toLocaleDateString(…,
  // { month: "short" }) hands back the full "सेप्टेम्बर", which is what made the
  // Nepali header wide. Use our own short list so both languages abbreviate.
  // Cross-era subtitles under Vikram headings come from the API on browse pages.
  // Month-only views: chip shows the browsed month (day 1). Day views keep today
  // in the chip because it doubles as the jump-to-today control.
  const chipDay = day ?? 1;
  const chipMonth = month;
  // The closed month control is the widest thing in the phone date sheet, so it
  // shows a three-letter form there; the option list keeps the full name.
  // English only — Devanagari month names already fit.
  const monthOptions = (isGregorian ? AD_MONTH_NAMES : BS_MONTH_NAMES).map((_: string, i: number) => ({
    value: i + 1,
    label: isGregorian ? adMonthLabel(i + 1, lang) : bsMonthLabel(i + 1, lang),
    shortLabel:
      lang === "en" ? (isGregorian ? AD_MONTHS_SHORT[i] : BS_MONTHS_SHORT[i]) : undefined,
  }));
  const { hour, minute } = clock ? parseClockParts(clock) : { hour: 0, minute: 0 };
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: toNepaliDigits(String(i).padStart(2, "0")),
  }));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: toNepaliDigits(String(i).padStart(2, "0")),
  }));
  const showTime = Boolean(clock && onClockChange && hourAriaLabel && minuteAriaLabel);

  const setClockPart = (nextHour: number, nextMinute: number) => {
    onClockChange?.(formatClockParts(nextHour, nextMinute));
  };

  const navProps: NavControlsProps = {
    day,
    dayOptions,
    onDayChange,
    dayAriaLabel,
    month,
    monthOptions,
    monthAriaLabel,
    onMonthChange,
    year,
    yearEra: era,
    yearRange: pickerYearOptions,
    yearDisplayLanguage: displayLanguage,
    yearAriaLabel,
    onYearChange,
    onEraChange,
    onBrowseCommit,
    hour,
    minute,
    hourOptions,
    minuteOptions,
    hourAriaLabel,
    minuteAriaLabel,
    onClockPart: setClockPart,
    onPrev,
    onNext,
    prevDisabled,
    nextDisabled,
    prevAriaLabel,
    nextAriaLabel,
    showTime,
  };

  const clockSummary = showTime
    ? `${toNepaliDigits(String(hour).padStart(2, "0"))}:${toNepaliDigits(String(minute).padStart(2, "0"))}`
    : null;
  /** Picker chip: month-only views show the month (year is in the title row). */
  const mobilePickerLabel =
    day != null
      ? clockSummary
        ? `${digits(day)} ${monthTitle} · ${clockSummary}`
        : `${digits(day)} ${monthTitle}`
      : monthTitleShort;
  /**
   * Below md (<768px): day view drops the month token (title row shows it);
   * month view drops the year for the same reason. The chip always names the
   * month it is currently on — it is the control's value, not a caption.
   */
  const mobilePickerLabelCompact =
    day != null
      ? `${digits(day)}${clockSummary ? ` · ${clockSummary}` : ""}`
      : monthTitleShort;

  // Day views (panchanga) get a proper calendar + 12h time popover; month
  // views (home) keep the select-based nav / bottom sheet.
  const useCalendarPicker = day != null;
  const selectDate =
    onSelectDate ??
    ((y: number, m: number, d: number) => {
      if (y !== year) onYearChange(y);
      else if (m !== month) onMonthChange(m);
      else onDayChange?.(d);
    });

  const calendarControl = (stepCls: string) => (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        className={stepCls}
        onClick={onPrev}
        disabled={prevDisabled}
        aria-label={prevAriaLabel}
      >
        <ChevronLeft size={15} strokeWidth={2} />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={patroMobilePickerBtn}
            aria-label={
              showTime
                ? t("patro_date.change_date_time")
                : t("patro_date.change_date")
            }
          >
            <CalendarClock className="hidden size-3.5 shrink-0 text-secondary md:block" strokeWidth={2} />
            <span className="min-w-0 font-num md:hidden">{mobilePickerLabelCompact}</span>
            <span className="hidden min-w-0 font-num md:inline">{mobilePickerLabel}</span>
            <ChevronDown className="size-3.5 shrink-0 opacity-50" strokeWidth={2} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[19rem]">
          <BsDateTimePicker
            gridEra={isGregorian ? "ad" : "bs"}
            displayEra={era}
            onEraChange={onEraChange}
            onCommitBrowseDay={onCommitBrowseDay}
            year={year}
            month={month}
            day={day ?? 1}
            yearOptions={pickerYearOptions}
            todayAd={todayAd}
            onSelectDate={selectDate}
            monthAriaLabel={monthAriaLabel}
            yearAriaLabel={yearAriaLabel}
            clock={clock}
            onClockChange={onClockChange}
            hourAriaLabel={hourAriaLabel}
            minuteAriaLabel={minuteAriaLabel}
            showTime={showTime}
            locationParams={location?.params}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        className={stepCls}
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={nextAriaLabel}
      >
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </div>
  );

  /**
   * The cross-calendar reference under the heading. `short` abbreviates the
   * romanized BS names ("Ash–Shr") for the phone header, where the full pair
   * plus a year is the widest thing in the top bar. The AD side is already
   * abbreviated in both languages, so it does not vary.
   */
  const subtitleLine = crossEraSubtitle ?? undefined;
  const subtitleLineShort = crossEraSubtitle ?? undefined;

  // Year in the headline — month name lives on the left chip only (avoids
  // repeating e.g. साउन + साउन वि.सं. २०८३).
  const yearHeadline = isGregorian ? (
    <span className="font-num font-semibold text-secondary dark:text-secondary">
      {digits(year)}
    </span>
  ) : (
    <span className="font-num font-semibold text-secondary dark:text-secondary">
      {digits(year)} {patroEraShortLabel(headlineEra, t)}
    </span>
  );

  const mobileTitleBlock = (
    <BsHeadline
      className="text-sm"
      bs={yearHeadline}
      bsClassName="min-w-0"
      samvatsara={samvatsaraLabel}
      samvatsaraClassName="font-num font-semibold text-secondary dark:text-secondary"
      gregorian={subtitleLineShort}
      gregorianClassName="text-xs font-semibold text-muted-foreground"
    />
  );

  const titleBlock = (
    <BsHeadline
      className="text-xl text-base"
      bs={yearHeadline}
      bsClassName="min-w-0"
      samvatsara={samvatsaraLabel}
      samvatsaraClassName="font-num font-semibold text-secondary dark:text-secondary"
      gregorian={subtitleLine}
      gregorianClassName="text-xs font-semibold text-muted-foreground"
    />
  );

  const dateTitle = showTime ? t("patro_date.date_time") : t("patro_date.month_year");

  // Every nav gets the same phone location control: a chip in the lower slot
  // that opens this sheet on its Location tab.
  const resolvedToolbarLower =
    mobileToolbarLower ??
    (location && onLocationChange ? (
      <PatroLocationChip location={location} onOpen={sheet.openLocation} />
    ) : null);

  const dateChip = mobileDateTimeDrawer ? (
    <PatroDateChip
        label={mobilePickerLabel}
        labelCompact={mobilePickerLabelCompact}
        ariaLabel={showTime ? t("patro_date.change_date_time") : t("patro_date.change_date")}
      onOpen={sheet.openDate}
    />
  ) : null;

  const mobileSheetDraftRef = useRef<MobileSheetDraft | null>(null);
  const rememberMobileSheetDraft = useCallback((draft: MobileSheetDraft) => {
    mobileSheetDraftRef.current = draft;
  }, []);

  const commitMobileSheetDraft = useCallback(() => {
    const draft = mobileSheetDraftRef.current;
    if (!draft) return;
    const eraChanged = draft.era !== era;
    const dateChanged =
      draft.year !== year ||
      draft.month !== month ||
      draft.day !== (day ?? 1);
    const clockChanged = showTime && draft.clock != null && draft.clock !== (clock ?? "");

    if (eraChanged || dateChanged) {
      if (onCommitBrowseDay) {
        onCommitBrowseDay(draft.era, draft.year, draft.month, draft.day);
      } else {
        if (dateChanged) {
          if (onSelectDate) {
            onSelectDate(draft.year, draft.month, draft.day);
          } else {
            // Month/day before era/year: parent month handlers read year from hook
            // state that is still stale in this tick; committing year first makes
            // setYearMonth(staleYear, newMonth) undo the year change.
            if (draft.month !== month) onMonthChange(draft.month);
            if (day != null && draft.day !== day) onDayChange?.(draft.day);
            if (draft.era !== era || draft.year !== year) {
              if (onBrowseCommit) {
                onBrowseCommit(draft.era, draft.year);
              } else {
                if (eraChanged && onEraChange) onEraChange(draft.era);
                if (draft.year !== year) onYearChange(draft.year);
              }
            }
          }
        } else if (draft.era !== era || draft.year !== year) {
          if (onBrowseCommit) {
            onBrowseCommit(draft.era, draft.year);
          } else if (eraChanged && onEraChange) {
            onEraChange(draft.era);
          }
        } else if (eraChanged && onEraChange) {
          onEraChange(draft.era);
        }
      }
    }
    if (clockChanged && draft.clock) {
      onClockChange?.(draft.clock);
    }
  }, [
    era,
    year,
    month,
    day,
    clock,
    showTime,
    onEraChange,
    onBrowseCommit,
    onCommitBrowseDay,
    onSelectDate,
    onYearChange,
    onMonthChange,
    onDayChange,
    onClockChange,
  ]);

  // Mounted whenever there is a sheet to open — day views drive dates from the
  // calendar popover, but their location chip still opens this.
  const sheetBlock =
    isMobileDateNav && (mobileDateTimeDrawer || resolvedToolbarLower) ? (
      <PatroDateSheet
        sheet={sheet}
        dateTitle={dateTitle}
        location={location}
        onLocationChange={onLocationChange}
        onDateCommit={mobileDateTimeDrawer ? commitMobileSheetDraft : undefined}
      >
        {mobileDateTimeDrawer ? (
          <PatroMobileDateSheetDraft
            sheet={sheet}
            era={era}
            year={year}
            month={month}
            day={day ?? 1}
            yearRange={pickerYearOptions}
            monthOptions={monthOptions}
            yearAriaLabel={yearAriaLabel}
            dayAriaLabel={dayAriaLabel}
            showTime={showTime}
            clock={clock}
            hourOptions={hourOptions}
            minuteOptions={minuteOptions}
            hourAriaLabel={hourAriaLabel}
            minuteAriaLabel={minuteAriaLabel}
            onDraftChange={rememberMobileSheetDraft}
          />
        ) : (
          <>
            <MonthGridPicker month={month} options={monthOptions} onMonthChange={onMonthChange} />
            <YearStepper
              year={year}
              era={era}
              yearRange={pickerYearOptions}
              ariaLabel={yearAriaLabel}
              onYearChange={onYearChange}
              onBrowseCommit={onBrowseCommit}
              signedBsYears={era === "bbs"}
            />
            {dayOptions && onDayChange && dayAriaLabel ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">{dayAriaLabel}</span>
                <BsNativeSelect
                  className="w-[5rem]"
                  value={day ?? dayOptions[0]?.value ?? 1}
                  options={dayOptions}
                  ariaLabel={dayAriaLabel}
                  onChange={onDayChange}
                  comfortable
                />
              </div>
            ) : null}
            {showTime && hourAriaLabel && minuteAriaLabel ? (
              <div>
                <p className="mb-2 text-xs text-center font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("common.time")}
                </p>
                <div className="flex w-full items-center justify-center gap-2">
                  <BsNativeSelect
                    className="w-[4.5rem]"
                    value={hour}
                    options={hourOptions}
                    ariaLabel={hourAriaLabel}
                    onChange={(nextHour) => setClockPart(nextHour, minute)}
                    comfortable
                  />
                  <span className="px-0.5 font-num text-base font-semibold">:</span>
                  <BsNativeSelect
                    className="w-[4.5rem]"
                    value={minute}
                    options={minuteOptions}
                    ariaLabel={minuteAriaLabel}
                    onChange={(nextMinute) => setClockPart(hour, nextMinute)}
                    comfortable
                  />
                </div>
              </div>
            ) : null}
          </>
        )}
      </PatroDateSheet>
    ) : null;

  return (
    <div className="flex min-w-0 items-start gap-1.5 sm:gap-3">
      {sheetBlock}
      <button
        type="button"
        className={cn(patroMonthChipShell, patroMonthChipButton, "self-center")}
        onClick={onToday}
        aria-label={todayAriaLabel}
        title={todayAriaLabel}
      >
        <div className={patroMonthChipHead}>{chipMonthLabel(chipMonth, lang, era)}</div>
        {day != null ? (
          <div className={patroMonthChipDay}>{digits(chipDay)}</div>
        ) : (
          <div className={patroMonthChipSpan}>
            {monthChipSpan(era, year, chipMonth, digits)}
          </div>
        )}
      </button>

      <div className="@container/month-head min-w-0 flex-1">
        {/* Mobile only (<768px): row1 title|toolbar, row2 picker|toolbarLower */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1.5 md:hidden">
          {/* Each row is at least one 30px control tall and centres its cells, so the
              toolbar's height never decides where the date row sits (this used to
              be hidden with a negative margin on the date row). */}
          <div className="col-start-1 row-start-1 flex min-h-[30px] min-w-0 items-end"><div className="-mb-1 min-w-0">{mobileTitleBlock}</div></div>
          {mobileToolbar ? (
            // Every phone toolbar is pinned to the same 30px as the date,
            // location and step chips — each page passes its own control
            // (mode toggle, day cycle, paksha), and left to themselves they
            // came out 30/32/34px, so the top row never lined up.
            <div className="col-start-2 row-start-1 flex h-[30px] shrink-0 items-center justify-end [&>*]:h-full">
              {mobileToolbar}
            </div>
          ) : null}
          <div className="col-start-1 row-start-2 flex min-w-0 flex-col gap-1">
            {mobileDateTimeDrawer ? (
              // Below md every nav opens the same sheet, day views included —
              // the calendar popover stays for md+ only. Prev/next arrows flank
              // it so the day can be stepped without opening the sheet.
              <div className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  className={patroMobileStepBtn}
                  onClick={onPrev}
                  disabled={prevDisabled}
                  aria-label={prevAriaLabel}
                >
                  <ChevronLeft size={15} strokeWidth={2} />
                </button>
                {dateChip}
                <button
                  type="button"
                  className={patroMobileStepBtn}
                  onClick={onNext}
                  disabled={nextDisabled}
                  aria-label={nextAriaLabel}
                >
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            ) : useCalendarPicker ? (
              calendarControl(patroMobileStepBtn)
            ) : (
              <div className={patroMonthNavShell}>
                <MonthNavControls {...navProps} />
              </div>
            )}
            {panchangaSubtitle ? (
              <p className="m-0 text-sm text-base leading-none">{panchangaSubtitle}</p>
            ) : null}
          </div>
          {resolvedToolbarLower ? (
            <div className="col-start-2 row-start-2 flex shrink-0 items-end justify-end self-start">
              {resolvedToolbarLower}
            </div>
          ) : null}
        </div>

        {/* Desktop (md+): title, then nav row — same as before mobile drawer work */}
        <div className="hidden min-w-0 flex-col gap-0.5 sm:gap-1 md:flex">
          {titleBlock}
          {useCalendarPicker ? (
            <div className={patroMonthNavShell}>{calendarControl(patroMonthRangeCompactBtn)}</div>
          ) : (
            <div className={patroMonthNavShell}>
              <MonthNavControls {...navProps} />
            </div>
          )}
          {panchangaSubtitle ? (
            <p className="m-0 text-sm text-base leading-none">{panchangaSubtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
