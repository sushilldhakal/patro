import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { CalendarDay } from "@/lib/api";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { FestivalListSheet } from "@/components/home/FestivalListSheet";
import { useLocale } from "@/lib/i18n";
import { getSecondaryCellDate } from "@/lib/local-calendar";
import { nepaliDayNumberStyle, nepaliLineHeight, nepaliTextStyle } from "@/lib/nepali-text";
import { civilIsoDayOfMonth } from "@/lib/patro-day";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { tithiIndexFromCalendarDay } from "@/lib/tithi-wheel-data";
import { cn } from "@/lib/utils";
import {
  CALENDAR_GRID_GAP,
  calendarColStyle,
  selectionRingStyle,
  useCalendarGridWidth,
} from "./calendar-grid-layout";

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

type PakshaPhase = "shukla" | "krishna";

function getPakshaPhase(day: CalendarDay): PakshaPhase | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}

function moonPhaseTitle(phase: PakshaPhase | undefined, isEn: boolean): string | undefined {
  if (phase === "shukla") return isEn ? "Shukla paksha (waxing moon)" : "शुक्ल पक्ष";
  if (phase === "krishna") return isEn ? "Krishna paksha (waning moon)" : "कृष्ण पक्ष";
  return undefined;
}

type Props = {
  days: CalendarDay[];
  selectedAd?: string;
  todayAd: string;
  publicHolidayDates?: Set<string>;
  onSelectDay?: (day: CalendarDay) => void;
  isEnriching?: boolean;
  primaryDate?: "bs" | "ad";
};

export function BsCalendarGrid({
  days,
  selectedAd,
  todayAd,
  publicHolidayDates = new Set(),
  onSelectDay,
  isEnriching,
  primaryDate = "bs",
}: Props) {
  const theme = useThemeColors();
  const { pick, digits, lang } = useLocale();
  const isEn = lang === "en";
  const { isCompact, isPhone, isTablet } = useBreakpoint();
  const { onLayout, colWidth } = useCalendarGridWidth();
  const col = (extra?: object) => calendarColStyle(colWidth, extra);
  /* Web draws the tithi/festival line at 10.8px, line-height 13.6. The app-wide
     13px Devanagari floor made it wrap-truncate ("द्वि…") in a 47px column, so
     opt out of the floor here and keep web's size. */
  const metaSize = isPhone ? 10.8 : isTablet ? 12 : 10.8;
  const metaTextStyle =
    lang === "en"
      ? undefined
      : { ...nepaliTextStyle(metaSize, { dense: true }), lineHeight: Math.round(metaSize * 1.5) };
  const tithiRowMinH = lang === "en" ? 14 : Math.round(metaSize * 1.5) + 3;
  const dayNumSize = isPhone ? 24 : isCompact ? 22 : isTablet ? 30 : 24;
  const dayNumStyle =
    lang === "en"
      ? {
          fontSize: dayNumSize,
          lineHeight: dayNumSize + (isPhone ? 4 : isCompact ? 6 : 8),
        }
      : nepaliDayNumberStyle(dayNumSize);
  const cellMinH = isPhone ? 74 : isCompact ? 84 : isTablet ? 104 : 96;

  const [festivalDialog, setFestivalDialog] = useState<{
    day: CalendarDay;
    festivals: string[];
  } | null>(null);

  const cells: (CalendarDay | null)[] = [...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = chunk(cells, 7);
  const weekdayLabels = lang === "en" ? WEEKDAYS_EN : WEEKDAYS_SHORT;

  return (
    <>
      <View
        onLayout={onLayout}
        className={cn(
          "overflow-hidden border border-border",
          isPhone ? "rounded-none border-x-0 shadow-none" : "rounded-xl shadow-sm",
        )}
        style={{ backgroundColor: theme.border, gap: CALENDAR_GRID_GAP }}
      >
        <View style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }}>
          {weekdayLabels.map((label, i) => {
            const weekend = i === 0 || i === 6;
            return (
              <View
                key={label}
                style={col({ backgroundColor: theme.surfaceInset })}
                className={cn("items-center py-2", isPhone ? "px-0 py-1" : "px-1 py-2")}
              >
                <Text
                  className="font-bold uppercase tracking-wide"
                  style={[
                    {
                      color: weekend && lang !== "en" ? theme.danger : theme.text,
                      fontSize: isTablet ? 14 : 12,
                    },
                    lang === "en" ? undefined : nepaliTextStyle(isTablet ? 14 : 12),
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: CALENDAR_GRID_GAP }}>
            {row.map((day, colIndex) => {
              const cellIndex = rowIndex * 7 + colIndex;

              if (!day) {
                return (
                  <View
                    key={`empty-${cellIndex}`}
                    style={col({ minHeight: cellMinH, backgroundColor: theme.surfaceMuted })}
                  />
                );
              }

              const isOutside = day.outsideMonth === true;
              const isToday = day.date_ad === todayAd;
              const isSelected = day.date_ad === selectedAd && !isToday;
              const isWeekend = colIndex === 0 || colIndex === 6;
              const isPublicHoliday = !isOutside && publicHolidayDates.has(day.date_ad);
              const festivals = !isOutside ? day.festivals.filter(Boolean) : [];
              const hasFestival = festivals.length > 0 && !isPublicHoliday;
              const mainFest = festivals[0];
              const festCount = festivals.length;
              const extraFestCount = festivals.length > 2 ? festivals.length - 2 : 0;
              const mobileBsFestCompact = primaryDate === "bs" && festCount > 0 && isCompact;

              const tithi = pick(day.tithi_ne ?? day.tithi, day.tithi ?? day.tithi_ne);
              const tithiIdx = tithiIndexFromCalendarDay(day);
              const moonTitle = moonPhaseTitle(getPakshaPhase(day), isEn);
              const adDayNum = civilIsoDayOfMonth(day.date_ad);
              const primaryDayNum = primaryDate === "ad" ? adDayNum : day.day;
          const secondary = getSecondaryCellDate(day, primaryDate, lang, cellIndex === 0);
          const secondaryLabel = secondary.monthLabel
            ? `${secondary.monthLabel} ${digits(secondary.day)}`
            : digits(secondary.day);
          const secondaryLabelShort = secondary.monthLabelShort
            ? `${secondary.monthLabelShort} ${digits(secondary.day)}`
            : digits(secondary.day);

              let bg: string = theme.card;
              if (isOutside) bg = theme.surfaceMuted;
              else if (isToday) bg = theme.surfaceToday;
              else if (isPublicHoliday) bg = theme.surfaceTintDanger;

              const dayColor =
                !isOutside && (isWeekend || isPublicHoliday)
                  ? theme.danger
                  : isOutside
                    ? theme.textMuted
                    : theme.text;

              const openFestivals = () => setFestivalDialog({ day, festivals });

              return (
                <Pressable
                  key={day.date_ad}
                  onPress={() => onSelectDay?.(day)}
                  style={col({ minHeight: cellMinH, backgroundColor: bg })}
                  className={cn(
                    "relative active:opacity-90",
                    isPhone ? "px-1 pb-1 pt-2" : "px-1 pb-1 pt-2 md:min-h-[104px] md:p-2",
                  )}
                >
                  {isSelected ? <View style={selectionRingStyle(theme.primary)} /> : null}

                  {tithiIdx != null ? (
                    <View
                      pointerEvents="none"
                      style={{ position: "absolute", top: 2, right: 2, zIndex: 2 }}
                    >
                      <CalendarMoonPhaseIcon tithiIndex={tithiIdx} size={isCompact ? 14 : 16} title={moonTitle} />
                    </View>
                  ) : null}

                  <View
                    className="w-full flex-row items-start justify-center"
                    style={{ minHeight: tithiRowMinH, paddingRight: tithiIdx != null ? 8 : 0 }}
                  >
                    {tithi ? (
                      <Text
                        numberOfLines={1}
                        className="min-w-0 flex-1 pt-0.5 text-center font-semibold"
                        style={{
                          color: theme.text,
                          fontSize: metaSize,
                          ...metaTextStyle,
                        }}
                      >
                        {tithi}
                      </Text>
                    ) : isEnriching && !isOutside ? (
                      <View className="mx-auto h-1.5 w-6 rounded-full bg-muted-foreground/25" />
                    ) : (
                      <View className="min-w-0 flex-1" />
                    )}
                  </View>

                  <View className="flex-1 items-center justify-center gap-0.5 py-0.5">
                    {isToday ? (
                      <View className="rounded-full bg-secondary px-1.5 py-0.5">
                        <Text
                          className="text-caption font-bold text-secondary-foreground"
                          style={lang === "en" ? undefined : nepaliTextStyle(10)}
                        >
                          {pick("आज", "Today")}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row flex-wrap items-baseline justify-center gap-x-1">
                      <Text
                        className={lang === "en" ? "font-num-bold font-semibold" : "font-semibold"}
                        style={{
                          color: dayColor,
                          opacity: isOutside ? 0.65 : 1,
                          ...dayNumStyle,
                        }}
                      >
                        {digits(primaryDayNum)}
                      </Text>
                      <Text
                        className={lang === "en" ? "font-num font-semibold text-muted-foreground" : "font-semibold text-muted-foreground"}
                        style={
                          lang === "en"
                            ? { fontSize: secondary.monthLabel ? 10 : metaSize }
                            : nepaliDayNumberStyle(secondary.monthLabel ? 10 : metaSize)
                        }
                      >
                        {isPhone ? secondaryLabelShort : secondaryLabel}
                      </Text>
                      {extraFestCount > 0 && primaryDate !== "bs" && !isCompact ? (
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation?.();
                            openFestivals();
                          }}
                          className="rounded-full bg-secondary px-1 py-px"
                        >
                          <Text className="text-caption font-num font-bold text-secondary-foreground">
                            +{digits(extraFestCount)}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {mobileBsFestCompact ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openFestivals();
                      }}
                      className="mx-auto mt-auto rounded-full bg-secondary px-1.5 py-0.5"
                    >
                      <Text className="text-caption font-num font-bold text-secondary-foreground">
                        +{digits(festCount)}
                      </Text>
                    </Pressable>
                  ) : null}

                  {mainFest && !isOutside && !mobileBsFestCompact ? (
                    <Text
                      numberOfLines={isCompact ? 2 : 2}
                      className="text-center font-semibold"
                      style={{
                        color: isPublicHoliday ? theme.danger : theme.text,
                        fontSize: metaSize,
                        ...metaTextStyle,
                      }}
                    >
                      {mainFest}
                    </Text>
                  ) : null}
                  {hasFestival && !mainFest ? (
                    <View className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-accent" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <FestivalListSheet
        visible={festivalDialog !== null}
        day={festivalDialog?.day ?? null}
        festivals={festivalDialog?.festivals ?? []}
        onClose={() => setFestivalDialog(null)}
      />
    </>
  );
}
