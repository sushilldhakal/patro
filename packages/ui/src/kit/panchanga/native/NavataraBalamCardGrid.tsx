import type { ReactNode } from "react";

import type { BalamCardItem } from "@vedic-patro/domain/balam-cards";
import { cn } from "@vedic-patro/domain/utils";
import { useNavataraBalamCards } from "@vedic-patro/features/panchanga";
import { Box, Grid, Text } from "@vedic-patro/ui";
import {
  panchangaCardBase,
  panchangaCardSubtitle,
  panchangaCardTitle,
} from "@vedic-patro/design-tokens";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "./ElementGlyphIcon";

export type NavataraBalamCardGridProps = {
  cards: BalamCardItem[];
  clock?: string;
  formatName: (card: BalamCardItem) => string;
  lang?: string;
  variant?: "chandrabala" | "tarabala";
};

function BalamCard({
  titleLine,
  subtitleLine,
  tone = "neutral",
  isCurrent,
  icon,
}: {
  titleLine: ReactNode;
  subtitleLine?: ReactNode;
  tone?: "best" | "good" | "neutral" | "bad" | "worst";
  isCurrent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Box
      className={cn(
        panchangaCardBase,
        panchangaPageClasses.layout.balamCard,
        "w-full min-w-0",
        patroNavataraToneBg(tone),
        isCurrent && "shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_65%,transparent)] ring-2 ring-accent/80",
      )}
    >
      <Box className={cn("flex-row items-start gap-2", panchangaCardTitle)}>
        {icon ? <Box className="mt-0.5 shrink-0">{icon}</Box> : null}
        <Box className="min-w-0 flex-1">{titleLine}</Box>
      </Box>
      {subtitleLine ? <Text className={panchangaCardSubtitle}>{subtitleLine}</Text> : null}
    </Box>
  );
}

export function NavataraBalamCardGrid({ cards, clock, formatName, lang, variant = "chandrabala" }: NavataraBalamCardGridProps) {
  const items = useNavataraBalamCards({ cards, clock, formatName, lang });
  if (!items.length) return null;
  return (
    /* Measured columns: the web's `basis-[calc(50%-…)]` has no native meaning, so the
       cards came out ragged — one full width, the next cropped. */
    <Box className="w-full p-4">
    <Grid cols={{ base: 2, sm: 3, lg: 4 }} gap={8}>
      {items.map((card) => (
        <BalamCard
          key={card.key}
          titleLine={
            <Text className={panchangaCardTitle}>
              {card.name}
              {card.timeRange ? <Text className={panchangaPageClasses.sections.monoTabular}> {card.timeRange}</Text> : null}
            </Text>
          }
          subtitleLine={card.subtitle}
          tone={card.tone}
          isCurrent={card.isCurrent}
          icon={
            variant === "tarabala" ? (
              <NakshatraGlyphIcon name={card.glyph.name} number={card.glyph.number} size={24} />
            ) : (
              <RashiGlyphIcon name={card.glyph.name} number={card.glyph.number} size={24} />
            )
          }
        />
      ))}
    </Grid>
    </Box>
  );
}
