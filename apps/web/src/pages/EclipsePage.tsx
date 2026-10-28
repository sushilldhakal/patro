import { getRouteApi } from "@tanstack/react-router";
import { Eclipse, MoonStar } from "lucide-react";
import { useEclipsePage, type EclipseCardView, type EclipseKind } from "@vedic-patro/features/graha";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaYearOverview } from "@vedic-patro/ui/kit/panchanga";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { patroCard } from "@/lib/patro-classes";
import { useRouteLoading } from "@/lib/route-loading";

const suryaRouteApi = getRouteApi("/panchanga-shell/panchanga/surya-grahan");
const chandraRouteApi = getRouteApi("/panchanga-shell/panchanga/chandra-grahan");

function EclipseCard({ card }: { card: EclipseCardView }) {
  return (
    <div className={cn(patroCard, grahaClasses.eclipseCard, "flex flex-col")}>
      <div className={cn(grahaClasses.eclipseHead, "flex", card.visible ? grahaClasses.eclipseHeadVisible : grahaClasses.eclipseHeadHidden)}>
        <span className={grahaClasses.eclipseType}>{card.type}</span>
        <span className={cn(grahaClasses.eclipseBadge, card.visible ? grahaClasses.eclipseBadgeVisible : grahaClasses.eclipseBadgeHidden)}>
          {card.visibility}
        </span>
      </div>
      <div className={cn(grahaClasses.eclipseBody, "flex flex-col text-sm")}>
        {card.rows.map((row) => (
          <div key={row.label} className={cn(grahaClasses.eclipseRow, "flex")}>
            <span className={grahaClasses.eclipseLabel}>{row.label}</span>
            {row.strong ? (
              <span className={grahaClasses.eclipseDate}>
                <span className={grahaClasses.eclipseNum}>{row.value}</span>
              </span>
            ) : (
              <span className={grahaClasses.eclipseValue}>{row.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Solar / lunar eclipses — the website's drawing of `useEclipsePage` (@vedic-patro/features). */
function EclipseView({ kind }: { kind: EclipseKind }) {
  const routeApi = kind === "solar" ? suryaRouteApi : chandraRouteApi;
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = useEclipsePage(kind, { year: yearBrowse.year, era: yearBrowse.era, location: location.params });
  useRouteLoading(page.status === "loading");
  const Icon = kind === "solar" ? Eclipse : MoonStar;

  return (
    <GrahaDetailPageFrame
      banner={{ icon: <Icon className="h-6 w-6 text-accent dark:text-secondary" />, titleKey: page.copy.titleKey, blurbKey: page.copy.blurbKey }}
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
      <RoutePageState isLoading={page.status === "loading"} data={page.status === "ready" ? page.cards : undefined}>
        {(cards) =>
          cards.length ? (
            <>
              {page.overview ? <GrahaYearOverview overview={page.overview} tone="eclipse" /> : null}
              <div className={cn(grahaClasses.eclipseGrid, "grid grid-cols-1 sm:grid-cols-2")}>
                {cards.map((card) => (
                  <div
                    key={card.key}
                    className={cn("flex flex-col gap-1.5", card.state === "past" && "opacity-55", card.state === "next" && "rounded-2xl ring-2 ring-primary/60")}
                  >
                    {card.countdown ? (
                      <span
                        className={cn(
                          grahaClasses.eclipseCountdown,
                          card.state === "next" ? "bg-primary text-primary-foreground" : "bg-surface-inset text-muted-foreground",
                        )}
                      >
                        {card.state === "next" ? `${page.nextLabel} · ${card.countdown}` : card.countdown}
                      </span>
                    ) : null}
                    <EclipseCard card={card} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className={cn(patroCard, grahaClasses.eclipseNone, grahaClasses.eclipseNoneText)}>{page.copy.none}</p>
          )
        }
      </RoutePageState>
    </GrahaDetailPageFrame>
  );
}

export function SuryaGrahan() {
  return <EclipseView kind="solar" />;
}

export function ChandraGrahan() {
  return <EclipseView kind="lunar" />;
}

export default SuryaGrahan;
