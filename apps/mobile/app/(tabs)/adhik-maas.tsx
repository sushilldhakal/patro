import { Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAdhikMaasPage, type AdhikMaasView } from "@vedic-patro/features/adhik-maas";
import { usePatroYearBrowse } from "@vedic-patro/features/patro-date";
import { panchakClasses as pc } from "@vedic-patro/design-tokens/classes/panchak-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { Text } from "@/components/ui/Text";
import { LoadingState } from "@/components/ui/States";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroNoteBox } from "@/lib/patro-classes";
import { getCachedCalendarEraPreference } from "@/lib/patro-era-preference";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/** Adhik (mala) maas — the app's drawing of `useAdhikMaasPage` (@vedic-patro/features). */
export default function AdhikMaasScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  // The home notice opens a BS year (?year=2085); otherwise the reader's own era.
  const params = useLocalSearchParams<{ year?: string }>();
  const linkedYear = Number(params.year);
  const linked = Number.isInteger(linkedYear) && linkedYear > 0;
  const { era, setEra, year, setYear } = usePatroYearBrowse(linked ? { year: linkedYear } : undefined, {
    era: linked ? "bs" : getCachedCalendarEraPreference(),
  });
  const page = useAdhikMaasPage({ year, era });
  const nearbyWidth = width >= 640 ? "19%" : "48%";

  return (
    <AppShell title="" showHeader={false}>
      <View className="mb-4">
        <PageHeader
          icon={<AppNavIcon name="calendar-plus" size={28} color={colors.secondary} />}
          title={page.copy.title}
          subtitle={page.copy.subtitle}
        />
      </View>

      <PatroYearNavBlock
        className="mb-0"
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        location={location}
        onLocationChange={setLocation}
      />

      <View className={cn(patroNoteBox, "mt-4")}>
        <Text className={pc.introText} style={nepaliTextStyle()}>
          {page.copy.intro}
        </Text>
      </View>

      <View className={cn(pc.windows, "mt-4")}>
        <Text className={pc.sectionTitle} style={nepaliTextStyle()}>
          {page.copy.resultTitle}
        </Text>
        {!page.supported ? (
          <Text className={pc.noData} style={nepaliTextStyle()}>
            {page.copy.unsupported}
          </Text>
        ) : page.status === "loading" ? (
          <LoadingState label={page.copy.loading} />
        ) : page.status === "error" ? (
          <Text className={pc.errorText} style={nepaliTextStyle()}>
            {page.copy.error}
          </Text>
        ) : !page.months.length ? (
          <View className={pc.periodCard}>
            <Text className={pc.noData} style={nepaliTextStyle()}>
              {page.copy.none}
            </Text>
          </View>
        ) : (
          page.months.map((m) => <AdhikCard key={m.key} month={m} bsLabel={page.copy.bsLabel} adLabel={page.copy.adLabel} />)
        )}
        {page.kshaya ? (
          <View className={patroNoteBox}>
            <Text className={pc.introText} style={nepaliTextStyle()}>
              {page.kshaya}
            </Text>
          </View>
        ) : null}
      </View>

      {page.nearby.length ? (
        <View className={cn(pc.panel, "mt-4")}>
          <Text className={pc.panelTitleSpaced} style={nepaliTextStyle()}>
            {page.copy.nearbyTitle}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {page.nearby.map((y) => (
              <Pressable
                key={y.year}
                onPress={() => setYear(y.year)}
                accessibilityRole="button"
                accessibilityState={{ selected: y.active }}
                style={{ width: nearbyWidth as never }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 active:opacity-80",
                  y.active ? "border-secondary bg-secondary/10" : "border-border bg-card",
                )}
              >
                <Text className="text-xs text-muted-foreground" style={nepaliTextStyle()}>
                  {y.label}
                </Text>
                <Text
                  className={cn("text-sm font-semibold", y.month ? "text-foreground" : "text-muted-foreground")}
                  style={nepaliTextStyle()}
                >
                  {y.month === undefined ? "…" : (y.month ?? page.copy.nearbyNone)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className={cn(pc.panelLearn, "mt-4")}>
        <Text className={pc.panelTitle} style={nepaliTextStyle()}>
          {page.copy.learnTitle}
        </Text>
        {page.learn.map((block) => (
          <View key={block.key}>
            <Text className={pc.learnHeading} style={nepaliTextStyle()}>
              {block.title}
            </Text>
            <Text className={pc.learnBody} style={nepaliTextStyle()}>
              {block.body}
            </Text>
          </View>
        ))}
        <Pressable onPress={() => router.push(`/learn/${page.learnSlug}` as never)} accessibilityRole="link" className="self-start active:opacity-70">
          <Text className="text-sm font-medium text-secondary" style={nepaliTextStyle()}>
            {page.copy.readMore}
          </Text>
        </Pressable>
      </View>

      <View className={cn(pc.panel, "mt-4")}>
        <Text className={pc.panelTitleSpaced} style={nepaliTextStyle()}>
          {page.copy.observeTitle}
        </Text>
        <View className={pc.prohibitedList}>
          {page.observe.map((item, i) => (
            <View key={item.key} className={cn(pc.prohibitedItem, i === page.observe.length - 1 && "border-b-0 pb-0")}>
              <Text className={pc.itemTitle} style={nepaliTextStyle()}>
                {item.title}
              </Text>
              <Text className={pc.itemDesc} style={nepaliTextStyle()}>
                {item.body}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </AppShell>
  );
}

function AdhikCard({ month, bsLabel, adLabel }: { month: AdhikMaasView; bsLabel: string; adLabel: string }) {
  const { width } = useBreakpoint();
  return (
    <View className={pc.periodCard}>
      <View className={pc.periodHead}>
        <Text className="text-lg font-bold text-secondary" style={nepaliTextStyle()}>
          {month.name}
        </Text>
        <View className={pc.varietyBadge}>
          <Text className={pc.varietyText} style={nepaliTextStyle()}>
            {month.days}
          </Text>
        </View>
      </View>
      <View className={width >= 640 ? "flex-row gap-4" : "gap-4"}>
        {[
          { label: bsLabel, value: month.bsRange },
          { label: adLabel, value: month.adRange },
        ].map((b) => (
          <View key={b.label} className={cn(pc.boundary, "flex-1")}>
            <Text className={pc.boundaryLabel} style={nepaliTextStyle()}>
              {b.label}
            </Text>
            <Text className={pc.boundaryValue} style={nepaliTextStyle()}>
              {b.value}
            </Text>
          </View>
        ))}
      </View>
      <Text className={pc.duration} style={nepaliTextStyle()}>
        {month.nijNote}
      </Text>
    </View>
  );
}
