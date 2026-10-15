import { View } from "react-native";
import { usePanchakPage, type PanchakCardView } from "@vedic-patro/features/panchak";
import { panchakClasses as pc } from "@vedic-patro/design-tokens/classes/panchak-classes";
import { illustration } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/domain/utils";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { patroNoteBox } from "@/lib/patro-classes";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/** Panchak patro — the app's drawing of `usePanchakPage` (@vedic-patro/features). */
export default function PanchakPatroScreen() {
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = usePanchakPage({ year, era, location: location.params });
  const cardWidth = width >= 1024 ? "49%" : "100%";

  return (
    <AppShell title="" showHeader={false}>
      <View className="mb-4">
        <PageHeader
          icon={<Ionicons name="calendar-outline" size={28} color={colors.secondary} />}
          title={page.copy.title}
          subtitle={page.copy.subtitle}
        />
      </View>

      <PatroYearNavBlock
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        gregorianRange={page.gregorianRange}
        location={location}
        onLocationChange={setLocation}
      />

      <View className={cn(patroNoteBox, "mt-4")}>
        <Text className={pc.introText} style={nepaliTextStyle()}>
          {page.copy.intro}
        </Text>
      </View>

      {page.status === "loading" ? (
        <Text className={pc.noData} style={nepaliTextStyle()}>
          {page.copy.loading}
        </Text>
      ) : page.status === "error" ? (
        <Text className={pc.errorText} style={nepaliTextStyle()}>
          {page.copy.error}
        </Text>
      ) : !page.cards.length ? (
        <Text className={pc.noData} style={nepaliTextStyle()}>
          {page.copy.noData}
        </Text>
      ) : (
        <View className={pc.windows}>
          <View className={pc.windowsHeading}>
            <Ionicons name="warning-outline" size={16} color={illustration.amber67} />
            <Text className={pc.sectionTitle} style={nepaliTextStyle()}>
              {page.copy.periodsTitle}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {page.cards.map((card) => (
              <PeriodCard key={card.key} card={card} width={cardWidth} durationLabel={page.copy.duration} />
            ))}
          </View>
        </View>
      )}

      <View className={cn(pc.panel, "mt-4")}>
        <Text className={pc.panelTitleSpaced} style={nepaliTextStyle()}>
          {page.copy.prohibitedTitle}
        </Text>
        <View className={pc.prohibitedList}>
          {page.prohibited.map((item, i) => (
            <View key={item.key} className={cn(pc.prohibitedItem, i === page.prohibited.length - 1 && "border-b-0 pb-0")}>
              <Text className={pc.itemTitle} style={nepaliTextStyle()}>
                {item.title}
              </Text>
              <Text className={pc.itemDesc} style={nepaliTextStyle()}>
                {item.desc}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className={cn(pc.panelLearn, "mt-4")}>
        <Text className={pc.panelTitle} style={nepaliTextStyle()}>
          {page.copy.learnTitle}
        </Text>
        {page.learn.map((block) => (
          <View key={block.title}>
            <Text className={pc.learnHeading} style={nepaliTextStyle()}>
              {block.title}
            </Text>
            <Text className={pc.learnBody} style={nepaliTextStyle()}>
              {block.body}
            </Text>
          </View>
        ))}
        <View>
          <Text className={pc.learnHeadingSpaced} style={nepaliTextStyle()}>
            {page.copy.typesTitle}
          </Text>
          <View className={pc.typesList}>
            {page.varieties.map((v) => (
              <Text key={v.id} className={pc.typeItem} style={nepaliTextStyle()}>
                <Text className={pc.typeName}>{v.name}</Text>
                {" — "}
                {v.note}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </AppShell>
  );
}

function PeriodCard({ card, width, durationLabel }: { card: PanchakCardView; width: string; durationLabel: string }) {
  const { width: screenWidth } = useBreakpoint();
  return (
    <View style={{ width: width as never }} className={pc.periodCard}>
      <View className={pc.periodHead}>
        <Text className={pc.periodTitle} style={nepaliTextStyle()}>
          {card.title}
        </Text>
        {card.variety ? (
          <View className={pc.varietyBadge}>
            <Text className={pc.varietyText} style={nepaliTextStyle()}>
              {card.variety}
            </Text>
          </View>
        ) : null}
      </View>
      <View className={screenWidth >= 640 ? "flex-row gap-4" : "gap-4"}>
        {[card.start, card.end].map((b) => (
          <View key={b.label} className={cn(pc.boundary, "flex-1")}>
            <Text className={pc.boundaryLabel} style={nepaliTextStyle()}>
              {b.label}
            </Text>
            <Text className={pc.boundaryValue} style={nepaliTextStyle()}>
              {b.bs}
            </Text>
            <Text className={pc.boundaryAd} style={nepaliTextStyle()}>
              {b.ad}
            </Text>
          </View>
        ))}
      </View>
      <Text className={pc.duration} style={nepaliTextStyle()}>
        {durationLabel}: <Text className={pc.durationValue}>{card.duration}</Text>
      </Text>
    </View>
  );
}
