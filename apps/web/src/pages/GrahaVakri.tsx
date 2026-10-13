import { getRouteApi } from "@tanstack/react-router";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { GrahaGroupedEventCards } from "@/components/graha/GrahaGroupedEventCards";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import {
  usePatroYearDataPage,
  usePatroYearDataQuery,
} from "@/hooks/use-patro-year-data-page";
import { useLocale } from "@/i18n/locale";
import { grahaName } from "@/lib/graha-i18n";
import { cn } from "@vedic-patro/domain/utils";
import {
  fetchGrahaVakriYear,
  grahaDetailKeys,
  type GrahaVakriEvent,
} from "@/lib/api";

const routeApi = getRouteApi("/panchanga-shell/panchanga/graha-vakri");

const GRAHA_ORDER = ["mercury", "venus", "mars", "jupiter", "saturn"];

function renderedEntryDate(ev: GrahaVakriEvent): string {
  const label = ev.entry_jd_date?.trim();
  if (!label) {
    throw new Error("Graha vakri event missing entry_jd_date (stale gv= cache?)");
  }
  return label;
}

function EventRow({ ev }: { ev: GrahaVakriEvent }) {
  const { digits } = useLocale();
  const { t } = useTranslation();
  const isVakri = ev.is_retrograde === true || ev.motion === "Vakri";
  const dateLabel = renderedEntryDate(ev);
  const timeLabel = ev.entry_time_local_short ?? "";
  return (
    <div className={cn(grahaClasses.eventRow, grahaClasses.eventText, "flex odd:bg-foreground/[0.03]")}>
      <span className={cn(grahaClasses.eventLabel, "flex")}>
        <span className={cn(grahaClasses.eventText, isVakri ? grahaClasses.toneRetro : grahaClasses.toneDirect)}>
          {isVakri ? "↺" : "→"}
        </span>
        <span className={cn(grahaClasses.eventText, isVakri ? grahaClasses.toneRetro : grahaClasses.toneDirect)}>
          {t(isVakri ? "graha_pages.vakri.retrograde" : "graha_pages.vakri.direct")}
        </span>
      </span>
      <span className={grahaClasses.eventValue}>
        <span className={grahaClasses.eventDate}>{digits(dateLabel)}</span>
        {timeLabel ? (
          <span className={grahaClasses.eventTime}> · {digits(timeLabel)}</span>
        ) : null}
      </span>
    </div>
  );
}

export function GrahaVakri() {
  const { lang } = useLocale();
  const { t } = useTranslation();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);

  const query = usePatroYearDataQuery({ location, setLocation, yearBrowse }, {
    queryKey: grahaDetailKeys.vakri,
    queryFn: fetchGrahaVakriYear,
  });

  const byGraha = useMemo(() => {
    const groups = new Map<string, GrahaVakriEvent[]>();
    for (const g of GRAHA_ORDER) groups.set(g, []);
    for (const ev of query.data?.events ?? []) {
      if (!groups.has(ev.graha)) groups.set(ev.graha, []);
      groups.get(ev.graha)!.push(ev);
    }
    return groups;
  }, [query.data?.events]);

  return (
    <GrahaDetailPageFrame
      banner={{
        icon: <RotateCcw className="h-6 w-6 text-accent dark:text-secondary" />,
        titleKey: "sidebar_nav.items.graha-vakri.label",
        blurbKey: "sidebar_nav.items.graha-vakri.blurb",
      }}
      descriptionPageId="graha-vakri"
      nav={
        <PatroYearNavBlock
          era={yearBrowse.era}
          year={yearBrowse.year}
          onYearChange={yearBrowse.setYear}
          onEraChange={yearBrowse.setEra}
          gregorianRange={query.data?.gregorian_range}
          location={location}
          onLocationChange={setLocation}
        />
      }
    >
      <RoutePageState isLoading={query.isLoading} data={query.data}>
        {() => (
          <GrahaGroupedEventCards
            order={GRAHA_ORDER}
            groups={byGraha}
            bodyClassName={grahaClasses.columnBodyTight}
            renderCardHeader={(g, events) => (
              <>
                <span className={grahaClasses.columnTitle}>{grahaName(g, lang)}</span>
                <span className={grahaClasses.columnCount}>
                  {events.length
                    ? t("graha_pages.vakri.stations", { count: events.length })
                    : t("graha_pages.vakri.no_stations")}
                </span>
              </>
            )}
            renderItem={(ev) => <EventRow ev={ev} />}
            emptyInGroup={
              <p className={grahaClasses.columnEmpty}>
                {t("graha_pages.vakri.no_vakri_year")}
              </p>
            }
          />
        )}
      </RoutePageState>
    </GrahaDetailPageFrame>
  );
}

export default GrahaVakri;
