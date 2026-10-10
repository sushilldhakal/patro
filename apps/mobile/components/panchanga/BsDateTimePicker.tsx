import { useState, useEffect } from "react";
import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import {
  BS_MONTH_NAMES,
  adToBS,
  bsMonthLabel,
  bsToAD,
  getBSMonthLength,
} from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";
import { BsNativeSelect } from "@/components/ui/BsNativeSelect";
import { PatroYearEraToggle } from "@/components/patro-date/PatroYearEraToggle";
import { type Era } from "@vedic-patro/domain/era";
import { formatClockParts, from12h, parseClockParts, to12h } from "@/components/panchanga/use-panchanga-mode";

const WEEKDAYS_NE = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];
const WEEKDAYS_EN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type Props = {
  year: number;
  month: number;
  day: number;
  yearOptions: number[];
  todayAd?: string;
  onSelectDate: (year: number, month: number, day: number) => void;
  monthAriaLabel: string;
  yearAriaLabel: string;
  clock?: string;
  onClockChange?: (clock: string) => void;
  hourAriaLabel?: string;
  minuteAriaLabel?: string;
  showTime: boolean;
  onDone: () => void;
  /** When true, apply date/time immediately (embedded on panchanga page). */
  live?: boolean;
  /** Bottom sheet: web-style picker; outer sheet owns Done. */
  embeddedInSheet?: boolean;
  browseEra?: Era;
  onBrowseEraChange?: (era: Era) => void;
};

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
  onDone,
  live = false,
  embeddedInSheet = false,
  browseEra,
  onBrowseEraChange,
}: Props) {
  const pushDraft = live || embeddedInSheet;
  const colors = useThemeColors();
  const { lang, pick, digits } = useLocale();
  const { isTablet, width: windowWidth } = useBreakpoint();
  const calendarMaxWidth = Math.min(windowWidth - 32, isTablet ? 320 : 380);
  const dayRowHeight = isTablet ? 34 : 36;
  const [draft, setDraft] = useState({ year, month, day, clock: clock ?? "" });

  useEffect(() => {
    if (!pushDraft) return;
    setDraft({ year, month, day, clock: clock ?? "" });
  }, [pushDraft, year, month, day, clock]);

  const { year: dYear, month: dMonth, day: dDay } = draft;

  const monthLen = getBSMonthLength(dYear, dMonth);
  const firstDow = bsToAD(dYear, dMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: monthLen }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayBs = adToBS(todayAd ? new Date(`${todayAd}T12:00:00`) : new Date());
  const minYear = yearOptions[0] ?? dYear;
  const maxYear = yearOptions[yearOptions.length - 1] ?? dYear;

  const monthOptions = BS_MONTH_NAMES.map((_, i) => ({
    value: i + 1,
    label: bsMonthLabel(i + 1, lang),
  }));
  const yearSelectOptions = yearOptions.map((y) => ({ value: y, label: digits(y) }));
  const weekdays = lang === "en" ? WEEKDAYS_EN : WEEKDAYS_NE;

  const setMonthYear = (y: number, m: number) => {
    const nextDay = Math.min(dDay, getBSMonthLength(y, m));
    setDraft((d) => ({ ...d, year: y, month: m, day: nextDay }));
    if (pushDraft) onSelectDate(y, m, nextDay);
  };

  const stepMonth = (delta: number) => {
    let m = dMonth + delta;
    let y = dYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y < minYear || y > maxYear) return;
    setMonthYear(y, m);
  };

  const prevDisabled = dYear <= minYear && dMonth <= 1;
  const nextDisabled = dYear >= maxYear && dMonth >= 12;

  const { hour, minute } = draft.clock ? parseClockParts(draft.clock) : { hour: 0, minute: 0 };
  const { hour12, meridiem } = to12h(hour);
  const hour12Options = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: digits(String(i + 1).padStart(2, "0")),
  }));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: digits(String(i).padStart(2, "0")),
  }));
  const setTime = (nextHour12: number, nextMinute: number, nextMeridiem: "AM" | "PM") => {
    const nextClock = formatClockParts(from12h(nextHour12, nextMeridiem), nextMinute);
    setDraft((d) => ({ ...d, clock: nextClock }));
    if (pushDraft) onClockChange?.(nextClock);
  };

  const goDraftToday = () => {
    const next = {
      year: todayBs.year,
      month: todayBs.month,
      day: todayBs.day,
    };
    setDraft((d) => ({ ...d, ...next }));
    if (live) onSelectDate(next.year, next.month, next.day);
  };

  const commit = () => {
    const dateChanged = draft.year !== year || draft.month !== month || draft.day !== day;
    const clockChanged = showTime && draft.clock !== (clock ?? "");
    if (dateChanged) onSelectDate(draft.year, draft.month, draft.day);
    if (clockChanged) onClockChange?.(draft.clock);
    onDone();
  };

  return (
    <View
      className={cn("gap-2.5 self-center w-full", embeddedInSheet ? "px-0 pb-0" : "px-4 pb-4")}
      style={embeddedInSheet ? undefined : { maxWidth: calendarMaxWidth }}
    >
      <View className="flex-row items-center gap-1">
        <Pressable
          disabled={prevDisabled}
          onPress={() => stepMonth(-1)}
          accessibilityLabel={pick("अघिल्लो महिना", "Previous month")}
          className={cn(
            "h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
            prevDisabled && "opacity-40",
          )}
        >
          <Ionicons name="chevron-back" size={15} color={colors.foreground} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <BsNativeSelect
            value={dMonth}
            options={monthOptions}
            ariaLabel={monthAriaLabel}
            onChange={(m) => setMonthYear(dYear, m)}
          />
        </View>
        <BsNativeSelect
          value={dYear}
          options={yearSelectOptions}
          ariaLabel={yearAriaLabel}
          onChange={(y) => setMonthYear(y, dMonth)}
          minWidth={60}
        />
        {browseEra && onBrowseEraChange ? (
          <PatroYearEraToggle era={browseEra} onEraChange={onBrowseEraChange} compact />
        ) : null}
        <Pressable
          disabled={nextDisabled}
          onPress={() => stepMonth(1)}
          accessibilityLabel={pick("अर्को महिना", "Next month")}
          className={cn(
            "h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
            nextDisabled && "opacity-40",
          )}
        >
          <Ionicons name="chevron-forward" size={15} color={colors.foreground} />
        </Pressable>
      </View>

      <View className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <View className="flex-row border-b border-border bg-muted/30">
          {weekdays.map((wd, i) => (
            <View
              key={wd}
              className={cn(
                "h-6 flex-1 items-center justify-center border-r border-border",
                i === 6 && "border-r-0",
              )}
            >
              <Text
                className={cn(
                  "text-caption font-semibold uppercase tracking-tight",
                  i === 0 || i === 6 ? "text-destructive/80" : "text-muted-foreground",
                )}
              >
                {wd}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {cells.map((d, i) => {
            if (d == null) {
              return (
                <View
                  key={`e-${i}`}
                  className="w-[14.28%] border-b border-r border-border bg-muted/10"
                  style={{ height: dayRowHeight }}
                />
              );
            }
            const col = i % 7;
            const isWeekend = col === 0 || col === 6;
            const isSelected = d === dDay;
            const isToday =
              todayBs.year === dYear && todayBs.month === dMonth && todayBs.day === d;
            return (
              <Pressable
                key={`${d}-${i}`}
                onPress={() => {
                  setDraft((prev) => ({ ...prev, day: d }));
                  if (pushDraft) onSelectDate(dYear, dMonth, d);
                }}
                accessibilityLabel={digits(d)}
                accessibilityState={{ selected: isSelected }}
                className="w-[14.28%] items-center justify-center border-b border-r border-border p-0.5"
                style={{ height: dayRowHeight }}
              >
                <View
                  className={cn(
                    "w-full items-center justify-center rounded-md",
                    isTablet ? "h-7" : "h-8",
                    isSelected && "bg-secondary",
                    isToday && !isSelected && "border border-secondary",
                  )}
                >
                  <Text
                    className={cn(
                      "font-num font-semibold",
                      isTablet ? "text-caption" : "text-body",
                      isSelected
                        ? "text-secondary-foreground"
                        : isWeekend
                          ? "text-destructive"
                          : "text-foreground",
                    )}
                  >
                    {digits(d)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {showTime && hourAriaLabel && minuteAriaLabel ? (
        <View className="gap-1.5 border-t border-border pt-2.5">
          <Text className="text-caption text-center font-semibold uppercase tracking-widest text-muted-foreground">
            {pick("समय", "Time")}
          </Text>
          <View className="flex-row items-center justify-center gap-1.5">
            <BsNativeSelect
              value={hour12}
              options={hour12Options}
              ariaLabel={hourAriaLabel}
              onChange={(h) => setTime(h, minute, meridiem)}
              minWidth={56}
            />
            <Text className="text-body font-num font-semibold text-muted-foreground">:</Text>
            <BsNativeSelect
              value={minute}
              options={minuteOptions}
              ariaLabel={minuteAriaLabel}
              onChange={(m) => setTime(hour12, m, meridiem)}
              minWidth={56}
            />
            <View className="flex-row overflow-hidden rounded-md border border-border">
              {(["AM", "PM"] as const).map((mer) => (
                <Pressable
                  key={mer}
                  onPress={() => setTime(hour12, minute, mer)}
                  className={cn(
                    "px-2.5 py-1",
                    meridiem === mer ? "bg-secondary" : "bg-card active:bg-muted",
                  )}
                >
                  <Text
                    className={cn(
                      "text-body font-bold",
                      meridiem === mer ? "text-secondary-foreground" : "text-foreground",
                    )}
                  >
                    {mer}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {!embeddedInSheet ? (
      <View className={cn("flex-row items-center gap-2 border-t border-border pt-2.5", live && "justify-center")}>
        <Pressable
          onPress={goDraftToday}
          className={cn(
            "h-9 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
            live ? "min-w-[8rem] flex-1" : "flex-1",
          )}
        >
          <Text className="text-body font-semibold text-foreground">{pick("आज", "Today")}</Text>
        </Pressable>
        {!live ? (
          <Pressable
            onPress={commit}
            className="h-9 flex-1 items-center justify-center rounded-md bg-secondary active:opacity-90"
          >
            <Text className="text-body font-semibold text-secondary-foreground">{pick("भयो", "Done")}</Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}
    </View>
  );
}
