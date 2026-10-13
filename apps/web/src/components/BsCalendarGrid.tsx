import { useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { CalendarDay } from "@/lib/api";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { getSecondaryCellDate } from "@vedic-patro/domain/local-calendar";
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
import { tithiIndexFromCalendarDay } from "@vedic-patro/domain/tithi-wheel-data";
import { civilIsoDayOfMonth, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { moonPhaseTitle, getPakshaPhase } from "@vedic-patro/domain/month-grid-moon";
import { calendarClasses } from "@vedic-patro/design-tokens/classes/calendar-classes";

const WEEKDAYS_NE = ["आइतवार", "सोमवार", "मंगलवार", "बुधवार", "बिहीवार", "शुक्रवार", "शनिवार"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];

const TODAY_AD = new Date().toISOString().split("T")[0];

function fmtAdDay(iso: string): number {
  return civilIsoDayOfMonth(iso);
}

function FestivalListDialog({
  open,
  onOpenChange,
  day,
  festivals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: CalendarDay | null;
  festivals: string[];
}) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();

  if (!day) return null;

  const weekday = bilingualText(lang, day.weekday_ne ?? day.weekday, day.weekday_en ?? day.weekday);
  const adDate = parseCivilIsoToDate(day.date_ad).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("calendar.festivals_dialog_title")}</DialogTitle>
          <DialogDescription>
            {t("calendar.festivals_dialog_desc", {
              weekday,
              bsDay: digits(day.day),
              adDate,
            })}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-[min(60vh,20rem)] space-y-2 overflow-y-auto pr-1">
          {festivals.map((name, i) => (
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
  const { t } = useTranslation();
  const { lang, monoDigits } = useLocale();
  const isEn = lang === "en";
  const calendarEra = useCalendarEra();
  const primaryDate =
    primaryDateProp === "ad" || calendarEra === "ad" || lang === "en" ? "ad" : "bs";
  const [festivalDialog, setFestivalDialog] = useState<{
    day: CalendarDay;
    festivals: string[];
  } | null>(null);
  const cells: (CalendarDay | null)[] = [...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={cn(calendarClasses.grid, calendarClasses.gridWide, "shadow-ring-soft max-md:rounded-none max-md:shadow-none")}>
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS_NE.map((ne, i) => {
          const weekend = i === 0 || i === 6;
          return (
            <div
              key={ne}
              className={cn("flex flex-col gap-px max-md:items-center max-md:px-0 max-md:py-1", calendarClasses.weekdayCell, calendarClasses.weekdayCellWide)}
            >
              {lang === "en" ? (
                <span className={calendarClasses.weekdayEn}>{WEEKDAYS_EN[i]}</span>
              ) : (
                <>
                  <span className={cn(calendarClasses.weekdayNe, "max-md:hidden", weekend && calendarClasses.weekdayWeekend)}>{ne}</span>
                  <span
                    className={cn(
                      "hidden max-md:block",
                      calendarClasses.weekdayNeShort,
                      weekend && calendarClasses.weekdayWeekend,
                    )}
                  >
                    {WEEKDAYS_SHORT[i]}
                  </span>
                </>
              )}
            </div>
          );
        })}

        {cells.map((day, i) => {
          if (!day) {
            return (
              <div
                key={`empty-${i}`}
                className={cn("min-h-[104px] cursor-default max-md:min-h-12", calendarClasses.emptyCell)}
                aria-hidden
              />
            );
          }

          const col = i % 7;
          const isOutside = day.outsideMonth === true;
          const isToday = day.date_ad === todayAd;
          const isSelected = day.date_ad === selectedAdDate && !isToday;
          const isWeekend = col === 0 || col === 6;
          const isPublicHoliday = !isOutside && publicHolidayDates.has(day.date_ad);
          const festivals = !isOutside ? day.festivals.filter(Boolean) : [];
          const hasFestival = festivals.length > 0 && !isPublicHoliday;
          const mainFest = festivals[0];
          const leftFest = festivals[1];
          const rightFest = festivals[2];
          const tithi = bilingualText(lang, day.tithi_ne ?? day.tithi, day.tithi ?? day.tithi_ne);
          const tithiIdx = tithiIndexFromCalendarDay(day);
          const moonTitle = moonPhaseTitle(getPakshaPhase(day), isEn);
          const extraFestCount = festivals.length > 2 ? festivals.length - 2 : 0;
          const festCount = festivals.length;
          /** BS patro on phones: tint + count badge only — no festival labels in the cell. */
          const mobileBsFestCompact = primaryDate === "bs" && festCount > 0;
          const adDayNum = fmtAdDay(day.date_ad);
          const primaryDayNum = primaryDate === "ad" ? adDayNum : day.day;
          const secondary = getSecondaryCellDate(day, primaryDate, lang, i === 0);
          const secondaryLabel = secondary.monthLabel
            ? `${secondary.monthLabel} ${monoDigits(secondary.day)}`
            : monoDigits(secondary.day);
          const secondaryLabelShort = secondary.monthLabelShort
            ? `${secondary.monthLabelShort} ${monoDigits(secondary.day)}`
            : monoDigits(secondary.day);

          const openFestivalDialog = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setFestivalDialog({ day, festivals });
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
                aria-label={`${monoDigits(primaryDayNum)} (${secondaryLabel}), ${day.date_ad}`}
                onClick={() => onSelectDay?.(day)}
              />

              {tithiIdx != null ? (
                <CalendarMoonPhaseIcon
                  tithiIndex={tithiIdx}
                  title={moonTitle}
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
                    {t("calendar.today_badge")}
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
                    {monoDigits(primaryDayNum)}
                  </span>
                  {/* Counterpart date — carries its month name where the month
                      turns over, so July 17 reads as "Shrawan 1". The named
                      form wraps under the big number on phones, where a cell is
                      only ~50px wide, so it also drops a size there. */}
                  <span
                    className={cn(
                      "font-num whitespace-nowrap md:text-sm",
                      calendarClasses.secondaryDate,
                      secondary.monthLabel ? calendarClasses.secondaryDateNamed : calendarClasses.secondaryDatePlain,
                    )}
                  >
                    <span className="md:hidden">{secondaryLabelShort}</span>
                    <span className="max-md:hidden">{secondaryLabel}</span>
                  </span>
                  {extraFestCount > 0 && primaryDate !== "bs" ? (
                    <button
                      type="button"
                      title={festivals.join(" · ")}
                      aria-label={t("calendar.festivals_more", { count: extraFestCount })}
                      className={cn(
                        "pointer-events-auto shrink-0 border-none",
                        calendarClasses.countBadge,
                        calendarClasses.countBadgeText,
                        "ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "max-md:px-0.5",
                      )}
                      onClick={openFestivalDialog}
                    >
                      +{monoDigits(extraFestCount)}
                    </button>
                  ) : null}
                </span>
              </span>

              {mobileBsFestCompact ? (
                <button
                  type="button"
                  title={festivals.join(" · ")}
                  aria-label={t("calendar.festivals_more", { count: festCount })}
                  className={cn(
                    "pointer-events-auto mx-auto mt-auto shrink-0 border-none md:hidden",
                    calendarClasses.countBadgeCompact,
                    calendarClasses.countBadgeText,
                    "ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  )}
                  onClick={openFestivalDialog}
                >
                  +{monoDigits(festCount)}
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

      <FestivalListDialog
        open={festivalDialog !== null}
        onOpenChange={(open) => {
          if (!open) setFestivalDialog(null);
        }}
        day={festivalDialog?.day ?? null}
        festivals={festivalDialog?.festivals ?? []}
      />
    </div>
  );
}
