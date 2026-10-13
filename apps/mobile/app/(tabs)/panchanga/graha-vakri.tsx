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
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { TableRow } from "@/components/ui/DataTable";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/domain/utils";

const GRAHA_ORDER: GrahaKey[] = ["mercury", "venus", "mars", "jupiter", "saturn"];

function EventRow({ ev, index }: { ev: GrahaVakriEvent; index: number }) {
  const { pick, digits } = useLocale();
  const colors = useThemeColors();
  const isVakri = ev.is_retrograde === true || ev.motion === "Vakri";
  const tone = isVakri ? colors.danger : colors.success;
  const dateLabel = ev.entry_jd_date?.trim() ?? ev.entry_time_local?.slice(0, 10) ?? "";
  const timeLabel = ev.entry_time_local_short ?? "";

  return (
    <TableRow rowIndex={index} className={grahaClasses.eventRow}>
      <View className={cn("flex-row", grahaClasses.eventLabel)}>
        <Text style={{ color: tone }} className={grahaClasses.eventText}>
          {isVakri ? "↺" : "→"}
        </Text>
        <Text style={{ color: tone, ...nepaliTextStyle(13) }} className={grahaClasses.eventText}>
          {isVakri ? pick("वक्री", "Retrograde") : pick("मार्गी", "Direct")}
        </Text>
      </View>
      <Text className={grahaClasses.eventValue}>
        <Text className={grahaClasses.eventDate}>{digits(dateLabel)}</Text>
        {timeLabel ? (
          <Text className={grahaClasses.eventTime}> · {digits(timeLabel)}</Text>
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
        <Text className={grahaClasses.stateText} style={nepaliTextStyle(14)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      ) : query.data ? (
        <View className={cn("flex-row flex-wrap", grahaClasses.columns)}>
          {GRAHA_ORDER.map((g) => {
            const events = byGraha.get(g) ?? [];
            return (
              <GrahaColumnCard
                key={g}
                tight
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
                    className={grahaClasses.columnEmpty}
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
        <Text style={{ color: colors.destructive, ...nepaliTextStyle(14) }} className={grahaClasses.stateText}>
          {pick("ल्याउन सकिएन।", "Could not load.")}
        </Text>
      )}

      <GrahaDescription pageId="graha-vakri" />
      <AllElementsLink />
    </AppShell>
  );
}
