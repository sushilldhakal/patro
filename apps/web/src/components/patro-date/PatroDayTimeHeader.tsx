import { __iconNode as calendarIcon } from "lucide-react/dist/esm/icons/calendar.mjs";
import { __iconNode as chevronLeft } from "lucide-react/dist/esm/icons/chevron-left.mjs";
import { __iconNode as chevronRight } from "lucide-react/dist/esm/icons/chevron-right.mjs";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { Era } from "@vedic-patro/domain/era";
import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { PatroDayTimePanel } from "./PatroDayTimePanel";
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
  /** With it the panel opens with the era switch (वि.सं. | ई.सं.). */
  onEraChange?: (era: Era) => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /** Replaces the weekday (and `crossEraText`) under the title. */
  subtitle?: string;
  /** The same day in the other calendar, after the weekday. */
  crossEraText?: string;
  className?: string;
};

/** Day + month + year picker with optional time: badge, title, prev/next day and a panel (days, months, years, time). */
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
  className,
}: PatroDayTimeHeaderProps) {
  const h = usePatroDayTimeHeader({ era, year, month, day, weekday, today, clock, nowClock, onSelect, onStepDay, onToday, onClockChange, subtitleOverride: subtitle, crossEraText });
  const { labels, time } = h;

  return (
    <Box className={cn(pick.webStack, className)}>
      {h.open ? <button type="button" tabIndex={-1} aria-hidden className={pick.webScrim} onClick={h.close} /> : null}

      <Box className={cn(pick.webTitle, pick.webDtTitle)}>
        <Pressable label={labels.today} onPress={h.goToday} className={cls.badge} webClassName={pick.webBadgeHover}>
          <Text className={cls.badgeMonth}>{h.badge.top}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{h.badge.bottom}</Text>
          </Box>
        </Pressable>
        <Box className="flex min-w-0 flex-col">
          <Text as="h2" className={cn(cls.titleMain, "truncate")}>
            {h.title.main}
          </Text>
          <Text className={cn(cls.titleSub, "truncate")}>{h.title.sub}</Text>
        </Box>
      </Box>

      <Box className={cn(pick.webNav, pick.webDtNav, "w-full max-w-sm")}>
        <Pressable label={labels.prevDay} onPress={() => h.stepDay(-1)} disabled={prevDisabled} className={cls.iconButton} webClassName={cn("hover:bg-muted", cls.webDenseIcon)}>
          <Icon node={chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Pressable
          label={labels.picker}
          onPress={h.toggle}
          className={cn(pick.dateButton, h.open ? cls.selectButtonOpen : cls.selectButtonIdle)}
          webClassName={cn("hover:bg-muted", cls.webDenseControl)}
        >
          <Icon node={calendarIcon} size="sm" tone="secondary" webClassName={pick.webDateIconHide} />
          <Text className={cn(pick.dateButtonText, pick.webDateFull)}>{h.buttonText}</Text>
          <Text className={cn(pick.dateButtonText, pick.webDateShort)}>{h.buttonTextShort}</Text>
          {h.timeText ? <Text className={cn(pick.dateButtonTime, pick.webDateTimeHide)}>{h.timeText}</Text> : null}
        </Pressable>
        <Pressable label={labels.nextDay} onPress={() => h.stepDay(1)} disabled={nextDisabled} className={cls.iconButton} webClassName={cn("hover:bg-muted", cls.webDenseIcon)}>
          <Icon node={chevronRight} size="md" tone="secondary" />
        </Pressable>

        {h.open ? (
          <Box className={cn(cls.panel, pick.webDatePanel)} label={labels.picker}>
            <PatroDayTimePanel h={h} onEraChange={onEraChange} onOk={time ? h.close : undefined} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
