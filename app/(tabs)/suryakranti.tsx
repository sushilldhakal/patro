import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SunTimesYearGrid } from "@/components/suryakranti/SunTimesYearGrid";
import { Text } from "@/components/ui/Text";
import { getCurrentBs } from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { useThemeColors } from "@/lib/theme-context";
import { resolveLocationTimezone, usePanchangaLocation } from "@/lib/use-panchanga-location";

export default function SuryakrantiScreen() {
  const { pick, t, digits } = useLocale();
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const timeZone = resolveLocationTimezone(location);

  return (
    <AppShell title={pick("सूर्य क्रान्ति", "Sun Revolution")} showHeader={false}>
      <View className="mb-3">
        <Text className="text-xl font-bold leading-tight text-foreground" style={nepaliTextStyle(20)}>
          {t("sun_times.title")}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
          {t("sun_times.subtitle", { year: digits(year) })}
        </Text>
      </View>

      <PatroYearNavBlock
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

      <View
        style={{ borderColor: colors.border }}
        className="mt-4 gap-3 rounded-2xl border bg-card p-4"
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="calendar-outline" size={15} color={colors.secondary} />
          <Text className="text-base font-bold text-foreground" style={nepaliTextStyle(16)}>
            {pick("अयन", "Ayana")}
          </Text>
        </View>
        <Text className="text-sm leading-relaxed text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick(
            "प्रत्येक दिनको उ वा द सूर्योदयको बेला सूर्य कुन राशिमा छ भन्ने आधारमा तय हुन्छ — वर्षमा दुई पटक सङ्क्रान्तिमा परिवर्तन।",
            "Each day's N or S mark follows the Sun's sign at sunrise — it changes twice a year at sankranti.",
          )}
        </Text>
      </View>
    </AppShell>
  );
}
