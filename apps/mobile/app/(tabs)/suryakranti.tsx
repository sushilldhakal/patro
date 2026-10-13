import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { useSunTimesPage } from "@vedic-patro/features/sun-times";
import { Trans } from "@vedic-patro/i18n/react";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SunTimesYearGrid } from "@/components/suryakranti/SunTimesYearGrid";
import { Text } from "@/components/ui/Text";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

/**
 * Sun times — the app's drawing of `useSunTimesPage` (@vedic-patro/features).
 * The year, era and place live in screen state here.
 */
export default function SuryakrantiScreen() {
  const { colors, isDark } = useTheme();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useSunTimesPage({ year, era, location });
  const { copy } = page;

  return (
    <AppShell title={copy.title} showHeader={false}>
      <View className="mb-4">
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" className={cn("flex-row self-start", sunTimesClasses.backLink)}>
            <Ionicons name="arrow-back" size={14} color={colors.foreground} />
            <Text className={sunTimesClasses.backLinkText} style={nepaliTextStyle()}>
              {copy.backHome}
            </Text>
          </Pressable>
        </Link>
        <Text className={sunTimesClasses.title} style={nepaliTextStyle()}>
          {copy.title}
        </Text>
        <Text className={sunTimesClasses.subtitle} style={nepaliTextStyle()}>
          {copy.subtitle}
        </Text>
      </View>

      <PatroYearNavBlock
        className="mb-0"
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        location={location}
        onLocationChange={setLocation}
        onToday={() => setYear(getCurrentBs().year)}
      />

      <SunTimesYearGrid page={page} />

      <View className={cn("mb-16 mt-4 gap-3", sunTimesClasses.ayanaCard)}>
        <View className={cn("flex-row", sunTimesClasses.ayanaTitleRow)}>
          <Ionicons name="calendar-outline" size={16} color={isDark ? colors.primary : colors.secondary} />
          <Text className={sunTimesClasses.ayanaTitle} style={nepaliTextStyle()}>
            {copy.ayanaTitle}
          </Text>
        </View>
        <Text className={sunTimesClasses.ayanaBody} style={nepaliTextStyle()}>
          <Trans
            i18nKey={copy.ayanaBodyKey}
            components={{
              north: <Text className={sunTimesClasses.ayanaNorth} />,
              south: <Text className={sunTimesClasses.ayanaSouth} />,
            }}
          />
        </Text>
        {copy.locationLine ? (
          <Text className={sunTimesClasses.ayanaLocation} style={nepaliTextStyle()}>
            {copy.locationLine}
          </Text>
        ) : null}
      </View>
    </AppShell>
  );
}
