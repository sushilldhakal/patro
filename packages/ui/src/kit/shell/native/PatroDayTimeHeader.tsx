import { View, useWindowDimensions } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { usePatroDayTimeHeader } from "@vedic-patro/features/patro-date";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { PatroDayTimeHeaderProps } from "../contract";
import { shellIcons } from "../icon-nodes";
import { PatroDayTimePanel } from "./PatroDayTimePanel";

/** Day + month + year picker with optional time: badge, title, prev/next day, and a sheet (days, months, years, time). */
export function PatroDayTimeHeader({
  era,
  year,
  month,
  day,
  weekday,
  today,
  clock,
  nowClock,
  onSelect,
  onStepDay,
  onToday,
  onClockChange,
  onEraChange,
  prevDisabled,
  nextDisabled,
  subtitle,
  crossEraText,
  navAside,
  className,
}: PatroDayTimeHeaderProps) {
  const h = usePatroDayTimeHeader({ era, year, month, day, weekday, today, clock, nowClock, onSelect, onStepDay, onToday, onClockChange, subtitleOverride: subtitle, crossEraText });
  const { labels, time } = h;
  const width = useWindowDimensions().width;
  const dense = width < 420;
  /** Phones: month + day (the title shows the year), and always the time. */
  const shortDate = width < 640;

  return (
    <View className={cn("w-full gap-3", className)}>
      {/* No date badge, title or place row: the app's toolbar carries the place. */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 shrink flex-row items-center gap-2">
          <Pressable label={labels.prevDay} onPress={() => { haptics.tick(); h.stepDay(-1); }} disabled={prevDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
            <Icon node={shellIcons.chevronLeft} size="md" tone="secondary" />
          </Pressable>
          <Pressable label={labels.picker} onPress={h.toggle} className={cn(pick.dateButton, "min-w-28 flex-none shrink", h.open ? cls.selectButtonOpen : cls.selectButtonIdle, dense && cn(cls.nativeDenseControl, pick.nativeDenseDate))}>
            {dense ? null : <Icon node={shellIcons.calendar} size="sm" tone="secondary" />}
            <Text numberOfLines={1} className={cn(pick.dateButtonText, dense && pick.nativeDenseDateText)}>
              {shortDate ? h.buttonTextShort : h.buttonText}
            </Text>
            {h.timeText ? <Text className={cn(pick.dateButtonTime, dense && pick.nativeDenseDateTime)}>{h.timeText}</Text> : null}
          </Pressable>
          <Pressable label={labels.nextDay} onPress={() => { haptics.tick(); h.stepDay(1); }} disabled={nextDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
            <Icon node={shellIcons.chevronRight} size="md" tone="secondary" />
          </Pressable>
        </View>
        {navAside ? <View className="shrink-0">{navAside}</View> : null}
      </View>

      <Sheet open={h.open} onClose={h.close} title={labels.picker} closeLabel={labels.ok}>
        <PatroDayTimePanel h={h} onEraChange={onEraChange} onOk={time ? h.close : undefined} />
      </Sheet>
    </View>
  );
}
