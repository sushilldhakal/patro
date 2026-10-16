import { View } from "react-native";
import { useRouter } from "expo-router";
import { useGrahaVakriPage, type VakriEventView } from "@vedic-patro/features/graha";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/domain/utils";
import { AppShell } from "@/components/AppShell";
import { AllElementsLink, GrahaBanner, GrahaColumnCard, GrahaDescription } from "@vedic-patro/ui/kit/panchanga";
import { Grid } from "@vedic-patro/ui";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { TableRow } from "@/components/ui/DataTable";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { LoadingState } from "@/components/ui/States";

/** Graha vakri — the app's drawing of `useGrahaVakriPage` (@vedic-patro/features). */
export default function GrahaVakriScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useGrahaVakriPage({ year, era, location: location.params });

  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;

  return (
    <AppShell title={page.copy.title} showHeader={false}>
      <GrahaBanner icon="refresh-outline" title={page.copy.title} blurb={page.copy.blurb} />

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
        <LoadingState label={t("common.loading")} />
      ) : page.status === "ready" ? (
        <Grid cols={cols} gapX={12} className={grahaClasses.columns}>
          {page.groups.map((g) => (
            <GrahaColumnCard key={g.graha} tight width="100%" name={g.name} count={g.count}>
              {g.items.length ? (
                g.items.map((ev, i) => <EventRow key={i} ev={ev} index={i} />)
              ) : (
                <Text className={grahaClasses.columnEmpty} style={nepaliTextStyle(14)}>
                  {g.empty}
                </Text>
              )}
            </GrahaColumnCard>
          ))}
        </Grid>
      ) : (
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className={grahaClasses.stateText}>
          {t("common.load_error")}
        </Text>
      )}

      <GrahaDescription pageId={page.descriptionPageId} />
      <AllElementsLink onPress={() => router.push("/panchanga/details" as never)} />
    </AppShell>
  );
}

function EventRow({ ev, index }: { ev: VakriEventView; index: number }) {
  const colors = useThemeColors();
  const tone = ev.retrograde ? colors.danger : colors.success;
  return (
    <TableRow rowIndex={index} className={grahaClasses.eventRow}>
      <View className={cn("flex-row", grahaClasses.eventLabel)}>
        <Text style={{ color: tone }} className={grahaClasses.eventText}>
          {ev.arrow}
        </Text>
        <Text style={{ color: tone, ...nepaliTextStyle(13) }} className={grahaClasses.eventText}>
          {ev.label}
        </Text>
      </View>
      <Text className={grahaClasses.eventValue}>
        <Text className={grahaClasses.eventDate}>{ev.date}</Text>
        {ev.time ? <Text className={grahaClasses.eventTime}> · {ev.time}</Text> : null}
      </Text>
    </TableRow>
  );
}
