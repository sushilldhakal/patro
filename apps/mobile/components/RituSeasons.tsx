import { useRouter } from "expo-router";
import { RituSeasons as View } from "@vedic-patro/ui/kit/shell";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";

export { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";

/** The why-link stays here. The cards are `@vedic-patro/ui/kit/shell`. */
export function RituSeasons({ location, showToolbar = true }: { location: PanchangaLocation; showToolbar?: boolean }) {
  const router = useRouter();
  return (
    <View
      location={location.params}
      showHeader={false}
      onWhyPress={showToolbar ? () => router.push(hrefForLearnSlug("ritu-drift")) : undefined}
    />
  );
}
