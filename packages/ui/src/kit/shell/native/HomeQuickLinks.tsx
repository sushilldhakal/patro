import { useState } from "react";
import { View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { breakpoints } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { HomeQuickLinksProps } from "../contract";

const TILE_GAP = 12;
/** Website `md:max-w-32`. */
const TILE_MAX_MD = 128;

/**
 * Shortcut groups under the calendar. Each app supplies the icon and where the tile goes.
 * Phone: wrapping chips. md+: square tiles, five to a row (at most 128 wide) and eight from
 * lg — the website's `calc()` widths, worked out here from the measured row width.
 */
export function HomeQuickLinks({ groups, className }: HomeQuickLinksProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const tiles = windowWidth >= breakpoints.md;
  const perRow = windowWidth >= breakpoints.lg ? 8 : 5;
  const fit = Math.floor((rowWidth - TILE_GAP * (perRow - 1)) / perRow);
  const tile = tiles && fit > 0 ? (perRow === 5 ? Math.min(TILE_MAX_MD, fit) : fit) : 0;

  return (
    <View
      className={cn(home.quickGroups, className)}
      onLayout={(e: LayoutChangeEvent) => {
        const next = e.nativeEvent.layout.width;
        setRowWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
      }}
    >
      {groups.map((group) => (
        <View key={group.id}>
          <Text as="h2" className={tiles ? cn(home.quickTitleWide, "mb-3") : cn(home.quickTitle, home.quickTitlePhone)}>
            {group.title}
          </Text>
          <View className={cn(home.quickRow, tiles ? "justify-center" : "gap-2")} style={tiles ? { gap: TILE_GAP } : undefined}>
            {group.items.map((item) => {
              const chip = (
                <Pressable
                  key={item.key}
                  label={item.label}
                  onPress={item.onPress}
                  className={
                    tiles
                      ? "w-full flex-1 items-center justify-center gap-3 rounded-2xl border border-border bg-card px-2.5 py-3.5 shadow-none"
                      : cn(home.quickChip, "shrink-0")
                  }
                >
                  <Box className={home.quickLinkIconWrap}>{item.icon}</Box>
                  <Text className={cn(home.quickLabel, "min-w-0 px-0.5", tiles && "text-center")} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {tiles && item.description ? <Text className={cn(home.quickLinkDesc, "text-center")}>{item.description}</Text> : null}
                </Pressable>
              );
              return tiles ? (
                <View key={item.key} style={{ width: tile || undefined, minHeight: tile || undefined }}>
                  {chip}
                </View>
              ) : (
                chip
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
