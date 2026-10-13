import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { AppShell } from "@/components/AppShell";
import {
  AllElementsLink,
  GrahaBanner,
  GrahaColumnCard,
  GrahaDescription,
} from "@/components/graha/GrahaPageParts";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { Text } from "@/components/ui/Text";
import {
  fetchGrahaAstaYear,
  grahaDetailKeys,
  type AstaStamp,
  type GrahaAstaPeriod,
} from "@/lib/api";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/domain/utils";

const GRAHA_ORDER: GrahaKey[] = ["mercury", "venus", "moon", "mars", "jupiter", "saturn"];

/** `2083-04-12` (era day key) → `साउन १२` / `Shrawan 12`. */
function formatEraDayLabel(eraDay: string, lang: "ne" | "en"): string {
  const parts = eraDay.split("-").map(Number);
  const month = parts[1];
  const day = parts[2];
  if (!month || !day) return eraDay;
  const monthName = lang === "en" ? BS_MONTH_NAMES[month - 1] : BS_MONTHS_NE[month - 1];
  return `${monthName} ${day}`;
}

function stampDate(stamp: AstaStamp | null, lang: "ne" | "en"): string {
  if (!stamp) return "";
  const eraDay = stamp.date?.trim();
  if (eraDay) return formatEraDayLabel(eraDay, lang);
  return lang === "en" ? (stamp.date_ad ?? stamp.date_bs ?? "") : (stamp.date_bs ?? stamp.date_ad ?? "");
}

function StampLine({
  label,
  stamp,
  tone,
}: {
  label: string;
  stamp: AstaStamp | null;
  tone: "asta" | "udaya";
}) {
  const { t, lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  return (
    <View className={cn("flex-row", grahaClasses.stampRow)}>
      <Text
        style={{ color: tone === "asta" ? colors.danger : colors.success, ...nepaliTextStyle(13) }}
        className={grahaClasses.stampLabel}
      >
        {label}
      </Text>
      {stamp ? (
        <Text className={grahaClasses.stampValue}>
          <Text>
            {digits(stampDate(stamp, lang))}
          </Text>
          <Text className={grahaClasses.stampTime}> · {digits(stamp.time_short)}</Text>
        </Text>
      ) : (
        <Text className={cn(grahaClasses.stampValue, grahaClasses.stampOutside)} style={nepaliTextStyle(13)}>
          {t("graha_pages.asta.outside_year")}
        </Text>
      )}
    </View>
  );
}

function PeriodCard({ period }: { period: GrahaAstaPeriod }) {
  const { t, pick, digits } = useLocale();
  const colors = useThemeColors();
  const hemi =
    period.hemisphere === "east"
      ? t("graha_pages.asta.east_morning")
      : period.hemisphere === "west"
        ? t("graha_pages.asta.west_evening")
        : "";

  return (
    <View
      style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }}
      className={cn("border", grahaClasses.periodCard)}
    >
      <StampLine label={t("graha_pages.asta.asta_begins")} stamp={period.start} tone="asta" />
      <StampLine label={t("graha_pages.asta.udaya_ends")} stamp={period.end} tone="udaya" />
      <View className={cn("flex-row", grahaClasses.periodFoot)}>
        <Text className={grahaClasses.periodFootText} style={nepaliTextStyle(11)}>
          {hemi}
        </Text>
        {period.duration_days != null ? (
          <Text className={grahaClasses.periodFootText} style={nepaliTextStyle(11)}>
            {pick(`${digits(period.duration_days)} दिन`, `${period.duration_days} days`)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function GrahaAstaScreen() {
  const { t, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();

  const query = useQuery({
    queryKey: grahaDetailKeys.asta(year, location.params),
    queryFn: () => fetchGrahaAstaYear(year, location.params),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  const byGraha = new Map<string, GrahaAstaPeriod[]>();
  for (const g of GRAHA_ORDER) byGraha.set(g, []);
  for (const p of query.data?.periods ?? []) {
    if (!byGraha.has(p.graha)) byGraha.set(p.graha, []);
    byGraha.get(p.graha)!.push(p);
  }

  return (
    <AppShell title={t("ui.panchanga.graha_asta")} showHeader={false}>
      <GrahaBanner
        icon="sunny-outline"
        title={t("ui.panchanga.graha_asta")}
        blurb={t("ui.panchanga.windows_where_each_graha_is_combust")}
      />

      <PatroYearNavBlock
        era={era}
        onEraChange={setEra}
        year={year}
        onYearChange={setYear}
        location={location}
        onLocationChange={setLocation}
        onToday={() => setYear(getCurrentBs().year)}
      />

      {query.isLoading && !query.data ? (
        <Text className={grahaClasses.stateText} style={nepaliTextStyle(14)}>
          {t("common.loading")}
        </Text>
      ) : query.data ? (
        <View className={cn("flex-row flex-wrap", grahaClasses.columns)}>
          {GRAHA_ORDER.map((g) => {
            const periods = byGraha.get(g) ?? [];
            return (
              <GrahaColumnCard
                key={g}
                width={cardWidth}
                name={pick(GRAHA_NAME[g].ne, GRAHA_NAME[g].en)}
                note={g === "moon" ? t("graha_pages.asta.tara_asta") : undefined}
                count={
                  periods.length
                    ? pick(`${digits(periods.length)} पटक`, `${periods.length}×`)
                    : t("graha_pages.asta.none")
                }
              >
                {periods.length ? (
                  periods.map((p, i) => <PeriodCard key={i} period={p} />)
                ) : (
                  <Text
                    className={grahaClasses.columnEmpty}
                    style={nepaliTextStyle(14)}
                  >
                    {t("graha_pages.asta.no_asta_year")}
                  </Text>
                )}
              </GrahaColumnCard>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className={grahaClasses.stateText}>
          {t("ui.common.could_not_load")}
        </Text>
      )}

      <GrahaDescription pageId="graha-asta" />
      <AllElementsLink />
    </AppShell>
  );
}
