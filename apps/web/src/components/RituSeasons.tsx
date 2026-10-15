import { useNavigate } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { useLocale } from "@/i18n/locale";
import { displayLocationLabel, type PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { RituSeasons as View } from "@vedic-patro/ui/kit/shell";

export { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";

/** The why-link and the header icon stay here. The cards are `@vedic-patro/ui/kit/shell`. */
export function RituSeasons({ location, showHeader = true }: { location: PanchangaLocation; showHeader?: boolean }) {
  const navigate = useNavigate();
  const { lang } = useLocale();
  return (
    <View
      location={location.params}
      showHeader={showHeader}
      placeLabel={displayLocationLabel(location, undefined, lang)}
      headerIcon={showHeader ? <Sprout className="self-center text-secondary dark:text-primary" size={18} strokeWidth={1.8} /> : undefined}
      onWhyPress={() => navigate({ to: "/learn/$slug", params: { slug: "ritu-drift" } })}
    />
  );
}
