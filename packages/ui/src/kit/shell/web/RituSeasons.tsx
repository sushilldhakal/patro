import { cn } from "@vedic-patro/domain/utils";
import { rituClasses as ritu } from "@vedic-patro/design-tokens/classes/ritu-classes";
import { useRituPage } from "@vedic-patro/features/ritu";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import type { RituSeasonsProps } from "../contract";

/** Six seasons. The why-link route and the header icon come from the app. */
export function RituSeasons({ location, showHeader = true, placeLabel, headerIcon, onWhyPress, className }: RituSeasonsProps) {
  const page = useRituPage(location);
  const why = onWhyPress ? (
    <Pressable label={page.copy.whyLink} onPress={onWhyPress} className={cn("flex-row", ritu.whyLink)} webClassName="hover:border-secondary/55 hover:bg-secondary/12">
      <Text className={ritu.whyLinkText}>{page.copy.whyLink}</Text>
    </Pressable>
  ) : null;

  return (
    <Box className={cn(showHeader && "mt-5.5", className)}>
      {showHeader ? (
        <Box className={cn("flex-row flex-wrap items-center", ritu.sectionHead)}>
          {headerIcon}
          <Text as="h2" className={ritu.sectionTitle}>{page.copy.title}</Text>
          <Text className={ritu.sectionSub}>
            {page.copy.subtitle}
            {placeLabel ? ` · ${placeLabel}` : ""}
            {page.south ? <Text className="ml-1 font-semibold text-warning">{page.copy.southern}</Text> : null}
          </Text>
          {why}
        </Box>
      ) : (
        <Box className={cn("flex-row flex-wrap", ritu.toolbar)}>
          {page.south ? <Text className={ritu.southTag}>{page.copy.southern}</Text> : null}
          {why}
        </Box>
      )}
      <Box className="grid grid-cols-1 gap-3 compact:grid-cols-2 md:grid-cols-3">
        {page.cards.map((card) => (
          <Box key={card.key} className={cn("flex-col shadow-ring-soft", ritu.card, card.current && ritu.cardCurrent)}>
            <Text className={cn(ritu.kicker, card.current && ritu.kickerCurrent)}>{card.kicker}</Text>
            <Box className={cn("flex-row", ritu.seasonRow)}>
              <Text className={ritu.emoji}>{card.emoji}</Text>
              <Box className={ritu.nameWrap}>
                <Text className={ritu.name}>{card.name}</Text>
              </Box>
              <Box className={cn(ritu.dateChip, ritu.dateChipBox)}>
                <Text className={ritu.dateDay}>{card.day}</Text>
                <Text className={ritu.dateMonth}>{card.month}</Text>
              </Box>
            </Box>
            <Box className={cn("flex-row", ritu.metaRow)}>
              <Text className={cn("min-w-0 flex-1", ritu.metaText)}>{card.meta}</Text>
              <Text className={ritu.metaFrom}>{card.from}</Text>
            </Box>
            {card.progress ? (
              <Box>
                <Box className={ritu.track}>
                  <Box className={cn(ritu.bar, "bg-secondary dark:bg-primary")} widthPercent={card.progress.pct} />
                </Box>
                <Box className={cn("flex-row", ritu.progressRow)}>
                  <Text className={ritu.progressText}>{card.progress.label}</Text>
                  <Text className={ritu.progressPct}>{card.progress.pctLabel}</Text>
                </Box>
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
      {page.south ? <Text className={ritu.southNote}>{page.copy.southNote}</Text> : null}
    </Box>
  );
}
