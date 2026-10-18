import { View, useWindowDimensions } from "react-native";
import { breakpoints } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { Grid, Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { HomeRashifalSignPickerProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Website `md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]`: the thumbnails' column. */
const THUMB_COLUMN = 352;

/**
 * Sign thumbnails and the selected card. Glyphs and cards come from the page that owns them.
 * React Native has no CSS grid or `sticky` (a bare `top-20` only shifts the box down onto
 * the card), so the md+ two-column layout is a row written out here.
 */
export function HomeRashifalSignPicker({ label, thumbs, onSelect, prevLabel, nextLabel, onPrev, onNext, cards, className }: HomeRashifalSignPickerProps) {
  const { width } = useWindowDimensions();
  const wide = width >= breakpoints.md;
  if (!thumbs.length) return null;
  return (
    <View className={cn(wide ? "flex-row items-start gap-4" : "flex-col gap-3", className)}>
      <View
        className={cn("min-w-0", wide ? "shrink-0" : "w-full max-w-88", home.pickerGrid)}
        style={wide ? { width: THUMB_COLUMN } : undefined}
        accessibilityLabel={label}
      >
        <Grid cols={3} gap={10}>
          {thumbs.map((sign) => (
            <Pressable
              key={sign.id}
              label={sign.name}
              selected={sign.active}
              onPress={() => onSelect(sign.index)}
              className={cn(
                "flex w-full flex-col",
                home.pickerThumb,
                /* Every thumb carries the ring (transparent when idle): NativeWind remounts a
                   component whose ring variables appear after its first render, and its dev
                   warning for that crashes inside the navigation context. */
                "ring-1",
                sign.active ? cn(home.pickerThumbActive, "ring-secondary/25") : cn(home.pickerThumbIdle, "ring-transparent"),
              )}
            >
              {sign.glyph}
              <Text numberOfLines={1} className={cn("w-full", home.pickerName, sign.active ? "text-foreground" : "text-muted-foreground")}>
                {sign.name}
              </Text>
              <Box className={home.pickerBarRow}>
                <Box className={home.pickerBar}>
                  <Box className={cn("h-full", home.pickerBarFill, sign.barClassName)} widthPercent={sign.percent} />
                </Box>
                <Text className={cn(home.pickerPercent, sign.percentClassName)}>{sign.percentLabel}</Text>
              </Box>
            </Pressable>
          ))}
        </Grid>
      </View>
      <View className={cn("min-w-0", wide && "flex-1")}>
        <View className={cn(home.pickerCarousel, wide && "px-10")}>
          {cards}
          <Pressable label={prevLabel} onPress={onPrev} className={cn("absolute left-0 top-1/2 -mt-4 items-center justify-center rounded-lg", home.pickerArrow)}>
            <Icon node={shellIcons.chevronLeft} size="sm" />
          </Pressable>
          <Pressable label={nextLabel} onPress={onNext} className={cn("absolute right-0 top-1/2 -mt-4 items-center justify-center rounded-lg", home.pickerArrow)}>
            <Icon node={shellIcons.chevronRight} size="sm" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
