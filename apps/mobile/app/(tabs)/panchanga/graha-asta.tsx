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
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

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
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-start justify-between gap-2">
      <Text
        style={{ color: tone === "asta" ? colors.danger : colors.accent, ...nepaliTextStyle(13) }}
        className="text-body font-semibold"
      >
        {label}
      </Text>
      {stamp ? (
        <Text className="text-body text-right">
          <Text className="font-num font-semibold text-foreground">
            {digits(stampDate(stamp, lang))}
          </Text>
          <Text className="font-num text-muted-foreground"> · {digits(stamp.time_short)}</Text>
        </Text>
      ) : (
        <Text className="text-body text-right text-muted-foreground" style={nepaliTextStyle(13)}>
          {pick("वर्ष बाहिर", "outside year")}
        </Text>
      )}
    </View>
  );
}

function PeriodCard({ period }: { period: GrahaAstaPeriod }) {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const hemi =
    period.hemisphere === "east"
      ? pick("पूर्वमा (बिहान)", "East (morning)")
      : period.hemisphere === "west"
        ? pick("पश्चिममा (साँझ)", "West (evening)")
        : "";

  return (
    <View
      style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }}
      className="gap-1.5 rounded-lg border p-2.5"
    >
      <StampLine label={pick("अस्त आरम्भ", "Asta begins")} stamp={period.start} tone="asta" />
      <StampLine label={pick("उदय (अन्त्य)", "Udaya (ends)")} stamp={period.end} tone="udaya" />
      <View className="flex-row items-baseline justify-between gap-2 border-t border-border pt-1">
        <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
          {hemi}
        </Text>
        {period.duration_days != null ? (
          <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
            {pick(`${digits(period.duration_days)} दिन`, `${period.duration_days} days`)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function GrahaAstaScreen() {
  const { pick, digits } = useLocale();
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
    <AppShell title={pick("ग्रह अस्त", "Graha Asta")} showHeader={false}>
      <GrahaBanner
        icon="sunny-outline"
        title={pick("ग्रह अस्त", "Graha Asta")}
        blurb={pick(
          "ग्रहहरू सूर्यको नजिक परेर अस्त हुने र पुनः उदय हुने अवधिहरू।",
          "Windows where each graha is combust near the Sun and when it rises again.",
        )}
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
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      ) : query.data ? (
        <View className="mt-2 flex-row flex-wrap">
          {GRAHA_ORDER.map((g) => {
            const periods = byGraha.get(g) ?? [];
            return (
              <GrahaColumnCard
                key={g}
                width={cardWidth}
                name={pick(GRAHA_NAME[g].ne, GRAHA_NAME[g].en)}
                note={g === "moon" ? pick("(तारा अस्त)", "(Tara Asta)") : undefined}
                count={
                  periods.length
                    ? pick(`${digits(periods.length)} पटक`, `${periods.length}×`)
                    : pick("छैन", "none")
                }
              >
                {periods.length ? (
                  periods.map((p, i) => <PeriodCard key={i} period={p} />)
                ) : (
                  <Text
                    className="text-body px-2 py-1.5 text-muted-foreground"
                    style={nepaliTextStyle(14)}
                  >
                    {pick("यस वर्ष अस्त छैन।", "No asta this year.")}
                  </Text>
                )}
              </GrahaColumnCard>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className="text-body">
          {pick("ल्याउन सकिएन।", "Could not load.")}
        </Text>
      )}

      <GrahaDescription pageId="graha-asta" />
      <AllElementsLink />
    </AppShell>
  );
}
