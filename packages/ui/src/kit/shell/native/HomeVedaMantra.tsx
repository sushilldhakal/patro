import { cn } from "@vedic-patro/design-tokens/cn";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { patroCard, patroSecBand } from "@vedic-patro/design-tokens/classes/patro-classes";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { HomeVedaMantraProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Today's Veda mantra: Sanskrit, a play button and the link to the passage. The app owns the audio. */
export function HomeVedaMantra({
  title,
  tokens,
  activeToken,
  source,
  readMore,
  playLabel,
  pauseLabel,
  playing,
  onToggle,
  onOpenPassage,
  className,
}: HomeVedaMantraProps) {
  return (
    <Box as="section" className={cn(patroCard, className)} label={title}>
      <Box className={cn(patroSecBand, "flex-row flex-nowrap items-center")}>
        <Text as="h2" className={home.vedaTitle}>
          {title}
        </Text>
        {onToggle ? (
          <Pressable label={playing ? pauseLabel : playLabel} onPress={onToggle} className={home.vedaPlay} webClassName="transition-opacity hover:opacity-90 active:scale-95">
            <Icon node={playing ? shellIcons.pause : shellIcons.play} size="sm" tone="onSecondary" />
          </Pressable>
        ) : null}
      </Box>
      <Box className={home.vedaBody}>
        {/* One Text per token, not one paragraph of nested spans. A tap on the shloka asks
            Android for the character under the finger, and that walk ANRs on a long Devanagari
            line (Sentry PATRO-H). */}
        <Box className="flex-row flex-wrap">
          {tokens.map((tok, i) =>
            /\n/.test(tok) ? (
              <Box key={i} className="w-full" />
            ) : (
              <Text key={i} className={cn(home.vedaSanskrit, i === activeToken && home.vedaWord)}>
                {tok}
              </Text>
            ),
          )}
        </Box>
        <Box className={home.vedaFooter}>
          <Pressable label={readMore} onPress={onOpenPassage} webClassName="hover:underline">
            <Text className={home.vedaMore}>{readMore}</Text>
          </Pressable>
          <Text className={home.vedaSource}>{source}</Text>
        </Box>
      </Box>
    </Box>
  );
}
