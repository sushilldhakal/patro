import type { MouseEvent } from "react";
import type { CalendarDay } from "@/lib/api";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { cn } from "@vedic-patro/domain/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerticalEdgeLabel } from "@/components/VerticalEdgeLabel";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { calendarClasses } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { useBsCalendarGrid, type BsCalendarFestivalDialog } from "@vedic-patro/features/home";

const TODAY_AD = new Date().toISOString().split("T")[0];

function FestivalListDialog({
  dialog,
  onClose,
}: {
  dialog: BsCalendarFestivalDialog | null;
  onClose: () => void;
}) {
  if (!dialog) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>{dialog.description}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[min(60vh,20rem)] space-y-2 overflow-y-auto pr-1">
          {dialog.festivals.map((name, i) => (
            <li
              key={`${name}-${i}`}
              className={cn(calendarClasses.festivalItem, calendarClasses.festivalItemText)}
            >
              {name}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  days: CalendarDay[];
  publicHolidayDates: Set<string>;
  selectedAdDate?: string;
  onSelectDay?: (day: CalendarDay) => void;
  isEnriching?: boolean;
  todayAd?: string;
  /** Which date system is primary in each cell (AD when English calendar mode). */
  primaryDate?: "bs" | "ad";
}

export function BsCalendarGrid({
  days,
  publicHolidayDates,
  selectedAdDate,
  onSelectDay,
  isEnriching = false,
  todayAd = TODAY_AD,
  primaryDate: primaryDateProp = "bs",
}: Props) {
  const calendarEra = useCalendarEra();
  const grid = useBsCalendarGrid({
    days,
    publicHolidayDates,
    selectedAdDate,
    todayAd,
    primaryDate: primaryDateProp === "ad" || calendarEra === "ad" ? "ad" : "bs",
  });
  const { primaryDate } = grid;

  return (
    <div className={cn(calendarClasses.grid, calendarClasses.gridWide, "shadow-ring-soft max-md:rounded-none max-md:shadow-none")}>
      <div className="grid grid-cols-7 gap-px">
        {grid.weekdays.map((w) => {
          const weekend = w.weekend;
          return (
            <div
              key={w.key}
              className={cn("flex flex-col gap-px max-md:items-center max-md:px-0 max-md:py-1", calendarClasses.weekdayCell, calendarClasses.weekdayCellWide)}
            >
              {w.label === w.short ? (
                <span className={calendarClasses.weekdayEn}>{w.label}</span>
              ) : (
                <>
                  <span className={cn(calendarClasses.weekdayNe, "max-md:hidden", weekend && calendarClasses.weekdayWeekend)}>{w.label}</span>
                  <span
                    className={cn(
                      "hidden max-md:block",
                      calendarClasses.weekdayNeShort,
                      weekend && calendarClasses.weekdayWeekend,
                    )}
                  >
                    {w.short}
                  </span>
                </>
              )}
            </div>
          );
        })}

        {grid.cells.map((cell, i) => {
          if (!cell) {
            return (
              <div
                key={`empty-${i}`}
                className={cn("min-h-[104px] cursor-default max-md:min-h-12", calendarClasses.emptyCell)}
                aria-hidden
              />
            );
          }

          const {
            day,
            isOutside,
            isToday,
            isSelected,
            isWeekend,
            isPublicHoliday,
            festivals,
            hasFestival,
            mainFest,
            leftFest,
            rightFest,
            tithi,
            extraFestCount,
          } = cell;

          const openFestivalDialog = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            grid.openFestivals(cell);
          };

          return (
            <div
              key={day.date_ad}
              className={cn(
                "flex min-h-[104px] flex-col",
                calendarClasses.cell,
                calendarClasses.cellWide,
                calendarClasses.cellText,
                "max-md:min-h-[5rem] max-md:p-1",
                (leftFest || rightFest) && "md:px-3.5",
                isOutside && cn(calendarClasses.cellOutside, calendarClasses.cellTextOutside),
                isToday && calendarClasses.cellToday,
                isSelected && "shadow-[inset_0_0_0_2px_var(--ring)]",
                isPublicHoliday && calendarClasses.cellHoliday,
              )}
            >
              <button
                type="button"
                className={cn(
                  "absolute inset-0 z-0 border-none bg-transparent p-0 transition-colors",
                  isOutside && "hover:bg-surface-hover",
                  isToday && "hover:bg-surface-today-hover",
                  !isToday && !isOutside && !isPublicHoliday && !hasFestival && "hover:bg-surface-hover",
                )}
                aria-label={cell.ariaLabel}
                onClick={() => onSelectDay?.(day)}
              />

              {cell.tithiIndex != null ? (
                <CalendarMoonPhaseIcon
                  tithiIndex={cell.tithiIndex}
                  title={cell.moonTitle}
                  className="pointer-events-none absolute right-0.5 top-0.5 z-[2] size-3.5 sm:size-4 max-md:right-0 max-md:top-0 md:right-1 md:top-1"
                />
              ) : null}

              {leftFest ? (
                <VerticalEdgeLabel
                  text={leftFest}
                  side="left"
                  className={cn(
                    isPublicHoliday ? "text-danger" : "text-foreground/85",
                    primaryDate === "bs" && "max-md:hidden",
                  )}
                />
              ) : null}
              {rightFest ? (
                <VerticalEdgeLabel
                  text={rightFest}
                  side="right"
                  className={cn(
                    isPublicHoliday ? "text-danger" : "text-foreground/85",
                    primaryDate === "bs" && "max-md:hidden",
                  )}
                />
              ) : null}

              <div className="relative z-[1] flex min-h-0 flex-1 flex-col pointer-events-none">
              {/* Top row: tithi (full width) */}
              <span className="flex w-full items-start leading-none">
                {tithi ? (
                  <span className={cn("w-full truncate md:text-sm", calendarClasses.tithi, calendarClasses.tithiPhone)}>
                    {tithi}
                  </span>
                ) : isEnriching && !isOutside ? (
                  <span
                    className={cn("inline-block animate-pulse", calendarClasses.tithiPending)}
                    aria-hidden
                  />
                ) : (
                  <span className="min-w-0 w-full" aria-hidden />
                )}
              </span>

              {/* Center: primary day (large) + secondary day (small) */}
              <span className="flex flex-1 flex-col items-center justify-center gap-0.5">
                {isToday && (
                  <span className={cn(calendarClasses.todayBadge, calendarClasses.todayBadgeText, "max-md:px-1")}>
                    {grid.todayBadge}
                  </span>
                )}
                <span className="flex flex-wrap items-baseline justify-center gap-x-1 leading-none">
                  <span
                    className={cn(
                      "font-num",
                      calendarClasses.dayNumber,
                      calendarClasses.dayNumberWide,
                      "max-md:text-2xl",
                      !isOutside && (isWeekend || isPublicHoliday) && calendarClasses.dayNumberDanger,
                    )}
                  >
                    {cell.primaryDay}
                  </span>
                  {/* Counterpart date — carries its month name where the month
                      turns over, so July 17 reads as "Shrawan 1". The named
                      form wraps under the big number on phones, where a cell is
                      only ~50px wide, so it also drops a size there. */}
                  <span
                    className={cn(
                      "font-num whitespace-nowrap md:text-sm",
                      calendarClasses.secondaryDate,
                      cell.secondaryNamed ? calendarClasses.secondaryDateNamed : calendarClasses.secondaryDatePlain,
                    )}
                  >
                    <span className="md:hidden">{cell.secondaryLabelShort}</span>
                    <span className="max-md:hidden">{cell.secondaryLabel}</span>
                  </span>
                  {extraFestCount > 0 && primaryDate !== "bs" ? (
                    <button
                      type="button"
                      title={cell.festivalsTitle}
                      aria-label={cell.extraFestAria}
                      className={cn(
                        "pointer-events-auto shrink-0 border-none",
                        calendarClasses.countBadge,
                        calendarClasses.countBadgeText,
                        "ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "max-md:px-0.5",
                      )}
                      onClick={openFestivalDialog}
                    >
                      {cell.extraFestLabel}
                    </button>
                  ) : null}
                </span>
              </span>

              {cell.bsFestCompact ? (
                <button
                  type="button"
                  title={cell.festivalsTitle}
                  aria-label={cell.festCountAria}
                  className={cn(
                    "pointer-events-auto mx-auto mt-auto shrink-0 border-none md:hidden",
                    calendarClasses.countBadgeCompact,
                    calendarClasses.countBadgeText,
                    "ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  )}
                  onClick={openFestivalDialog}
                >
                  {cell.festCountLabel}
                </button>
              ) : null}

              {/* Bottom: primary festival (extras on left/right vertically on md+) */}
              {mainFest ? (
                <span
                  className={cn(
                    "flex w-full min-w-0 flex-col gap-px",
                    calendarClasses.festival,
                    isPublicHoliday ? calendarClasses.festivalHoliday : calendarClasses.festivalNormal,
                    primaryDate === "bs" && "max-md:hidden",
                  )}
                >
                  <span className="truncate max-md:whitespace-normal max-md:line-clamp-2 max-md:leading-[1.15]">
                    {mainFest}
                  </span>
                  {festivals.length > 1 && extraFestCount === 0 ? (
                    <span className="flex flex-col gap-px md:hidden">
                      {festivals.slice(1, 3).map((name, fi) => (
                        <span
                          key={`${name}-${fi}`}
                          className={cn("truncate", calendarClasses.festivalExtra)}
                        >
                          {name}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <FestivalListDialog dialog={grid.festivalDialog} onClose={grid.closeFestivals} />
    </div>
  );
}
