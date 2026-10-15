import { cn } from "@vedic-patro/domain/utils";
import { calendarHeaderClasses as cls } from "@vedic-patro/design-tokens/classes/calendar-header-classes";
import { calendarPickerClasses as pick } from "@vedic-patro/design-tokens/classes/calendar-picker-classes";
import { usePatroDayTimeHeader } from "@vedic-patro/features/patro-date";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { PatroDayTimeHeaderProps } from "../contract";
import { shellIcons } from "../icon-nodes";
import { PatroDayTimePanel } from "./PatroDayTimePanel";

/** Day, month and year picker with optional time. */
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
  const h = usePatroDayTimeHeader({
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
    subtitleOverride: subtitle,
    crossEraText,
  });
  const { labels, time } = h;

  return (
    <Box className={cn(pick.webStack, className)}>
      {h.open ? <Pressable label={labels.picker} onPress={h.close} className={pick.webScrim} /> : null}

      <Box className={cn(pick.webTitle, pick.webDtTitle)}>
        <Pressable label={labels.today} onPress={h.goToday} className={cls.badge} webClassName={pick.webBadgeHover}>
          <Text className={cls.badgeMonth}>{h.badge.top}</Text>
          <Box className={cls.badgeDays}>
            <Text className={cls.badgeDaysText}>{h.badge.bottom}</Text>
          </Box>
        </Pressable>
        <Box className="flex min-w-0 flex-col">
          <Text as="h2" numberOfLines={1} className={cls.titleMain}>
            {h.title.main}
          </Text>
          <Text numberOfLines={1} className={cls.titleSub}>
            {h.title.sub}
          </Text>
        </Box>
      </Box>

      <Box className={cn(pick.webNav, pick.webDtNav, "w-full max-w-sm")}>
        <Pressable
          label={labels.prevDay}
          onPress={() => h.stepDay(-1)}
          disabled={prevDisabled}
          className={cls.iconButton}
          webClassName={cn("hover:bg-muted", cls.webDenseIcon)}
        >
          <Icon node={shellIcons.chevronLeft} size="md" tone="secondary" />
        </Pressable>
        <Pressable
          label={labels.picker}
          onPress={h.toggle}
          className={cn(pick.dateButton, h.open ? cls.selectButtonOpen : cls.selectButtonIdle)}
          webClassName={cn("hover:bg-muted", cls.webDenseControl)}
        >
          <Icon node={shellIcons.calendar} size="sm" tone="secondary" webClassName={pick.webDateIconHide} />
          <Text className={cn(pick.dateButtonText, pick.webDateFull)}>{h.buttonText}</Text>
          <Text className={cn(pick.dateButtonText, pick.webDateShort)}>{h.buttonTextShort}</Text>
          {h.timeText ? <Text className={cn(pick.dateButtonTime, pick.webDateTimeHide)}>{h.timeText}</Text> : null}
        </Pressable>
        <Pressable
          label={labels.nextDay}
          onPress={() => h.stepDay(1)}
          disabled={nextDisabled}
          className={cls.iconButton}
          webClassName={cn("hover:bg-muted", cls.webDenseIcon)}
        >
          <Icon node={shellIcons.chevronRight} size="md" tone="secondary" />
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
