import { RotateCcw } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { useGrahaVakriPage, type VakriEventView } from "@vedic-patro/features/graha";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/domain/utils";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { GrahaGroupedEventCards } from "@/components/graha/GrahaGroupedEventCards";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/panchanga-shell/panchanga/graha-vakri");

/** Graha vakri — the website's drawing of `useGrahaVakriPage` (@vedic-patro/features). */
export function GrahaVakri() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = useGrahaVakriPage({ year: yearBrowse.year, era: yearBrowse.era, location: location.params });
  useRouteLoading(page.status === "loading");
  const byGraha = new Map(page.groups.map((g) => [g.graha, g]));

  return (
    <GrahaDetailPageFrame
      banner={{
        icon: <RotateCcw className="h-6 w-6 text-accent dark:text-secondary" />,
        titleKey: page.copy.titleKey,
        blurbKey: page.copy.blurbKey,
      }}
      descriptionPageId={page.descriptionPageId}
      nav={
        <PatroYearNavBlock
          era={yearBrowse.era}
          year={yearBrowse.year}
          onYearChange={yearBrowse.setYear}
          onEraChange={yearBrowse.setEra}
          gregorianRange={page.gregorianRange}
          location={location}
          onLocationChange={setLocation}
        />
      }
    >
      <RoutePageState isLoading={page.status === "loading"} data={page.status === "ready" ? page.groups : undefined}>
        {() => (
          <GrahaGroupedEventCards
            order={page.groups.map((g) => g.graha)}
            groups={new Map(page.groups.map((g) => [g.graha, g.items]))}
            bodyClassName={grahaClasses.columnBodyTight}
            renderCardHeader={(g) => {
              const group = byGraha.get(g)!;
              return (
                <>
                  <span className={grahaClasses.columnTitle}>{group.name}</span>
                  <span className={grahaClasses.columnCount}>{group.count}</span>
                </>
              );
            }}
            renderItem={(ev, i) => <EventRow key={i} ev={ev} />}
            emptyInGroup={<p className={grahaClasses.columnEmpty}>{page.groups[0]?.empty}</p>}
          />
        )}
      </RoutePageState>
    </GrahaDetailPageFrame>
  );
}

function EventRow({ ev }: { ev: VakriEventView }) {
  const tone = ev.retrograde ? grahaClasses.toneRetro : grahaClasses.toneDirect;
  return (
    <div className={cn(grahaClasses.eventRow, grahaClasses.eventText, "flex odd:bg-foreground/[0.03]")}>
      <span className={cn(grahaClasses.eventLabel, "flex")}>
        <span className={cn(grahaClasses.eventText, tone)}>{ev.arrow}</span>
        <span className={cn(grahaClasses.eventText, tone)}>{ev.label}</span>
      </span>
      <span className={grahaClasses.eventValue}>
        <span className={grahaClasses.eventDate}>{ev.date}</span>
        {ev.time ? <span className={grahaClasses.eventTime}> · {ev.time}</span> : null}
      </span>
    </div>
  );
}

export default GrahaVakri;
