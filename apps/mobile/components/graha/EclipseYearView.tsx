import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { AppShell } from "@/components/AppShell";
import {
  AllElementsLink,
  GrahaBanner,
  GrahaDescription,
} from "@/components/graha/GrahaPageParts";
import { EclipseCard, EmptyHint } from "@/components/graha/GrahaEventCards";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { fetchEclipseYear, grahaDetailKeys } from "@/lib/api";
import { getCurrentBs } from "@/lib/bs-calendar";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";

const CONFIG = {
  solar: {
    pageId: "surya-grahan" as const,
    icon: "sunny-outline" as const,
    titleNe: "सूर्य ग्रहण",
    titleEn: "Solar eclipse",
    blurbNe:
      "वर्षभरका सूर्य ग्रहण — प्रकार, चरम समय र नेपालबाट देखिने/नदेखिने।",
    blurbEn:
      "Solar eclipses for the year — type, maximum time, and visibility from Nepal.",
  },
  lunar: {
    pageId: "chandra-grahan" as const,
    icon: "moon-outline" as const,
    titleNe: "चन्द्र ग्रहण",
    titleEn: "Lunar eclipse",
    blurbNe:
      "वर्षभरका चन्द्र ग्रहण — प्रकार, चरम समय र नेपालबाट देखिने/नदेखिने।",
    blurbEn:
      "Lunar eclipses for the year — type, maximum time, and visibility from Nepal.",
  },
};

export function EclipseYearView({ kind }: { kind: "solar" | "lunar" }) {
  const { pick } = useLocale();
  const { width } = useBreakpoint();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const cfg = CONFIG[kind];

  const query = useQuery({
    queryKey: grahaDetailKeys.eclipse(kind, year, location.params, era),
    queryFn: () => fetchEclipseYear(kind, year, location.params, era),
    staleTime: 1000 * 60 * 30,
  });

  const cols = width >= 768 ? 2 : 1;

  return (
    <AppShell title={pick(cfg.titleNe, cfg.titleEn)} showHeader={false}>
      <GrahaBanner icon={cfg.icon} title={pick(cfg.titleNe, cfg.titleEn)} blurb={pick(cfg.blurbNe, cfg.blurbEn)} />

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
        <LoadingState />
      ) : query.isError ? (
        <ErrorState />
      ) : !query.data?.events?.length ? (
        <EmptyHint ne="यो वर्षमा ग्रहण छैन" en="No eclipses this year" />
      ) : (
        <View className="mt-2 flex-row flex-wrap gap-3">
          {query.data.events.map((ev, i) => (
            <View key={`${ev.date_ad ?? ev.date_jd_date ?? i}-${i}`} style={{ width: cols === 2 ? "48%" : "100%" }}>
              <EclipseCard ev={ev} pageId={cfg.pageId} />
            </View>
          ))}
        </View>
      )}

      <GrahaDescription pageId={cfg.pageId} />
      <AllElementsLink />
    </AppShell>
  );
}
