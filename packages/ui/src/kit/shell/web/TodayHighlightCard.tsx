import { cn } from "@vedic-patro/domain/utils";
import { homeClasses as cls } from "@vedic-patro/design-tokens/classes/home-classes";
import { useTodayHighlight } from "@vedic-patro/features/home";
import { Box, Icon, Text } from "@vedic-patro/ui";
import type { TodayHighlightCardProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Selected day's date, festival, moon and sun times. */
export function TodayHighlightCard({ className, moon, ...props }: TodayHighlightCardProps) {
  const h = useTodayHighlight(props);
  return (
    <Box className={cn(cls.highlight, className)}>
      <Box className={cls.highlightTop}>
        <Text className={cls.highlightDay}>{h.day}</Text>
        <Box className={cls.highlightDate}>
          <Text className={cls.highlightMonth}>{h.month}</Text>
          <Text className={cls.highlightWeekday}>{h.weekday}</Text>
          <Text className={cls.highlightCrossEra}>{h.crossEra}</Text>
          {h.nepalSambat ? <Text className={cls.highlightNs}>{h.nepalSambat}</Text> : null}
        </Box>
      </Box>
      <Box className={cls.highlightSpecial}>
        <Text className={cls.highlightKicker}>{h.kicker}</Text>
        <Text className={cls.highlightTitle}>{h.title}</Text>
        {h.subtitle ? <Text className={cls.highlightSubtitle}>{h.subtitle}</Text> : null}
        {h.phase && h.tithiIndex != null ? (
          <Box className={cls.highlightMoon}>
            {moon ? moon({ tithiIndex: h.tithiIndex, title: h.phase }) : null}
            <Text className={cls.highlightMoonText}>{h.phase}</Text>
          </Box>
        ) : null}
        {h.sunrise || h.sunset ? (
          <Box className={cls.highlightSun}>
            {h.sunrise ? (
              <Box className={cls.highlightSunItem}>
                <Icon node={shellIcons.sunrise} size="sm" tone="warning" />
                <Text className={cls.highlightSunText}>{h.sunrise}</Text>
              </Box>
            ) : null}
            {h.sunset ? (
              <Box className={cls.highlightSunItem}>
                <Icon node={shellIcons.sunset} size="sm" tone="warning" />
                <Text className={cls.highlightSunText}>{h.sunset}</Text>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
