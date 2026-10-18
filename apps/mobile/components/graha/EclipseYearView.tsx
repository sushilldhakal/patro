import { View } from "react-native";
import { useRouter } from "expo-router";
import { useEclipsePage, type EclipseKind } from "@vedic-patro/features/graha";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { AppShell } from "@/components/AppShell";
import { AllElementsLink, GrahaBanner, GrahaDescription } from "@vedic-patro/ui/kit/panchanga";
import { EclipseCard, EmptyHint } from "@/components/graha/GrahaEventCards";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { useBreakpoint } from "@/lib/responsive";

/** Solar / lunar eclipses — the app's drawing of `useEclipsePage` (@vedic-patro/features). */
export function EclipseYearView({ kind }: { kind: EclipseKind }) {
  const router = useRouter();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useEclipsePage(kind, { year, era, location: location.params });
  const cols = width >= 768 ? 2 : 1;

  return (
    <AppShell title={page.copy.title} showHeader={false}>
      <GrahaBanner icon={kind === "solar" ? "sunny-outline" : "moon-outline"} title={page.copy.title} blurb={page.copy.blurb} />

      <PatroYearNavBlock
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={page.gregorianRange}
        location={location}
        onLocationChange={setLocation}
        onToday={() => setYear(getCurrentBs().year)}
      />

      {page.status === "loading" ? (
        <LoadingState />
      ) : page.status === "error" ? (
        <ErrorState />
      ) : !page.cards.length ? (
        <EmptyHint text={page.copy.none} />
      ) : (
        <View className={cn("flex-row flex-wrap", grahaClasses.eclipseGrid)}>
          {page.cards.map((card) => (
            <View key={card.key} style={{ width: cols === 2 ? "48%" : "100%" }}>
              <EclipseCard card={card} />
            </View>
          ))}
        </View>
      )}

      <GrahaDescription pageId={page.descriptionPageId} />
      <AllElementsLink onPress={() => router.push("/panchanga/details" as never)} />
    </AppShell>
  );
}
