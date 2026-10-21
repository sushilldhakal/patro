import { useState } from "react";
import { View } from "react-native";
import { homeClasses as cls } from "@vedic-patro/design-tokens/classes/home-classes";
import { useTodayHighlight } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Text } from "@vedic-patro/ui";
import type { TodayHighlightCardProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Card width from which the date block and the festival block sit side by side (web `@[32rem]`). */
const SIDE_BY_SIDE = 512;

/** Selected day's date, festival (and its sait), moon and sun times. */
export function TodayHighlightCard({ className, moon, ...props }: TodayHighlightCardProps) {
  const h = useTodayHighlight(props);
  const [wide, setWide] = useState(false);
  return (
    <View
      className={cn(cls.highlight, wide ? "flex-row items-start gap-4" : null, className)}
      onLayout={(e) => {
        const next = e.nativeEvent.layout.width >= SIDE_BY_SIDE;
        if (next !== wide) setWide(next);
      }}
    >
      {/* Side by side, the date column sizes to its text (capped): a `flex-1` there makes
          Yoga stretch it over the whole card and leaves the festival block no width. */}
      <Box className={cn(cls.highlightTop, wide && "max-w-[60%] shrink")}>
        <Text className={cls.highlightDay}>{h.day}</Text>
        <Box className={wide ? "min-w-0 shrink" : cls.highlightDate}>
          {/* Month and weekday on one line, the other era (and Nepal Sambat) under it. */}
          <Text className={cls.highlightMonth}>
            {h.month}
            <Text className={cls.highlightWeekday}> · {h.weekday}</Text>
          </Text>
          <Text className={cls.highlightCrossEra}>{h.crossEra}</Text>
          {h.nepalSambat ? <Text className={cls.highlightNs}>{h.nepalSambat}</Text> : null}
        </Box>
      </Box>
      <Box className={cn(cls.highlightSpecial, wide && cls.highlightSpecialWide)}>
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
        {h.saits.length ? (
          <Box className={cls.highlightSait}>
            <Text className={cls.highlightSaitHeading}>{h.saitHeading}</Text>
            {h.saits.map((sait) => (
              <Box key={sait.key} className={cls.highlightSaitItem}>
                <Text className={cls.highlightSaitLabel}>{sait.label}</Text>
                {sait.times.map((slot) => (
                  <Box key={slot.key} className={cls.highlightSaitRow}>
                    <Text className={cls.highlightSaitTime}>{slot.time}</Text>
                    {slot.detail ? <Text className={cls.highlightSaitDetail}>{slot.detail}</Text> : null}
                  </Box>
                ))}
                {sait.facing ? <Text className={cls.highlightSaitFacing}>{sait.facing}</Text> : null}
              </Box>
            ))}
            <Text className={cls.highlightSaitNote}>{h.saitNote}</Text>
          </Box>
        ) : null}
      </Box>
    </View>
  );
}
