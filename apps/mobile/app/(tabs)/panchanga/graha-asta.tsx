import { View } from "react-native";
import { useGrahaAstaPage, type AstaPeriodView } from "@vedic-patro/features/graha";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/domain/utils";
import { AppShell } from "@/components/AppShell";
import { AllElementsLink, GrahaBanner, GrahaColumnCard, GrahaDescription } from "@/components/graha/GrahaPageParts";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";

/** Graha asta — the app's drawing of `useGrahaAstaPage` (@vedic-patro/features). */
export default function GrahaAstaScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useGrahaAstaPage({ year, era, location: location.params });

  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  return (
    <AppShell title={page.copy.title} showHeader={false}>
      <GrahaBanner icon="sunny-outline" title={page.copy.title} blurb={page.copy.blurb} />

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
        <Text className={grahaClasses.stateText} style={nepaliTextStyle(14)}>
          {t("common.loading")}
        </Text>
      ) : page.status === "ready" ? (
        <View className={cn("flex-row flex-wrap", grahaClasses.columns)}>
          {page.groups.map((g) => (
            <GrahaColumnCard key={g.graha} width={cardWidth} name={g.name} note={g.note} count={g.count}>
              {g.items.length ? (
                g.items.map((p, i) => <PeriodCard key={i} period={p} />)
              ) : (
                <Text className={grahaClasses.columnEmpty} style={nepaliTextStyle(14)}>
                  {g.empty}
                </Text>
              )}
            </GrahaColumnCard>
          ))}
        </View>
      ) : (
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className={grahaClasses.stateText}>
          {t("common.load_error")}
        </Text>
      )}

      <GrahaDescription pageId={page.descriptionPageId} />
      <AllElementsLink />
    </AppShell>
  );
}

function PeriodCard({ period }: { period: AstaPeriodView }) {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }} className={cn("border", grahaClasses.periodCard)}>
      {period.stamps.map((s) => (
        <View key={s.label} className={cn("flex-row", grahaClasses.stampRow)}>
          <Text
            style={{ color: s.tone === "asta" ? colors.danger : colors.success, ...nepaliTextStyle(13) }}
            className={grahaClasses.stampLabel}
          >
            {s.label}
          </Text>
          {s.date !== undefined ? (
            <Text className={grahaClasses.stampValue}>
              <Text>{s.date}</Text>
              <Text className={grahaClasses.stampTime}> · {s.time}</Text>
            </Text>
          ) : (
            <Text className={cn(grahaClasses.stampValue, grahaClasses.stampOutside)} style={nepaliTextStyle(13)}>
              {s.outside}
            </Text>
          )}
        </View>
      ))}
      <View className={cn("flex-row", grahaClasses.periodFoot)}>
        <Text className={grahaClasses.periodFootText} style={nepaliTextStyle(11)}>
          {period.hemisphere}
        </Text>
        {period.duration ? (
          <Text className={grahaClasses.periodFootText} style={nepaliTextStyle(11)}>
            {period.duration}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
