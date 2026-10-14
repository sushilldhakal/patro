import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useQuery } from "@tanstack/react-query";
import { fetchGochar, gocharKeys, type LocationParams } from "@/lib/api";
import { formatClockNepali } from "@vedic-patro/domain/panchanga-format";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { patroCard } from "@/lib/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { tFor } from "@vedic-patro/i18n/runtime";

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
  get Mesha() { return tFor("ne", "rashis.1"); },
  get Vrishabha() { return tFor("ne", "rashis.2"); },
  get Mithuna() { return tFor("ne", "rashis.3"); },
  get Karka() { return tFor("ne", "rashis.4"); },
  get Karkata() { return tFor("ne", "rashis.4"); },
  get Simha() { return tFor("ne", "rashis.5"); },
  get Kanya() { return tFor("ne", "rashis.6"); },
  get Tula() { return tFor("ne", "rashis.7"); },
  get Vrishchika() { return tFor("ne", "rashis.8"); },
  get Dhanu() { return tFor("ne", "rashis.9"); },
  get Makara() { return tFor("ne", "rashis.10"); },
  get Kumbha() { return tFor("ne", "rashis.11"); },
  get Meena() { return tFor("ne", "rashis.12"); },
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
  const { pick, digits, t } = useLocale();
  const router = useRouter();
  const refDate = useMemo(() => new Date(`${dateAd}T12:00:00`), [dateAd]);

  const { data, isLoading, isError } = useQuery({
    queryKey: gocharKeys.dayLegacy(dateAd, "ad", location),
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
        ne: tFor("ne", "ui.panchanga.x_be9a266a", { v0: g.name_ne, v1: rashi }),
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
    <View className={`${patroCard} ${panchangaPageClasses.aside.eventsCard}`}>
      <View className={`flex-row ${panchangaPageClasses.aside.eventsHead}`}>
        <Text className={`${panchangaPageClasses.aside.eventsTitle} text-foreground`}>
          {t("panchanga.planet_events.title")}
        </Text>
        <Pressable
          onPress={() => router.push("/gochar" as never)}
          className={`${panchangaPageClasses.aside.eventsLink} active:opacity-80`}
        >
          <Text className={panchangaPageClasses.aside.eventsLinkText}>{t("gochar.view_more")}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Text className={panchangaPageClasses.aside.eventsStatus}>{t("common.loading")}</Text>
      ) : null}

      {isError ? (
        <Text className={panchangaPageClasses.aside.eventsStatus}>
          {t("panchanga.planet_events.load_error")}
        </Text>
      ) : null}

      {!isLoading && !isError && events.length === 0 ? (
        <Text className={panchangaPageClasses.aside.eventsStatus}>
          {t("panchanga.planet_events.no_upcoming")}
        </Text>
      ) : null}

      {!isLoading && !isError && events.length > 0 ? (
        <View className={panchangaPageClasses.aside.eventsList}>
          {events.map((e) => (
            <View
              key={e.key}
              className={panchangaPageClasses.aside.eventsRow}
            >
              <View className={panchangaPageClasses.aside.eventsBody}>
                <Text className={panchangaPageClasses.aside.eventsName}>{pick(e.ne, e.en)}</Text>
                <Text className={panchangaPageClasses.aside.eventsTime}>{e.time}</Text>
              </View>
              <Text className={panchangaPageClasses.aside.eventsRel}>
                {e.rel <= 0
                  ? t("today")
                  : t("ui.panchanga.rel_d", { rel: digits(e.rel) })}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
