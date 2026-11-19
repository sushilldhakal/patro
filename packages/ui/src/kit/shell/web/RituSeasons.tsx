import { cn } from "@vedic-patro/design-tokens/cn";
import { rituClasses as ritu } from "@vedic-patro/design-tokens/classes/ritu-classes";
import { useRituPage, type RituCard } from "@vedic-patro/features/ritu";
import { Grid, Box, Pressable, Text } from "@vedic-patro/ui";
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
      <Grid cols={{ base: 1, compact: 2, md: 3 }} gap={12}>
        {page.cards.map((card) => (
          <RituCardView key={card.key} card={card} startsLabel={page.copy.startsLabel} />
        ))}
      </Grid>
      {page.ayanas.length > 0 ? (
        <Box className={ritu.subsection}>
          <Text as="h3" className={ritu.subsectionTitle}>{page.copy.ayanaTitle}</Text>
          <Grid cols={{ base: 1, compact: 2, md: 3 }} gap={12}>
            {page.ayanas.map((card) => (
              <RituCardView key={card.key} card={card} startsLabel={page.copy.startsLabel} />
            ))}
          </Grid>
        </Box>
      ) : null}
      {page.cards.some((card) => card.vedic) ? <Text className={ritu.southNote}>{page.copy.vedicNote}</Text> : null}
      {page.south ? <Text className={ritu.southNote}>{page.copy.southNote}</Text> : null}
    </Box>
  );
}

/** One season or ayana: the real-sky start, its progress, and the Vedic crossover line. */
function RituCardView({ card, startsLabel }: { card: RituCard; startsLabel: string }) {
  return (
    <Box className={cn("flex-col shadow-ring-soft", ritu.card, card.current && ritu.cardCurrent)}>
      <Text className={cn(ritu.kicker, card.current && ritu.kickerCurrent)}>{card.kicker}</Text>
      <Box className={cn("flex-row", ritu.seasonRow)}>
        {card.emoji ? <Text className={ritu.emoji}>{card.emoji}</Text> : null}
        <Box className={ritu.nameWrap}>
          <Text className={ritu.name}>{card.name}</Text>
        </Box>
        {/* The first day in BS — labelled; a bare "६ / कात्तिक" chip read as a stray number. */}
        <Box className="flex-col items-end">
          <Text className={ritu.startLabel}>{startsLabel}</Text>
          <Text className={ritu.startValue}>
            {card.month} {card.day}
          </Text>
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
      {card.vedic ? (
        <Box className={cn("flex-row", ritu.vedicRow)}>
          <Text className={ritu.vedicText}>
            <Text className={ritu.vedicLabel}>{card.vedic.label}</Text> · {card.vedic.date}
          </Text>
          <Text className={ritu.vedicShift}>{card.vedic.shift}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
