import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { useGocharSkyCards } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { patroCard, patroMono } from "@vedic-patro/design-tokens/classes/patro-classes";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";
import { GrahaStatusBadges } from "./GrahaStatusBadges";

const PLANET_STRIPE: Record<GrahaKey, string> = {
  sun: gocharClasses.planetStripeSun,
  moon: gocharClasses.planetStripeMoon,
  mars: gocharClasses.planetStripeMars,
  mercury: gocharClasses.planetStripeMercury,
  jupiter: gocharClasses.planetStripeJupiter,
  venus: gocharClasses.planetStripeVenus,
  saturn: gocharClasses.planetStripeSaturn,
  rahu: gocharClasses.planetStripeRahu,
  ketu: gocharClasses.planetStripeKetu,
};

type Props = {
  gochar: Parameters<typeof useGocharSkyCards>[0];
  dateLabel: string;
  onSelectPlanet?: (key: GrahaKey) => void;
  /** Ring the card for this graha. The 3D sky page uses it for the canvas selection. */
  selectedPlanet?: GrahaKey | null;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text as="p" className={cn("m-0", gocharClasses.metaRow)}>
      <Text as="span" className={gocharClasses.metaLabel}>
        {label}
      </Text>{" "}
      <Text as="span" className={gocharClasses.metaValue}>
        {value}
      </Text>
    </Text>
  );
}

export function GocharSkySection({ gochar, dateLabel, onSelectPlanet, selectedPlanet }: Props) {
  const { cards, copy } = useGocharSkyCards(gochar);

  return (
    <Box as="section" className={cn(patroCard, gocharClasses.skyCard, "shadow-ring-soft")}>
      <Box className={gocharClasses.skyHead}>
        <Text as="p" className={cn("m-0", gocharClasses.skyEyebrow)}>
          {copy.eyebrow}
        </Text>
        <Text as="h2" className={cn("mb-0", gocharClasses.skyTitle)}>
          {copy.title}
        </Text>
        <Text as="p" className={cn("mb-0", gocharClasses.skyDate)}>
          {dateLabel}
        </Text>
      </Box>

      <Box className={cn("grid sm:grid-cols-2 lg:grid-cols-3", gocharClasses.skyGrid)}>
        {cards.map((card) => {
          const key = card.key;
          const selected = selectedPlanet === key;
          return (
            <Pressable
              key={key}
              onPress={() => onSelectPlanet?.(key)}
              selected={selectedPlanet != null ? selected : undefined}
              className={cn(
                "relative flex flex-col text-left",
                gocharClasses.planetCard,
                "transition-[box-shadow,transform] hover:shadow-md hover:shadow-secondary/10 active:scale-[0.995]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                selected ? gocharClasses.planetCardSelected : gocharClasses.planetCardIdle,
              )}
            >
              <Text as="span" className={cn(gocharClasses.planetStripe, PLANET_STRIPE[key])} />
              <Box className={cn("flex", gocharClasses.planetHead)}>
                <GrahaPlanetIcon graha={key} size={32} className="shrink-0" />
                <Box className="min-w-0 flex-1">
                  <Text as="p" className={cn("m-0 flex", gocharClasses.planetTitleWrap, gocharClasses.planetTitle, patroMono, "tabular-nums")}>
                    <Text as="span">{card.name}</Text>
                    <Text as="span" className="font-bold">
                      {card.rashi}
                    </Text>
                    <Text as="span">{card.deg}</Text>
                    <GrahaStatusBadges planetKey={key} isRetrograde={card.isRetrograde} isCombust={card.isCombust} size={13} />
                  </Text>
                </Box>
                {card.exalted ? (
                  <Text as="span" className={cn(gocharClasses.exaltedBadge, gocharClasses.exaltedBadgeText)}>
                    {copy.exalted}
                  </Text>
                ) : null}
              </Box>
              <Box className={cn("flex flex-col px-3", gocharClasses.planetBody)}>
                <MetaRow label={copy.nakshatra} value={card.nakshatra} />
                <MetaRow label={copy.motion} value={card.motion} />
              </Box>
              {card.footer ? (
                <Box className={cn("mt-auto px-3", gocharClasses.planetFooter)}>
                  <Text as="p" className={cn("m-0", gocharClasses.planetFooterText)}>
                    {card.footer}
                  </Text>
                </Box>
              ) : null}
            </Pressable>
          );
        })}
      </Box>
    </Box>
  );
}
