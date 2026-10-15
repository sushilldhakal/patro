import { Box, Pressable, Text } from "@vedic-patro/ui";
import { usePlanetEvents } from "@vedic-patro/features/panchanga";
import { patroCard } from "@vedic-patro/design-tokens/classes/patro-classes";
import { panchangaPageClasses as cls } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import type { PlanetEventsPanelProps } from "../contract";

const aside = cls.aside;

export function PlanetEventsPanel({ jdUt, refDateAd, location, onViewMore }: PlanetEventsPanelProps) {
  const panel = usePlanetEvents({ jdUt, refDateAd, location, showViewMore: Boolean(onViewMore) });

  return (
    <Box className={`${patroCard} ${aside.eventsCard}`}>
      <Box className={aside.eventsHead}>
        <Text as="h2" className={aside.eventsTitle}>
          {panel.title}
        </Text>
        {onViewMore && panel.viewMore ? (
          <Pressable onPress={onViewMore} className={aside.eventsLink} nativeClassName="active:opacity-80">
            <Text className={aside.eventsLinkText}>{panel.viewMore}</Text>
          </Pressable>
        ) : null}
      </Box>

      {panel.stateText ? <Text className={aside.eventsStatus}>{panel.stateText}</Text> : null}

      {panel.status === "ready" ? (
        <Box className={aside.eventsList}>
          {panel.events.map((event) => (
            <Box key={event.key} className={aside.eventsRow}>
              <Box className={aside.eventsBody}>
                <Text className={aside.eventsName}>{event.text}</Text>
                <Text className={aside.eventsTime}>{event.time}</Text>
              </Box>
              <Text className={aside.eventsRel}>{event.rel}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
