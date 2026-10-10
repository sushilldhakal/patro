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
import { getCurrentBs } from "@vedic-patro/domain/bs-calendar";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { Text } from "@/components/ui/Text";
import { fetchGrahaVakriYear, grahaDetailKeys, type GrahaVakriEvent } from "@/lib/api";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { TableRow } from "@/components/ui/DataTable";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";

const GRAHA_ORDER: GrahaKey[] = ["mercury", "venus", "mars", "jupiter", "saturn"];

function EventRow({ ev, index }: { ev: GrahaVakriEvent; index: number }) {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const isVakri = ev.is_retrograde === true || ev.motion === "Vakri";
  const tone = isVakri ? colors.danger : colors.accent;
  const dateLabel = ev.entry_jd_date?.trim() ?? ev.entry_time_local?.slice(0, 10) ?? "";
  const timeLabel = ev.entry_time_local_short ?? "";

  return (
    <TableRow rowIndex={index} className="items-center justify-between gap-2 rounded-md px-2.5 py-1.5">
      <View className="flex-row items-center gap-1.5">
        <Text style={{ color: tone }} className="text-body font-semibold">
          {isVakri ? "↺" : "→"}
        </Text>
        <Text style={{ color: tone, ...nepaliTextStyle(13) }} className="text-body font-semibold">
          {isVakri ? pick("वक्री", "Retrograde") : pick("मार्गी", "Direct")}
        </Text>
      </View>
      <Text className="text-body text-right">
        <Text className="font-num font-semibold text-foreground">{digits(dateLabel)}</Text>
        {timeLabel ? (
          <Text className="font-num text-muted-foreground"> · {digits(timeLabel)}</Text>
        ) : null}
      </Text>
    </TableRow>
  );
}

export default function GrahaVakriScreen() {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();

  const query = useQuery({
    queryKey: grahaDetailKeys.vakri(year, location.params),
    queryFn: () => fetchGrahaVakriYear(year, location.params),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  const byGraha = new Map<string, GrahaVakriEvent[]>();
  for (const g of GRAHA_ORDER) byGraha.set(g, []);
  for (const ev of query.data?.events ?? []) {
    if (!byGraha.has(ev.graha)) byGraha.set(ev.graha, []);
    byGraha.get(ev.graha)!.push(ev);
  }

  return (
    <AppShell title={pick("ग्रह वक्री", "Graha Vakri")} showHeader={false}>
      <GrahaBanner
        icon="refresh-outline"
        title={pick("ग्रह वक्री", "Graha Vakri")}
        blurb={pick(
          "बुध, शुक्र, मङ्गल, बृहस्पति र शनिका वक्री–मार्गी क्षणहरू।",
          "Retrograde and direct stations for Mercury, Venus, Mars, Jupiter and Saturn.",
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
            const events = byGraha.get(g) ?? [];
            return (
              <GrahaColumnCard
                key={g}
                width={cardWidth}
                name={pick(GRAHA_NAME[g].ne, GRAHA_NAME[g].en)}
                count={
                  events.length
                    ? pick(`${digits(events.length)} स्थिति`, `${events.length} stations`)
                    : pick("कुनै स्थिति छैन", "no stations")
                }
              >
                {events.length ? (
                  events.map((ev, i) => <EventRow key={i} ev={ev} index={i} />)
                ) : (
                  <Text
                    className="text-body px-2 py-1.5 text-muted-foreground"
                    style={nepaliTextStyle(14)}
                  >
                    {pick("यस वर्ष वक्री हुँदैन।", "No retrograde this year.")}
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

      <GrahaDescription pageId="graha-vakri" />
      <AllElementsLink />
    </AppShell>
  );
}
