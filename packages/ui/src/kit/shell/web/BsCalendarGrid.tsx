import { cn } from "@vedic-patro/design-tokens/cn";
import { softBreakTithi } from "@vedic-patro/domain/calendar/tithi-soft-break";
import { verticalEdgeLabel } from "@vedic-patro/domain/panchanga/vertical-edge-label";
import { calendarClasses as cal } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { useBsCalendarGrid, type BsCalendarCell } from "@vedic-patro/features/home";
import { useLocale } from "@vedic-patro/i18n/react";
import { Grid, Box, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { BsCalendarGridProps } from "../contract";

const TODAY_AD = new Date().toISOString().split("T")[0];

function EdgeLabel({ text, side, className }: { text: string; side: "left" | "right"; className?: string }) {
  const { label, fontSize } = verticalEdgeLabel(text);
  return (
    <Box className={cn(cal.edgeStrip, side === "left" ? "left-0.5 inset-y-1" : "right-0.5 top-6 bottom-1")}>
      <Box className={cn("h-full w-full items-center justify-center overflow-hidden px-px py-0.5", side === "left" && "rotate-180")}>
        <span className={cn(cal.edgeText, className)} style={{ fontSize }}>
          {label}
        </span>
      </Box>
    </Box>
  );
}

/** Month grid. The moon glyph is supplied by each app. */
export function BsCalendarGrid({
  days,
  publicHolidayDates,
  selectedAdDate,
  onSelectDay,
  isEnriching = false,
  todayAd = TODAY_AD,
  primaryDate = "bs",
  saitSource,
  events,
  moon,
  className,
}: BsCalendarGridProps) {
  const { t } = useLocale();
  const grid = useBsCalendarGrid({ days, publicHolidayDates, selectedAdDate, todayAd, primaryDate, saitSource, events });

  return (
    <Box className={cn(cal.grid, cal.gridWide, cal.gridWeb, className)}>
      <Grid cols={7} gap={1}>
        {grid.weekdays.map((w) => (
          <Box key={w.key} className={cn("flex-col gap-px max-md:items-center max-md:px-0 max-md:py-1", cal.weekdayCell, cal.weekdayCellWide)}>
            {w.label === w.short ? (
              <Text className={cal.weekdayEn}>{w.label}</Text>
            ) : (
              <>
                <Text className={cn(cal.weekdayNe, "max-md:hidden", w.weekend && cal.weekdayWeekend)}>{w.label}</Text>
                <Text className={cn("hidden max-md:flex", cal.weekdayNeShort, w.weekend && cal.weekdayWeekend)}>{w.short}</Text>
              </>
            )}
          </Box>
        ))}

        {grid.cells.map((cell, i) => {
          if (!cell) return <Box key={`empty-${i}`} className={cn(cal.emptyWeb, cal.emptyCell)} />;
          return (
            <DayCell
              key={cell.day.date_ad}
              cell={cell}
              isEnriching={isEnriching}
              todayBadge={grid.todayBadge}
              moon={moon}
              onSelect={() => onSelectDay?.(cell.day)}
              onOpenFestivals={() => grid.openFestivals(cell)}
            />
          );
        })}
      </Grid>

      <Sheet
        open={grid.festivalDialog != null}
        onClose={grid.closeFestivals}
        title={grid.festivalDialog?.title}
        closeLabel={t("common.close")}
        placement="center"
        className="max-w-sm"
      >
        {grid.festivalDialog ? (
          <>
            {/* Paragraphs, not the default inline span: as spans the date ran straight into the festival name. */}
            <Text as="p" className="mb-2 text-xs text-muted-foreground">{grid.festivalDialog.description}</Text>
            <Text as="p" className="text-lg font-bold text-foreground">{grid.festivalDialog.festivalLine}</Text>
            {grid.festivalDialog.saits.length ? (
              <Box className={home.highlightSait}>
                <Text className={home.highlightSaitHeading}>{grid.festivalDialog.saitHeading}</Text>
                {grid.festivalDialog.saits.map((sait) => (
                  <Box key={sait.key} className={home.highlightSaitItem}>
                    <Text className={home.highlightSaitLabel}>{sait.label}</Text>
                    {sait.times.map((slot) => (
                      <Box key={slot.key} className={home.highlightSaitRow}>
                        <Text className={home.highlightSaitTime}>{slot.time}</Text>
                        {slot.detail ? <Text className={home.highlightSaitDetail}>{slot.detail}</Text> : null}
                      </Box>
                    ))}
                    {sait.facing ? <Text className={home.highlightSaitFacing}>{sait.facing}</Text> : null}
                  </Box>
                ))}
                <Text className={home.highlightSaitNote}>{grid.festivalDialog.saitNote}</Text>
              </Box>
            ) : null}
          </>
        ) : null}
      </Sheet>
    </Box>
  );
}

function DayCell({
  cell,
  isEnriching,
  todayBadge,
  moon,
  onSelect,
  onOpenFestivals,
}: {
  cell: BsCalendarCell;
  isEnriching: boolean;
  todayBadge: string;
  moon?: BsCalendarGridProps["moon"];
  onSelect: () => void;
  onOpenFestivals: () => void;
}) {
  const {
    isOutside,
    isToday,
    isSelected,
    isWeekend,
    isPublicHoliday,
    hasFestival,
    mainFest,
    leftFest,
    rightFest,
    tithi,
    compactFest,
  } = cell;
  const edgeTone = isPublicHoliday ? "text-danger" : "text-foreground/85";

  return (
    <Box
      className={cn(
        cal.cellWeb,
        cal.cell,
        cal.cellWide,
        cal.cellText,
        (leftFest || rightFest) && "md:px-3.5",
        isOutside && cn(cal.cellOutside, cal.cellTextOutside),
        isToday && cal.cellToday,
        isSelected && cal.cellSelected,
        isPublicHoliday && cal.cellHoliday,
      )}
    >
      <Pressable
        label={cell.ariaLabel}
        onPress={onSelect}
        className={cal.cellHit}
        webClassName={cn(
          "transition-colors",
          isOutside && "hover:bg-surface-hover",
          isToday && "hover:bg-surface-today-hover",
          !isToday && !isOutside && !isPublicHoliday && !hasFestival && "hover:bg-surface-hover",
        )}
      />

      {cell.tithiIndex != null && moon ? <Box className={cal.moonWrap}>{moon({ tithiIndex: cell.tithiIndex, title: cell.moonTitle })}</Box> : null}

      {leftFest ? <EdgeLabel text={leftFest} side="left" className={edgeTone} /> : null}
      {rightFest ? <EdgeLabel text={rightFest} side="right" className={edgeTone} /> : null}

      <Box className="relative z-[1] min-h-0 flex-1 flex-col pointer-events-none">
        <Text className="w-full items-start leading-none">
          {tithi ? (
            <Text
              className={cn("w-full md:text-sm", cal.tithi, cal.tithiPhone)}
              webClassName="max-md:line-clamp-2 max-md:whitespace-normal max-md:pr-3.5 max-md:leading-tight max-xs:text-diagram-xs"
              numberOfLines={1}
            >
              {softBreakTithi(tithi)}
            </Text>
          ) : isEnriching && !isOutside ? (
            <Text className={cn("inline-block animate-pulse", cal.tithiPending)} />
          ) : null}
        </Text>

        <Box className="flex flex-1 flex-col items-center justify-center gap-0.5">
          {isToday ? <Text className={cn(cal.todayBadge, cal.todayBadgeText, "max-md:px-1")}>{todayBadge}</Text> : null}
          <Text className="inline-flex flex-row flex-wrap items-baseline justify-center gap-x-1 leading-none">
            <Text
              className={cn(
                "font-num",
                cal.dayNumber,
                cal.dayNumberWide,
                "max-md:text-2xl",
                !isOutside && (isWeekend || isPublicHoliday) && cal.dayNumberDanger,
              )}
            >
              {cell.primaryDay}
            </Text>
            <Text
              className={cn(
                "font-num whitespace-nowrap md:text-sm",
                cal.secondaryDate,
                cell.secondaryNamed ? cal.secondaryDateNamed : cal.secondaryDatePlain,
              )}
            >
              <Text className="md:hidden">{cell.secondaryLabelShort}</Text>
              <Text className="max-md:hidden">{cell.secondaryLabel}</Text>
            </Text>
          </Text>
        </Box>

        {/* One "+N" per cell: the festivals not written out and the user's events together. A phone cell
            writes one festival name, a wide one three (centre and both edges). A click opens the day, or
            the festival list when there are no events. */}
        {cell.moreCompact > 0 || cell.moreWide > 0 ? (
          <Pressable
            label={cell.moreAria}
            onPress={cell.eventTitles.length > 0 ? onSelect : onOpenFestivals}
            className={cn(
              "pointer-events-auto mx-auto mt-auto shrink-0 border-none",
              cal.countBadgeCompact,
              cal.countBadgeText,
              cell.moreCompact === 0 && "max-md:hidden",
              cell.moreWide === 0 && "md:hidden",
            )}
            webClassName="transition-opacity hover:opacity-90"
          >
            <Text className={cn(cal.countBadgeText, "md:hidden")}>{cell.moreCompactLabel}</Text>
            <Text className={cn(cal.countBadgeText, "max-md:hidden")}>{cell.moreWideLabel}</Text>
          </Pressable>
        ) : null}

        {mainFest ? (
          <Text
            className={cn(
              "w-full min-w-0 flex-col gap-px",
              cal.festival,
              isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal,
            )}
          >
            {/* Phone width: one line, the rest are in "+N". */}
            {compactFest ? (
              <Text numberOfLines={1} className="md:hidden">
                {compactFest}
              </Text>
            ) : null}
            <Text numberOfLines={2} className="max-md:hidden">
              {mainFest}
            </Text>
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
