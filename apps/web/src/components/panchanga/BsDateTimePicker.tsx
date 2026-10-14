import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LocationParams } from "@/lib/api";
import { useBsDateTimePicker } from "@vedic-patro/features/panchanga";
import { PatroYearPickerPopover } from "@/components/patro-date/PatroYearPickerPopover";
import { cn } from "@vedic-patro/domain/utils";
import { BsNativeSelect } from "@/components/BsNativeSelect";
import { PopoverClose } from "@/components/ui/popover";
import type { Era } from "@vedic-patro/domain/era";

interface Props {
  year: number;
  month: number;
  day: number;
  yearOptions: number[];
  todayAd?: string;
  /** Committed only when the user presses Done — no live refetch while browsing. */
  onSelectDate: (year: number, month: number, day: number) => void;
  monthAriaLabel: string;
  yearAriaLabel: string;
  clock?: string;
  onClockChange?: (clock: string) => void;
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  showTime: boolean;
  gridEra?: "bs" | "bbs" | "ad";
  displayEra?: Era;
  onEraChange?: (era: Era) => void;
  /** Observer for BBS month grids (no offline `bsToAD`). */
  locationParams?: LocationParams;
  /** One shot commit (era + y/m/d) — avoids display-era race with separate date commit. */
  onCommitBrowseDay?: (era: Era, year: number, month: number, day: number) => void;
  /** Called after Done commits (e.g. close a dialog outside a popover). */
  afterCommit?: () => void;
  /** Single Done handler — date, era, and time in one shot (fullscreen wheel dialog). */
  onCommitDateTime?: (era: Era, year: number, month: number, day: number, clock: string) => void;
  /** Opaque styling when rendered over the wheel dialog (default theme is too transparent). */
  solidSurface?: boolean;
  className?: string;
}

export function BsDateTimePicker({
  year,
  month,
  day,
  yearOptions,
  todayAd,
  onSelectDate,
  monthAriaLabel,
  yearAriaLabel,
  clock,
  onClockChange,
  hourAriaLabel,
  minuteAriaLabel,
  showTime,
  gridEra = "bs",
  displayEra,
  onEraChange,
  onCommitBrowseDay,
  locationParams,
  afterCommit,
  onCommitDateTime,
  solidSurface = false,
  className,
}: Props) {
  const picker = useBsDateTimePicker({
    year,
    month,
    day,
    yearOptions,
    todayAd,
    onSelectDate,
    clock,
    onClockChange,
    showTime,
    gridEra,
    displayEra,
    onEraChange,
    locationParams,
    onCommitBrowseDay,
    afterCommit,
    onCommitDateTime,
  });
  const { draft, time, copy } = picker;

  const stepBtn = cn(
    "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-40",
    solidSurface
      ? "border-ill-teal30 bg-ill-teal19 text-ill-wheel-ink hover:bg-ill-teal24"
      : "border-border bg-card text-foreground hover:bg-surface-hover",
  );
  const gridShell = cn(
    "overflow-hidden rounded-xl border shadow-sm",
    solidSurface ? "border-ill-teal30 bg-ill-teal15b" : "border-border bg-card",
  );
  const gridHead = cn(
    "grid grid-cols-7 border-b",
    solidSurface ? "border-ill-teal30 bg-ill-wheel-sky0" : "border-border bg-muted/30",
  );
  const gridPad = solidSurface ? "border-ill-teal30 bg-ill-wheel-sky0" : "border-border bg-muted/10";
  const dayHover = solidSurface ? "hover:bg-ill-teal24" : "hover:bg-surface-hover";
  const footerBtn = cn(
    "h-8 flex-1 rounded-md border text-sm font-semibold transition-colors",
    solidSurface
      ? "border-ill-teal30 bg-ill-teal19 text-ill-wheel-ink hover:bg-ill-teal24"
      : "border-border bg-card text-foreground hover:bg-surface-hover",
  );

  return (
    <div className={cn("mx-auto flex w-full max-w-[22.5rem] flex-col gap-2.5", className)}>
      {/* Month / year / era — one row */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={picker.prev.go}
          disabled={picker.prev.disabled}
          aria-label={picker.prev.label}
          className={stepBtn}
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </button>
        <BsNativeSelect
          className="min-w-0 flex-1"
          value={draft.month}
          options={picker.monthOptions}
          ariaLabel={monthAriaLabel}
          onChange={picker.setMonth}
        />
        {picker.isAd ? (
          <BsNativeSelect
            className="w-[4.25rem] shrink-0"
            value={draft.year}
            options={picker.yearOptions}
            ariaLabel={yearAriaLabel}
            onChange={picker.setYear}
          />
        ) : (
          <PatroYearPickerPopover
            className="w-[5.5rem] shrink-0 h-7"
            era={picker.browseEra}
            value={draft.year}
            ariaLabel={yearAriaLabel}
            comfortable
            onChange={picker.setYear}
            onBrowseCommit={picker.pickBrowseYear}
          />
        )}
        <button
          type="button"
          onClick={picker.next.go}
          disabled={picker.next.disabled}
          aria-label={picker.next.label}
          className={stepBtn}
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className={gridShell}>
        {picker.gridLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            {copy.loading}
          </div>
        ) : (
          <>
        <div className={gridHead}>
          {picker.weekdays.map((wd) => (
            <div
              key={wd.label}
              className={cn(
                "flex h-6 items-center justify-center border-r text-sm font-semibold uppercase tracking-tight last:border-r-0",
                solidSurface ? "border-ill-teal30" : "border-border",
                wd.weekend && "text-danger/80",
              )}
            >
              {wd.label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {picker.cells.map((c) =>
            c.day == null ? (
              <div key={c.key} aria-hidden className={cn("h-8 border-b border-r", gridPad)} />
            ) : (
              <button
                key={c.key}
                type="button"
                onClick={c.pick}
                aria-label={c.label}
                aria-pressed={c.selected}
                className={cn(
                  "font-num flex h-8 items-center justify-center border-b border-r text-sm font-semibold tabular-nums transition-colors",
                  solidSurface ? "border-ill-teal30" : "border-border",
                  !c.selected && dayHover,
                  !c.selected && c.weekend && "text-danger",
                  !c.selected && !c.weekend && (solidSurface ? "text-ill-wheel-ink" : "text-foreground"),
                  c.today && !c.selected && "ring-1 ring-inset ring-secondary",
                  c.selected && "bg-secondary text-secondary-foreground",
                )}
              >
                {c.label}
              </button>
            ),
          )}
        </div>
          </>
        )}
      </div>

      {/* Time picker — 12 hour with AM/PM */}
      {showTime && hourAriaLabel && minuteAriaLabel ? (
        <div className={cn("flex flex-col gap-1.5 border-t pt-2.5", solidSurface ? "border-ill-teal30" : "border-border")}>
          <span className="text-sm font-semibold uppercase tracking-eyebrow-wide">
            {copy.time}
          </span>
          <div className="flex items-center gap-1.5">
            <BsNativeSelect
              className="w-[3.5rem]"
              value={time.hour12}
              options={time.hourOptions}
              ariaLabel={hourAriaLabel}
              onChange={time.setHour}
            />
            <span className="font-num text-sm font-semibold">:</span>
            <BsNativeSelect
              className="w-[3.5rem]"
              value={time.minute}
              options={time.minuteOptions}
              ariaLabel={minuteAriaLabel}
              onChange={time.setMinute}
            />
            <div
              className={cn(
                "ml-auto inline-flex overflow-hidden rounded-md border",
                solidSurface ? "border-ill-teal30" : "border-border",
              )}
            >
              {time.meridiems.map((mer) => (
                <button
                  key={mer.id}
                  type="button"
                  onClick={() => time.setMeridiem(mer.id)}
                  aria-pressed={mer.active}
                  className={cn(
                    "px-2.5 py-1 text-sm font-bold transition-colors",
                    mer.active
                      ? "bg-secondary text-secondary-foreground"
                      : solidSurface
                        ? "bg-ill-teal19 text-ill-wheel-ink hover:bg-ill-teal24"
                        : "bg-card text-foreground hover:bg-surface-hover",
                  )}
                >
                  {mer.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer — Today stages the draft; Done commits and refetches. */}
      <div className={cn("flex items-center gap-2 border-t pt-2.5", solidSurface ? "border-ill-teal30" : "border-border")}>
        <button
          type="button"
          onClick={picker.goToday}
          className={footerBtn}
        >
          {copy.today}
        </button>
        {onCommitDateTime ? (
          <button
            type="button"
            onClick={picker.commit}
            className="h-8 flex-1 rounded-md bg-secondary text-sm font-semibold text-secondary-foreground"
          >
            {copy.done}
          </button>
        ) : (
          <PopoverClose asChild>
            <button
              type="button"
              onClick={picker.commit}
              className="h-8 flex-1 rounded-md bg-secondary text-sm font-semibold text-secondary-foreground"
            >
              {copy.done}
            </button>
          </PopoverClose>
        )}
      </div>
    </div>
  );
}
