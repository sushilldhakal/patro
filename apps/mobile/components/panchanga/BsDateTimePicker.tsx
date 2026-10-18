import { Pressable, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { Ionicons } from "@/components/icons/Ionicons";
import { useBsDateTimePicker } from "@vedic-patro/features/panchanga";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/design-tokens/cn";
import { BsNativeSelect } from "@/components/ui/BsNativeSelect";
import { PatroYearEraToggle } from "@/components/patro-date/PatroYearEraToggle";
import { type Era } from "@vedic-patro/domain/era";

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
  const { isTablet, width: windowWidth } = useBreakpoint();
  const calendarMaxWidth = Math.min(windowWidth - 32, isTablet ? 320 : 380);
  const dayRowHeight = isTablet ? 34 : 36;
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
    displayEra: browseEra,
    afterCommit: onDone,
    onDraftDate: pushDraft ? onSelectDate : undefined,
    onDraftClock: pushDraft ? onClockChange : undefined,
  });
  const { draft, time, copy } = picker;

  return (
    <View
      className={cn("gap-2.5 self-center w-full", embeddedInSheet ? "px-0 pb-0" : "px-4 pb-4")}
      style={embeddedInSheet ? undefined : { maxWidth: calendarMaxWidth }}
    >
      <View className="flex-row items-center gap-1">
        <Pressable
          disabled={picker.prev.disabled}
          onPress={picker.prev.go}
          accessibilityLabel={picker.prev.label}
          className={cn(
            "h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
            picker.prev.disabled && "opacity-40",
          )}
        >
          <Ionicons name="chevron-back" size={15} color={colors.foreground} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <BsNativeSelect
            value={draft.month}
            options={picker.monthOptions}
            ariaLabel={monthAriaLabel}
            onChange={picker.setMonth}
          />
        </View>
        <BsNativeSelect
          value={draft.year}
          options={picker.yearOptions}
          ariaLabel={yearAriaLabel}
          onChange={picker.setYear}
          minWidth={60}
        />
        {browseEra && onBrowseEraChange ? (
          <PatroYearEraToggle era={browseEra} onEraChange={onBrowseEraChange} compact />
        ) : null}
        <Pressable
          disabled={picker.next.disabled}
          onPress={picker.next.go}
          accessibilityLabel={picker.next.label}
          className={cn(
            "h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
            picker.next.disabled && "opacity-40",
          )}
        >
          <Ionicons name="chevron-forward" size={15} color={colors.foreground} />
        </Pressable>
      </View>

      <View className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {picker.gridLoading ? (
          <View className="h-40 items-center justify-center">
            <Text className="text-sm text-muted-foreground">{copy.loading}</Text>
          </View>
        ) : (
          <>
        <View className="flex-row border-b border-border bg-muted/30">
          {picker.weekdays.map((wd, i) => (
            <View
              key={wd.label}
              className={cn(
                "h-6 flex-1 items-center justify-center border-r border-border",
                i === 6 && "border-r-0",
              )}
            >
              <Text
                className={cn(
                  "text-xs font-semibold uppercase tracking-tight",
                  wd.weekend ? "text-destructive/80" : "text-muted-foreground",
                )}
              >
                {wd.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {picker.cells.map((c) =>
            c.day == null ? (
              <View
                key={c.key}
                className="w-[14.28%] border-b border-r border-border bg-muted/10"
                style={{ height: dayRowHeight }}
              />
            ) : (
              <Pressable
                key={c.key}
                onPress={c.pick}
                accessibilityLabel={c.label}
                accessibilityState={{ selected: c.selected }}
                className="w-[14.28%] items-center justify-center border-b border-r border-border p-0.5"
                style={{ height: dayRowHeight }}
              >
                <View
                  className={cn(
                    "w-full items-center justify-center rounded-md",
                    isTablet ? "h-7" : "h-8",
                    c.selected && "bg-secondary",
                    c.today && !c.selected && "border border-secondary",
                  )}
                >
                  <Text
                    className={cn(
                      "font-num font-semibold",
                      isTablet ? "text-xs" : "text-sm",
                      c.selected
                        ? "text-secondary-foreground"
                        : c.weekend
                          ? "text-destructive"
                          : "text-foreground",
                    )}
                  >
                    {c.label}
                  </Text>
                </View>
              </Pressable>
            ),
          )}
        </View>
          </>
        )}
      </View>

      {showTime && hourAriaLabel && minuteAriaLabel ? (
        <View className="gap-1.5 border-t border-border pt-2.5">
          <Text className="text-xs text-center font-semibold uppercase tracking-widest text-muted-foreground">
            {copy.time}
          </Text>
          <View className="flex-row items-center justify-center gap-1.5">
            <BsNativeSelect
              value={time.hour12}
              options={time.hourOptions}
              ariaLabel={hourAriaLabel}
              onChange={time.setHour}
              minWidth={56}
            />
            <Text className="text-sm font-num font-semibold text-muted-foreground">:</Text>
            <BsNativeSelect
              value={time.minute}
              options={time.minuteOptions}
              ariaLabel={minuteAriaLabel}
              onChange={time.setMinute}
              minWidth={56}
            />
            <View className="flex-row overflow-hidden rounded-md border border-border">
              {time.meridiems.map((mer) => (
                <Pressable
                  key={mer.id}
                  onPress={() => time.setMeridiem(mer.id)}
                  className={cn(
                    "px-2.5 py-1",
                    mer.active ? "bg-secondary" : "bg-card active:bg-muted",
                  )}
                >
                  <Text
                    className={cn(
                      "text-sm font-bold",
                      mer.active ? "text-secondary-foreground" : "text-foreground",
                    )}
                  >
                    {mer.label}
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
          onPress={picker.goToday}
          className={cn(
            "h-9 items-center justify-center rounded-md border border-border bg-card active:bg-muted",
            live ? "min-w-[8rem] flex-1" : "flex-1",
          )}
        >
          <Text className="text-sm font-semibold text-foreground">{copy.today}</Text>
        </Pressable>
        {!live ? (
          <Pressable
            onPress={picker.commit}
            className="h-9 flex-1 items-center justify-center rounded-md bg-secondary active:opacity-90"
          >
            <Text className="text-sm font-semibold text-secondary-foreground">{copy.done}</Text>
          </Pressable>
        ) : null}
      </View>
      ) : null}
    </View>
  );
}
