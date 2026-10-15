import { cn } from "@vedic-patro/domain/utils";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { Grid, Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { HomeRashifalSignPickerProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Sign thumbnails and the selected card. Glyphs and cards come from the page that owns them. */
export function HomeRashifalSignPicker({ label, thumbs, onSelect, prevLabel, nextLabel, onPrev, onNext, cards, className }: HomeRashifalSignPickerProps) {
  if (!thumbs.length) return null;
  return (
    <Box className={cn("flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-start md:gap-4", className)}>
      <Box as="nav" className={cn("w-full min-w-0 max-w-88 shrink-0 justify-self-start md:sticky md:top-20", home.pickerGrid)} label={label}>
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
                sign.active ? cn(home.pickerThumbActive, "ring-1 ring-secondary/25") : home.pickerThumbIdle,
              )}
              webClassName={sign.active ? undefined : "hover:border-border hover:bg-muted/50 hover:text-foreground"}
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
      </Box>
      <Box className="min-w-0">
        <Box className={cn(home.pickerCarousel, "relative md:px-10")}>
          {cards}
          <Pressable label={prevLabel} onPress={onPrev} className={cn("absolute left-0 top-1/2", home.pickerArrow)}>
            <Icon node={shellIcons.chevronLeft} size="sm" />
          </Pressable>
          <Pressable label={nextLabel} onPress={onNext} className={cn("absolute right-0 top-1/2", home.pickerArrow)}>
            <Icon node={shellIcons.chevronRight} size="sm" />
          </Pressable>
        </Box>
      </Box>
    </Box>
  );
}
