import type { ReactNode } from "react";
import { View } from "react-native";
import { __iconNode as calendarIcon } from "lucide-react/dist/esm/icons/calendar";
import { __iconNode as chevronDown } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { Era } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { PatroDayTimePanel } from "./PatroDayTimePanel";
import { useBreakpoint } from "@/lib/responsive";
import { usePatroDayTimeHeader } from "@vedic-patro/features/patro-date";

export type PatroDayTimeHeaderProps = {
  era: Era;
  year: number;
  month: number;
  day: number;
  /** Weekday of the selected day, 0 = Sunday. */
  weekday: number;
  today?: { year: number; month: number; day: number } | null;
  clock?: string;
  nowClock?: string;
  onSelect: (year: number, month: number, day: number) => void;
  onStepDay: (delta: 1 | -1) => void;
  onToday: () => void;
  onClockChange?: (clock: string) => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** Replaces the weekday (and `crossEraText`) under the title. */
  subtitle?: string;
  /** With it the sheet opens with the era switch (वि.सं. | पू.वि.सं.). */
  onEraChange?: (era: Era) => void;
  /** Right end of the title row (the location button). */
  titleAside?: ReactNode;
  /** Right end of the date row (the tabs). */
  navAside?: ReactNode;
  /** The same day in the other calendar, after the weekday. */
  crossEraText?: string;
  className?: string;
};

/** Day + month + year picker with optional time: badge, title, prev/next day and a sheet (days, months, years, time). */
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
  prevDisabled,
  nextDisabled,
  subtitle,
  crossEraText,
  onEraChange,
  titleAside,
  navAside,
  className,
}: PatroDayTimeHeaderProps) {
  const h = usePatroDayTimeHeader({ era, year, month, day, weekday, today, clock, nowClock, onSelect, onStepDay, onToday, onClockChange, subtitleOverride: subtitle, crossEraText });
  const { labels, crumbs, yearInput, yearPage, time } = h;
  const dense = useBreakpoint().width < 420;

  return (
    <View className={cn("w-full gap-3", className)}>
      <View className="flex-row items-center gap-3">
      <View className={pick.nativeTitle}>
        <Pressable label={labels.today} onPress={h.goToday} className={cls.badge}>
          <Text className={cls.badgeMonth}>{h.badge.top}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{h.badge.bottom}</Text>
          </Box>
        </Pressable>
        <View className="min-w-0 flex-1">
          <Text as="h2" numberOfLines={1} className={cls.titleMain}>
            {h.title.main}
          </Text>
          <Text numberOfLines={1} className={cls.titleSub}>
            {h.title.sub}
          </Text>
        </View>
      </View>
        {titleAside}
      </View>

      <View className="flex-row items-center gap-2">
      <View className={pick.nativeNav}>
        <Pressable label={labels.prevDay} onPress={() => h.stepDay(-1)} disabled={prevDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
          <Icon node={chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Pressable label={labels.picker} onPress={h.toggle} className={cn(pick.dateButton, h.open ? cls.selectButtonOpen : cls.selectButtonIdle, dense && cls.nativeDenseControl)}>
          {dense ? null : <Icon node={calendarIcon} size="sm" tone="secondary" />}
          <Text numberOfLines={1} className={pick.dateButtonText}>
            {dense ? h.buttonTextShort : h.buttonText}
          </Text>
          {h.timeText && !dense ? <Text className={pick.dateButtonTime}>{h.timeText}</Text> : null}
        </Pressable>
        <Pressable label={labels.nextDay} onPress={() => h.stepDay(1)} disabled={nextDisabled} className={cn(cls.iconButton, dense && cls.nativeDenseIcon)}>
          <Icon node={chevronRight} size="md" tone="secondary" />
        </Pressable>
      </View>
        {navAside}
      </View>

      <Sheet open={h.open} onClose={h.close} title={labels.picker} closeLabel={labels.ok}>
        <PatroDayTimePanel h={h} onEraChange={onEraChange} onOk={time ? h.close : undefined} />
      </Sheet>
    </View>
  );
}
