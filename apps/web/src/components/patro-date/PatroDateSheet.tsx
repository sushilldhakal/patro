import type { ReactNode } from "react";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronDown, MapPin, Minus, Plus } from "lucide-react";
import type { BsNativeSelectOption } from "@/components/BsNativeSelect";
import { LocationSearchPanel } from "@/components/panchanga/LocationSearchPanel";
import {
  displayLocationLabel,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { formatClockParts, parseClockParts } from "@/components/panchanga/use-panchanga-mode";
import { useLocale } from "@/i18n/locale";
import { patroMobilePickerBtn, patroMonthNavBtn } from "@/lib/patro-classes";
import { BsNativeSelect } from "@/components/BsNativeSelect";
import { getBSMonthLength } from "@/lib/bs-calendar";
import { browseYearRangeBounds, windowedBrowseYearSelectOptions } from "@/lib/patro-browse-year-items";
import type { Era } from "@/lib/era";
import { buildAdDayOptions, buildBsDayOptions } from "@/lib/patro-date-options";
import {
  isValidBrowseYear,
  signedPatroYearFromBrowse,
  stepPatroSignedYear,
} from "@/lib/patro-year-axis";
import { cn } from "@/lib/utils";
import { sameLocationParams } from "@/lib/url-state";
import { usePatroDisplayLocale } from "@/hooks/use-patro-display-locale";
import type { PatroDateSheetState } from "./use-patro-date-sheet";
import { PatroYearPickerPopover } from "./PatroYearPickerPopover";
import { isGregorianEraBrowse } from "./patro-month-labels";

/** Month picker for the sheet: 12 buttons, three to a row, no dropdown. */
export function MonthGridPicker({
  month,
  options,
  onMonthChange,
}: {
  month: number;
  options: BsNativeSelectOption[];
  onMonthChange: (month: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group">
      {options.map((option) => {
        const selected = option.value === month;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onMonthChange(option.value)}
            className={cn(
              "min-w-0 truncate rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors",
              // Selection reads in the same colour as the month chip's header
              // and the segmented toggles (bg-secondary), not the saffron
              // accent — the sheet is the chip's own picker.
              selected
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-card text-foreground hover:bg-surface-hover",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Year row for the sheet: the select flanked by step-by-one buttons. */
export function YearStepper({
  year,
  era,
  yearRange,
  ariaLabel,
  onYearChange,
  onBrowseCommit,
  signedBsYears = false,
}: {
  year: number;
  era: Era;
  yearRange: readonly number[];
  ariaLabel: string;
  onYearChange: (year: number) => void;
  onBrowseCommit?: (era: Era, year: number) => void;
  /** Step across BBSE ↔ BS without hitting invalid year 0 */
  signedBsYears?: boolean;
}) {
  const { digits } = usePatroDisplayLocale();
  const { min, max } = browseYearRangeBounds(yearRange);
  const yearOptions = useMemo(
    () => windowedBrowseYearSelectOptions(yearRange, year, era, digits),
    [yearRange, year, era, digits],
  );
  const step = (delta: -1 | 1) =>
    signedBsYears ? stepPatroSignedYear(year, delta) : year + delta;
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        className={patroMonthNavBtn}
        data-vaul-no-drag
        onClick={() => onYearChange(step(-1))}
        disabled={year <= min}
        aria-label={`${ariaLabel} −1`}
      >
        <Minus size={16} strokeWidth={2.25} />
      </button>
      {onBrowseCommit ? (
        <PatroYearPickerPopover
          className="w-[7.5rem]"
          era={era}
          value={year}
          ariaLabel={ariaLabel}
          onChange={onYearChange}
          onBrowseCommit={onBrowseCommit}
          comfortable
        />
      ) : (
        <BsNativeSelect
          className="w-[7.5rem]"
          value={year}
          options={yearOptions}
          ariaLabel={ariaLabel}
          onChange={(y) => {
            if (isValidBrowseYear(era, y)) onYearChange(y);
          }}
          comfortable
        />
      )}
      <button
        type="button"
        className={patroMonthNavBtn}
        data-vaul-no-drag
        onClick={() => onYearChange(step(1))}
        disabled={year >= max}
        aria-label={`${ariaLabel} +1`}
      >
        <Plus size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}

export type PatroMobileDateSheetDraft = {
  era: Era;
  year: number;
  month: number;
  day: number;
  clock?: string;
};

/**
 * Mobile sheet date UI — changes stay local until the sheet Done button commits.
 */
export function PatroMobileDateSheetDraft({
  sheet,
  era,
  year,
  month,
  day,
  yearRange,
  monthOptions,
  yearAriaLabel,
  dayAriaLabel,
  showTime,
  clock,
  hourOptions,
  minuteOptions,
  hourAriaLabel,
  minuteAriaLabel,
  onDraftChange,
}: {
  sheet: PatroDateSheetState;
  era: Era;
  year: number;
  month: number;
  day: number;
  yearRange: readonly number[];
  monthOptions: BsNativeSelectOption[];
  yearAriaLabel: string;
  dayAriaLabel?: string;
  showTime: boolean;
  clock?: string;
  hourOptions: BsNativeSelectOption[];
  minuteOptions: BsNativeSelectOption[];
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  onDraftChange: (draft: PatroMobileDateSheetDraft) => void;
}) {
  const { t } = useTranslation();
  const { digits } = usePatroDisplayLocale();
  const isGregorian = isGregorianEraBrowse(era);

  const [draftEra, setDraftEra] = useState(era);
  const [draftYear, setDraftYear] = useState(year);
  const [draftMonth, setDraftMonth] = useState(month);
  const [draftDay, setDraftDay] = useState(day);
  const [draftClock, setDraftClock] = useState(clock ?? "");

  // Re-seed the draft from the committed value whenever the sheet opens, or
  // the committed value itself moves while it's open — adjusted during
  // render, per React's guidance for state that mirrors props, rather than
  // an effect that would show the stale draft for a frame.
  const [prevSync, setPrevSync] = useState({ open: sheet.open, era, year, month, day, clock });
  if (
    prevSync.open !== sheet.open ||
    prevSync.era !== era ||
    prevSync.year !== year ||
    prevSync.month !== month ||
    prevSync.day !== day ||
    prevSync.clock !== clock
  ) {
    setPrevSync({ open: sheet.open, era, year, month, day, clock });
    if (sheet.open) {
      setDraftEra(era);
      setDraftYear(year);
      setDraftMonth(month);
      setDraftDay(day);
      setDraftClock(clock ?? "");
    }
  }

  const clampDay = useCallback(
    (y: number, m: number, d: number, browseEra: Era) => {
      const max = isGregorian
        ? new Date(y, m, 0).getDate()
        : getBSMonthLength(signedPatroYearFromBrowse(browseEra, y), m);
      return Math.min(Math.max(1, d), max);
    },
    [isGregorian],
  );

  const draftDayOptions = useMemo(() => {
    if (isGregorian) {
      return buildAdDayOptions(draftYear, draftMonth, digits);
    }
    return buildBsDayOptions(
      signedPatroYearFromBrowse(draftEra, draftYear),
      draftMonth,
      digits,
    );
  }, [isGregorian, draftEra, draftYear, draftMonth, digits]);

  const pickBrowseYear = (nextEra: Era, nextYear: number) => {
    setDraftEra(nextEra);
    setDraftYear(nextYear);
    setDraftDay((d) => clampDay(nextYear, draftMonth, d, nextEra));
  };

  const setDraftMonthOnly = (m: number) => {
    setDraftMonth(m);
    setDraftDay((d) => clampDay(draftYear, m, d, draftEra));
  };

  const setDraftYearOnly = (y: number) => {
    setDraftYear(y);
    setDraftDay((d) => clampDay(y, draftMonth, d, draftEra));
  };

  const { hour, minute } = draftClock ? parseClockParts(draftClock) : { hour: 0, minute: 0 };

  useLayoutEffect(() => {
    onDraftChange({
      era: draftEra,
      year: draftYear,
      month: draftMonth,
      day: draftDay,
      clock: showTime ? draftClock : undefined,
    });
  }, [
    draftEra,
    draftYear,
    draftMonth,
    draftDay,
    draftClock,
    showTime,
    onDraftChange,
  ]);

  return (
    <>
      <MonthGridPicker month={draftMonth} options={monthOptions} onMonthChange={setDraftMonthOnly} />
      <YearStepper
        year={draftYear}
        era={draftEra}
        yearRange={yearRange}
        ariaLabel={yearAriaLabel}
        onYearChange={setDraftYearOnly}
        onBrowseCommit={pickBrowseYear}
        signedBsYears={draftEra === "bbs"}
      />
      {dayAriaLabel ? (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">{dayAriaLabel}</span>
          <BsNativeSelect
            className="w-[5rem]"
            value={draftDay}
            options={draftDayOptions}
            ariaLabel={dayAriaLabel}
            onChange={setDraftDay}
            comfortable
          />
        </div>
      ) : null}
      {showTime && hourAriaLabel && minuteAriaLabel ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("common.time")}
          </p>
          <div className="flex w-full items-center justify-center gap-2">
            <BsNativeSelect
              className="w-[4.5rem]"
              value={hour}
              options={hourOptions}
              ariaLabel={hourAriaLabel}
              onChange={(nextHour) =>
                setDraftClock(formatClockParts(nextHour, minute))
              }
              comfortable
            />
            <span className="px-0.5 font-num text-base font-semibold">:</span>
            <BsNativeSelect
              className="w-[4.5rem]"
              value={minute}
              options={minuteOptions}
              ariaLabel={minuteAriaLabel}
              onChange={(nextMinute) =>
                setDraftClock(formatClockParts(hour, nextMinute))
              }
              comfortable
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

export type PatroMobileYearSheetDraft = {
  era: Era;
  year: number;
};

/**
 * Mobile sheet year UI — era/year stay local until the sheet Done button commits.
 */
export function PatroMobileYearSheetDraft({
  sheet,
  era,
  year,
  yearRange,
  yearAriaLabel,
  onDraftChange,
}: {
  sheet: PatroDateSheetState;
  era: Era;
  year: number;
  yearRange: readonly number[];
  yearAriaLabel: string;
  onDraftChange: (draft: PatroMobileYearSheetDraft) => void;
}) {
  const [draftEra, setDraftEra] = useState(era);
  const [draftYear, setDraftYear] = useState(year);

  // Same re-seed-on-open pattern as PatroDateSheetContent above.
  const [prevSync, setPrevSync] = useState({ open: sheet.open, era, year });
  if (prevSync.open !== sheet.open || prevSync.era !== era || prevSync.year !== year) {
    setPrevSync({ open: sheet.open, era, year });
    if (sheet.open) {
      setDraftEra(era);
      setDraftYear(year);
    }
  }

  const pickBrowseYear = (nextEra: Era, nextYear: number) => {
    setDraftEra(nextEra);
    setDraftYear(nextYear);
  };

  useLayoutEffect(() => {
    onDraftChange({ era: draftEra, year: draftYear });
  }, [draftEra, draftYear, onDraftChange]);

  return (
    <YearStepper
      year={draftYear}
      era={draftEra}
      yearRange={yearRange}
      ariaLabel={yearAriaLabel}
      onYearChange={setDraftYear}
      onBrowseCommit={pickBrowseYear}
      signedBsYears={draftEra === "bbs"}
    />
  );
}

/** Chip that opens the sheet on its Location tab — the phone location control. */
export function PatroLocationChip({
  location,
  onOpen,
  className,
}: {
  location: PanchangaLocation;
  onOpen: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  return (
    <button
      type="button"
      className={cn(patroMobilePickerBtn, "max-w-[10rem]", className)}
      onClick={onOpen}
      aria-label={t("location.choose_location")}
    >
      <MapPin className="size-3.5 shrink-0 text-secondary" strokeWidth={2} />
      <span className="min-w-0 truncate">
        {displayLocationLabel(location, undefined, lang).split(",")[0]?.trim()}
      </span>
    </button>
  );
}

/** Chip that opens the sheet on its date tab. */
export function PatroDateChip({
  label,
  labelCompact,
  ariaLabel,
  onOpen,
}: {
  label: string;
  labelCompact: string;
  ariaLabel: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={patroMobilePickerBtn} onClick={onOpen} aria-label={ariaLabel}>
      <CalendarClock
        className="hidden size-3.5 shrink-0 text-secondary md:block"
        strokeWidth={2}
      />
      <span className="min-w-0 font-num md:hidden">{labelCompact}</span>
      <span className="hidden min-w-0 font-num md:inline">{label}</span>
      <ChevronDown className="size-3.5 shrink-0 opacity-50" strokeWidth={2} />
    </button>
  );
}

/**
 * The phone sheet itself. Opened by either chip; `children` is whatever date
 * controls that nav offers, so a year-only nav shows just a year stepper while
 * the month nav shows the month grid too.
 */
export function PatroDateSheet({
  sheet,
  dateTitle,
  location,
  onLocationChange,
  children,
  onDateCommit,
  onLocationCommit,
}: {
  sheet: PatroDateSheetState;
  dateTitle: string;
  location?: PanchangaLocation;
  onLocationChange?: (location: PanchangaLocation) => void;
  children: ReactNode;
  /** Fired when the user taps Done on the date tab (before the drawer closes). */
  onDateCommit?: () => void;
  /** Fired when the user taps Done on the location tab (before the drawer closes). */
  onLocationCommit?: () => void;
}) {
  const { t } = useTranslation();
  const hasLocation = Boolean(location && onLocationChange);
  const onLocationTab = hasLocation && sheet.tab === "location";
  const deferSheetCommits = Boolean(onDateCommit || onLocationCommit);
  const [draftLocation, setDraftLocation] = useState(location);

  // Same re-seed-on-open pattern as PatroDateSheetContent above.
  const [prevSync, setPrevSync] = useState({ open: sheet.open, location });
  if (prevSync.open !== sheet.open || prevSync.location !== location) {
    setPrevSync({ open: sheet.open, location });
    if (sheet.open && location) setDraftLocation(location);
  }

  const applyLocationDraft = () => {
    if (!onLocationChange || !draftLocation || !location) return;
    if (sameLocationParams(draftLocation.params, location.params)) return;
    onLocationChange(draftLocation);
  };

  const locationPanelLocation = deferSheetCommits
    ? (draftLocation ?? location!)
    : location!;
  const locationPanelOnChange = deferSheetCommits
    ? (next: PanchangaLocation) => setDraftLocation(next)
    : onLocationChange!;

  return (
    <Drawer
      open={sheet.open}
      onOpenChange={sheet.setOpen}
      repositionInputs={false}
    >
      <DrawerContent>
        <DrawerHeader className="pb-2 text-center">
          <DrawerTitle className="text-base text-center">
            {onLocationTab ? t("location.choose_location") : dateTitle}
          </DrawerTitle>
        </DrawerHeader>

        {hasLocation ? (
          // Half each, and tall — the location tab is the only way into the
          // picker on a phone, so it has to be obvious rather than discovered.
          <div className="grid grid-cols-2 gap-2 px-4 pb-3" role="tablist">
            {(["date", "location"] as const).map((id) => {
              const selected = sheet.tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`patro-sheet-${id}`}
                  onClick={() => sheet.setTab(id)}
                  className={cn(
                    "h-12 rounded-xl border text-sm font-bold transition-colors",
                    selected
                      ? "border-secondary bg-secondary text-secondary-foreground"
                      : "border-border bg-card text-foreground hover:bg-surface-hover",
                  )}
                >
                  {id === "date" ? dateTitle : t("location.tab")}
                </button>
              );
            })}
          </div>
        ) : null}

        {onLocationTab ? (
          <div id="patro-sheet-location" role="tabpanel" className="px-4 pb-2">
            <LocationSearchPanel
              location={locationPanelLocation}
              onLocationChange={locationPanelOnChange}
              active={sheet.open}
            />
          </div>
        ) : (
          <div id="patro-sheet-date" role="tabpanel" className="flex flex-col gap-4 px-4 pb-2">
            {children}
          </div>
        )}

        <DrawerFooter>
          <DrawerClose asChild>
            <button
              type="button"
              onClick={() => {
                if (onLocationTab) {
                  applyLocationDraft();
                  onLocationCommit?.();
                } else {
                  onDateCommit?.();
                }
              }}
              className="h-10 w-full rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground"
            >
              {t("common.done")}
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
