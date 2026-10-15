import { Text as RNText } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { verticalEdgeLabel } from "@vedic-patro/domain/vertical-edge-label";
import { calendarClasses as cal } from "@vedic-patro/design-tokens/classes/calendar-classes";
import { useBsCalendarGrid, type BsCalendarCell } from "@vedic-patro/features/home";
import { useLocale } from "@vedic-patro/i18n/react";
import { Grid, Box, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { BsCalendarGridProps } from "../contract";

const TODAY_AD = new Date().toISOString().split("T")[0];

function EdgeLabel({ text, side, className }: { text: string; side: "left" | "right"; className?: string }) {
  const { label, fontSize } = verticalEdgeLabel(text);
  return (
    <Box className={cn(cal.edgeStrip, side === "left" ? "left-0.5" : "right-0.5")}>
      <RNText
        className={cn("font-num font-semibold", className)}
        style={{ fontSize, transform: [{ rotate: side === "left" ? "-90deg" : "90deg" }] }}
      >
        {label}
      </RNText>
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
  moon,
  className,
}: BsCalendarGridProps) {
  const { t } = useLocale();
  const grid = useBsCalendarGrid({ days, publicHolidayDates, selectedAdDate, todayAd, primaryDate });

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
              primaryDate={grid.primaryDate}
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
        className="max-w-sm"
      >
        {grid.festivalDialog ? (
          <>
            <Text className="mb-3 text-sm text-muted-foreground">{grid.festivalDialog.description}</Text>
            <Box as="ul" className="max-h-[min(60vh,20rem)] gap-2 overflow-y-auto pr-1">
              {grid.festivalDialog.festivals.map((name, i) => (
                <Text key={`${name}-${i}`} className={cn(cal.festivalItem, cal.festivalItemText)}>
                  {name}
                </Text>
              ))}
            </Box>
          </>
        ) : null}
      </Sheet>
    </Box>
  );
}

function DayCell({
  cell,
  primaryDate,
  isEnriching,
  todayBadge,
  moon,
  onSelect,
  onOpenFestivals,
}: {
  cell: BsCalendarCell;
  primaryDate: "bs" | "ad";
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
    festivals,
    hasFestival,
    mainFest,
    leftFest,
    rightFest,
    tithi,
    extraFestCount,
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

      {leftFest ? <EdgeLabel text={leftFest} side="left" className={cn(edgeTone, primaryDate === "bs" && "max-md:hidden")} /> : null}
      {rightFest ? <EdgeLabel text={rightFest} side="right" className={cn(edgeTone, primaryDate === "bs" && "max-md:hidden")} /> : null}

      <Box className="relative z-[1] min-h-0 flex-1 flex-col pointer-events-none">
        <Text className="w-full items-start leading-none">
          {tithi ? (
            <Text className={cn("w-full md:text-sm", cal.tithi, cal.tithiPhone)} numberOfLines={1}>
              {tithi}
            </Text>
          ) : isEnriching && !isOutside ? (
            <Text className={cn("inline-block animate-pulse", cal.tithiPending)} />
          ) : null}
        </Text>

        <Box className="flex-1 flex-col items-center justify-center gap-0.5">
          {isToday ? <Text className={cn(cal.todayBadge, cal.todayBadgeText, "max-md:px-1")}>{todayBadge}</Text> : null}
          <Text className="flex-row flex-wrap items-baseline justify-center gap-x-1 leading-none">
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
            {extraFestCount > 0 && primaryDate !== "bs" ? (
              <Pressable
                label={cell.extraFestAria}
                onPress={onOpenFestivals}
                className={cn("pointer-events-auto shrink-0 border-none max-md:px-0.5", cal.countBadge, cal.countBadgeText)}
                webClassName="transition-opacity hover:opacity-90"
              >
                <Text className={cal.countBadgeText}>{cell.extraFestLabel}</Text>
              </Pressable>
            ) : null}
          </Text>
        </Box>

        {cell.bsFestCompact ? (
          <Pressable
            label={cell.festCountAria}
            onPress={onOpenFestivals}
            className={cn("pointer-events-auto mx-auto mt-auto shrink-0 border-none md:hidden", cal.countBadgeCompact, cal.countBadgeText)}
            webClassName="transition-opacity hover:opacity-90"
          >
            <Text className={cal.countBadgeText}>{cell.festCountLabel}</Text>
          </Pressable>
        ) : null}

        {mainFest ? (
          <Text
            className={cn(
              "w-full min-w-0 flex-col gap-px",
              cal.festival,
              isPublicHoliday ? cal.festivalHoliday : cal.festivalNormal,
              primaryDate === "bs" && "max-md:hidden",
            )}
          >
            <Text numberOfLines={2}>{mainFest}</Text>
            {festivals.length > 1 && extraFestCount === 0
              ? festivals.slice(1, 3).map((name, fi) => (
                  <Text key={`${name}-${fi}`} numberOfLines={1} className={cn("md:hidden", cal.festivalExtra)}>
                    {name}
                  </Text>
                ))
              : null}
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
