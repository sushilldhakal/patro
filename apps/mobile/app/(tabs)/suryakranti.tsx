import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SunTimesYearGrid } from "@/components/suryakranti/SunTimesYearGrid";
import { Text } from "@/components/ui/Text";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";
import { displayLocationLabel, resolveLocationTimezone, usePanchangaLocation } from "@/lib/use-panchanga-location";

export default function SuryakrantiScreen() {
  const { t, digits, lang } = useLocale();
  const { colors, isDark } = useTheme();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const timeZone = resolveLocationTimezone(location);

  const ayanaBody = t("sun_times.ayana_body");
  /* `<north>…</north>` / `<south>…</south>` mark the coloured terms (web `Trans`). */
  const ayanaParts = ayanaBody.split(/(<north>.*?<\/north>|<south>.*?<\/south>)/g).filter(Boolean);
  const locationLabel = displayLocationLabel(location, undefined, lang);

  return (
    <AppShell title={t("sun_times.title")} showHeader={false}>
      <View className="mb-4">
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" className={cn("flex-row self-start", sunTimesClasses.backLink)}>
            <Ionicons name="arrow-back" size={14} color={colors.foreground} />
            <Text className={sunTimesClasses.backLinkText} style={nepaliTextStyle()}>
              {t("common.back_home")}
            </Text>
          </Pressable>
        </Link>
        <Text className={sunTimesClasses.title} style={nepaliTextStyle()}>
          {t("sun_times.title")}
        </Text>
        <Text className={sunTimesClasses.subtitle} style={nepaliTextStyle()}>
          {t("sun_times.subtitle", { year: digits(year) })}
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

      <SunTimesYearGrid
        era={era}
        year={year}
        locationParams={location.params}
        timeZone={timeZone}
      />

      <View className={cn("mb-16 mt-4 gap-3", sunTimesClasses.ayanaCard)}>
        <View className={cn("flex-row", sunTimesClasses.ayanaTitleRow)}>
          <Ionicons name="calendar-outline" size={16} color={isDark ? colors.primary : colors.secondary} />
          <Text className={sunTimesClasses.ayanaTitle} style={nepaliTextStyle()}>
            {t("sun_times.ayana_title")}
          </Text>
        </View>
        <Text className={sunTimesClasses.ayanaBody} style={nepaliTextStyle()}>
          {ayanaParts.map((part, i) => {
            const north = /^<north>(.*)<\/north>$/.exec(part);
            const south = /^<south>(.*)<\/south>$/.exec(part);
            if (north) return <Text key={i} className={sunTimesClasses.ayanaNorth}>{north[1]}</Text>;
            if (south) return <Text key={i} className={sunTimesClasses.ayanaSouth}>{south[1]}</Text>;
            return part;
          })}
        </Text>
        {locationLabel ? (
          <Text className={sunTimesClasses.ayanaLocation} style={nepaliTextStyle()}>
            {t("location.label")}: {locationLabel}
          </Text>
        ) : null}
      </View>
    </AppShell>
  );
}
