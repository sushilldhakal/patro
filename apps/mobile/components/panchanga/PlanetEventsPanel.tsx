import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import type { LocationParams } from "@/lib/api";
import { usePlanetEvents } from "@vedic-patro/features/panchanga";
import { patroCard } from "@/lib/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

type Props = {
  /** Civil-day Julian identity from panchanga (`jd_ut`). */
  jdUt: number;
  /** Civil `date_ad` from panchanga (for relative day math). */
  refDateAd?: string;
  location: LocationParams;
  /** Route for the "view more" link (the gochar page); no link without it. */
  viewMoreHref?: string;
};

export function PlanetEventsPanel({ jdUt, refDateAd, location, viewMoreHref }: Props) {
  const router = useRouter();
  const panel = usePlanetEvents({ jdUt, refDateAd, location, showViewMore: Boolean(viewMoreHref) });

  return (
    <View className={`${patroCard} ${panchangaPageClasses.aside.eventsCard}`}>
      <View className={`flex-row ${panchangaPageClasses.aside.eventsHead}`}>
        <Text className={`${panchangaPageClasses.aside.eventsTitle} text-foreground`}>{panel.title}</Text>
        {viewMoreHref && panel.viewMore ? (
          <Pressable
            onPress={() => router.push(viewMoreHref as never)}
            className={`${panchangaPageClasses.aside.eventsLink} active:opacity-80`}
          >
            <Text className={panchangaPageClasses.aside.eventsLinkText}>{panel.viewMore}</Text>
          </Pressable>
        ) : null}
      </View>

      {panel.stateText ? <Text className={panchangaPageClasses.aside.eventsStatus}>{panel.stateText}</Text> : null}

      {panel.status === "ready" ? (
        <View className={panchangaPageClasses.aside.eventsList}>
          {panel.events.map((e) => (
            <View key={e.key} className={panchangaPageClasses.aside.eventsRow}>
              <View className={panchangaPageClasses.aside.eventsBody}>
                <Text className={panchangaPageClasses.aside.eventsName}>{e.text}</Text>
                <Text className={panchangaPageClasses.aside.eventsTime}>{e.time}</Text>
              </View>
              <Text className={panchangaPageClasses.aside.eventsRel}>{e.rel}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
