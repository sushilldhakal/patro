import { useMemo } from "react";
import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import { useQuery } from "@tanstack/react-query";
import { fetchGochar, gocharKeys, type LocationParams } from "@/lib/api";
import { formatClockNepali } from "@/lib/panchanga-format.web";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";

const GRAHA_ORDER = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
] as const satisfies readonly GrahaKey[];

const RASHI_EN_NE: Record<string, string> = {
  Mesha: "मेष",
  Vrishabha: "वृष",
  Mithuna: "मिथुन",
  Karka: "कर्कट",
  Karkata: "कर्कट",
  Simha: "सिंह",
  Kanya: "कन्या",
  Tula: "तुला",
  Vrishchika: "वृश्चिक",
  Dhanu: "धनु",
  Makara: "मकर",
  Kumbha: "कुम्भ",
  Meena: "मीन",
};

function rashiNe(english?: string): string {
  if (!english) return "—";
  return RASHI_EN_NE[english] ?? english;
}

function localTimePart(entryLocal: string): string {
  const m = entryLocal.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : entryLocal;
}

function daysUntil(entryLocal: string, refDate: Date): number {
  const entryDay = entryLocal.slice(0, 10);
  const ref = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}-${String(refDate.getDate()).padStart(2, "0")}`;
  const a = new Date(`${entryDay}T12:00:00`);
  const b = new Date(`${ref}T12:00:00`);
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

type Props = {
  dateAd: string;
  location: LocationParams;
};

export function PlanetEventsPanel({ dateAd, location }: Props) {
  const { pick, digits } = useLocale();
  const refDate = useMemo(() => new Date(`${dateAd}T12:00:00`), [dateAd]);

  const { data, isLoading, isError } = useQuery({
    queryKey: gocharKeys.day(dateAd, "ad", location),
    queryFn: () => fetchGochar(dateAd, "ad", location),
    staleTime: 1000 * 60 * 60,
  });

  const events = useMemo(() => {
    if (!data?.gochar) return [];
    const rows = GRAHA_ORDER.map((key) => {
      const g = data.gochar[key];
      const entry = g?.next_rashi_entry;
      if (!g || !entry?.entry_time_local) return null;
      const rashi = rashiNe(entry.to_rashi);
      const time = formatClockNepali(localTimePart(entry.entry_time_local)) ?? "—";
      const rel = daysUntil(entry.entry_time_local, refDate);
      const enName = GRAHA_NAME[key].en;
      return {
        key,
        ne: `${g.name_ne} ${rashi}मा प्रवेश`,
        en: `${enName} enters ${entry.to_rashi}`,
        time,
        rel,
        sortKey: entry.entry_time_local,
      };
    }).filter((e): e is NonNullable<typeof e> => e != null);

    rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return rows;
  }, [data, refDate]);

  return (
    <View className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Text className="text-body mb-2 font-bold text-foreground">
        {pick("आगामी ग्रह-गोचर", "Planetary events")}
      </Text>

      {isLoading ? (
        <Text className="text-body py-4 text-muted-foreground">{pick("लोड हुँदै…", "Loading…")}</Text>
      ) : null}

      {isError ? (
        <Text className="text-body py-4 text-muted-foreground">
          {pick("ग्रह-गोचर लोड गर्न सकिएन।", "Could not load planetary events.")}
        </Text>
      ) : null}

      {!isLoading && !isError && events.length === 0 ? (
        <Text className="text-body py-4 text-muted-foreground">
          {pick("कुनै आगामी गोचर छैन।", "No upcoming transits.")}
        </Text>
      ) : null}

      {!isLoading && !isError && events.length > 0 ? (
        <View>
          {events.map((e) => (
            <View
              key={e.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(128,128,128,0.2)",
                paddingVertical: 8,
              }}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text className="text-body font-semibold text-foreground">{pick(e.ne, e.en)}</Text>
                <Text className="text-body font-mono font-semibold text-foreground">{e.time}</Text>
              </View>
              <Text className="text-body shrink-0 font-mono font-semibold text-foreground">
                {e.rel <= 0
                  ? pick("आज", "Today")
                  : pick(`${digits(e.rel)} दिन`, `${digits(e.rel)}d`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
