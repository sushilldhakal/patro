import { cn } from "@vedic-patro/design-tokens/cn";
import { homeClasses as cls } from "@vedic-patro/design-tokens/classes/home-classes";
import { useTodayHighlight } from "@vedic-patro/features/home";
import { Box, Icon, Text } from "@vedic-patro/ui";
import type { TodayHighlightCardProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Selected day's date, festival, moon and sun times. Side by side once the card is 32rem wide. */
export function TodayHighlightCard({ className, moon, ...props }: TodayHighlightCardProps) {
  const h = useTodayHighlight(props);
  return (
    <Box className={cn(cls.highlight, "@container", className)}>
      <Box className="flex flex-col @[32rem]:flex-row @[32rem]:items-start @[32rem]:gap-4">
        <Box className={cn(cls.highlightTop, "@[32rem]:shrink-0")}>
          <Text className={cls.highlightDay}>{h.day}</Text>
          <Box className={cls.highlightDate}>
            {/* Month and weekday on one line, the other era (and Nepal Sambat) under it. */}
            <Text className={cls.highlightMonth}>
              {h.month}
              <Text className={cls.highlightWeekday}> · {h.weekday}</Text>
            </Text>
            <Text className={cls.highlightCrossEra}>{h.crossEra}</Text>
            {h.nepalSambat ? <Text className={cls.highlightNs}>{h.nepalSambat}</Text> : null}
          </Box>
        </Box>
        <Box className={cn(cls.highlightSpecial, "@[32rem]:mt-0 @[32rem]:min-w-0 @[32rem]:flex-1 @[32rem]:border-l @[32rem]:border-t-0 @[32rem]:pl-4 @[32rem]:pt-0")}>
          <Text className={cls.highlightTitle}>{h.title}</Text>
          {/* The "N days ago" kicker rides on the subtitle line instead of a line of its own. */}
          <Text className={cls.highlightSubtitle}>
            {[h.subtitle, h.kicker].filter(Boolean).join(" · ")}
          </Text>
          {(h.phase && h.tithiIndex != null) || h.sunrise || h.sunset ? (
            /* Moon phase and sun times share one wrapping line. */
            <Box className={cls.highlightMeta}>
              {h.phase && h.tithiIndex != null ? (
                <Box className={cls.highlightSunItem}>
                  {moon ? moon({ tithiIndex: h.tithiIndex, title: h.phase }) : null}
                  <Text className={cls.highlightMoonText}>{h.phase}</Text>
                </Box>
              ) : null}
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
    </Box>
  );
}
