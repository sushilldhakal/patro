import { Sunrise } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { useGrahaAstaPage, type AstaPeriodView } from "@vedic-patro/features/graha";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { GrahaGroupedEventCards } from "@/components/graha/GrahaGroupedEventCards";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/panchanga-shell/panchanga/graha-asta");

/** Graha asta — the website's drawing of `useGrahaAstaPage` (@vedic-patro/features). */
export function GrahaAsta() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = useGrahaAstaPage({ year: yearBrowse.year, era: yearBrowse.era, location: location.params });
  useRouteLoading(page.status === "loading");
  const byGraha = new Map(page.groups.map((g) => [g.graha, g]));

  return (
    <GrahaDetailPageFrame
      banner={{
        icon: <Sunrise className="h-6 w-6 text-accent dark:text-secondary" />,
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
            renderCardHeader={(g) => {
              const group = byGraha.get(g)!;
              return (
                <>
                  <span className={grahaClasses.columnTitle}>
                    {group.name}
                    {group.note ? <span className={grahaClasses.columnNote}>{group.note}</span> : null}
                  </span>
                  <span className={grahaClasses.columnCount}>{group.count}</span>
                </>
              );
            }}
            renderItem={(p, i) => <PeriodCard key={i} period={p} />}
            emptyInGroup={<p className={grahaClasses.columnEmpty}>{page.groups[0]?.empty}</p>}
          />
        )}
      </RoutePageState>
    </GrahaDetailPageFrame>
  );
}

function PeriodCard({ period }: { period: AstaPeriodView }) {
  return (
    <div className={cn(grahaClasses.periodCard, "flex flex-col text-sm")}>
      {period.stamps.map((s) => (
        <div key={s.label} className={cn(grahaClasses.stampRow, "flex")}>
          <span className={cn(grahaClasses.stampLabel, s.tone === "asta" ? grahaClasses.toneAsta : grahaClasses.toneUdaya)}>
            {s.label}
          </span>
          <span className={grahaClasses.stampValue}>
            {s.date !== undefined ? (
              <span className="block">
                {s.date}
                <span className={grahaClasses.stampTime}> · {s.time}</span>
              </span>
            ) : (
              <span className={grahaClasses.stampOutside}>{s.outside}</span>
            )}
          </span>
        </div>
      ))}
      <div className={cn(grahaClasses.periodFoot, grahaClasses.periodFootText, "flex")}>
        <span>{period.hemisphere}</span>
        {period.duration ? <span>{period.duration}</span> : null}
      </div>
    </div>
  );
}

export default GrahaAsta;
