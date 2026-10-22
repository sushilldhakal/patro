import { Link, getRouteApi } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { useAdhikMaasPage, type AdhikMaasView } from "@vedic-patro/features/adhik-maas";
import { panchakClasses as pc } from "@vedic-patro/design-tokens/classes/panchak-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { adhikMaasClasses as a } from "@vedic-patro/design-tokens/classes/adhik-maas-classes";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { patroNoteBox } from "@/lib/patro-classes";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/panchanga-shell/adhik-maas");

/** Adhik (mala) maas — the website's drawing of `useAdhikMaasPage` (@vedic-patro/features). */
export function AdhikMaas() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = useAdhikMaasPage({ year: yearBrowse.year, era: yearBrowse.era });
  useRouteLoading(page.status === "loading");

  return (
    <PageShell className={cn(pc.pageStack, "space-y-4")}>
      <div>
        <Link to="/" className={a.backLink}>
          <ArrowLeft className="h-3.5 w-3.5" />
          {page.copy.backHome}
        </Link>
        <PageHeader
          icon={<CalendarPlus className="h-7 w-7 shrink-0 text-secondary" />}
          title={page.copy.title}
          subtitle={page.copy.subtitle}
        />
      </div>

      <PatroYearNavBlock
        era={yearBrowse.era}
        year={yearBrowse.year}
        onYearChange={yearBrowse.setYear}
        onEraChange={yearBrowse.setEra}
        location={location}
        onLocationChange={setLocation}
        className=""
      />

      <p className={cn(patroNoteBox, pc.introText)}>{page.copy.intro}</p>

      <section className={pc.windows}>
        <h2 className={cn(pc.sectionTitle, "m-0")}>{page.copy.resultTitle}</h2>
        {!page.supported ? (
          <p className={pc.noData}>{page.copy.unsupported}</p>
        ) : page.status === "loading" ? (
          <p className={pc.noData}>{page.copy.loading}</p>
        ) : page.status === "error" ? (
          <p className={pc.errorText}>{page.copy.error}</p>
        ) : !page.months.length ? (
          <p className={cn(pc.periodCard, pc.noData, "m-0")}>{page.copy.none}</p>
        ) : (
          page.months.map((m) => <AdhikCard key={m.key} month={m} page={page} />)
        )}
        {page.kshaya ? <p className={cn(patroNoteBox, pc.introText)}>{page.kshaya}</p> : null}
      </section>

      {page.nearby.length ? (
        <section className={pc.panel}>
          <h2 className={pc.panelTitleSpaced}>{page.copy.nearbyTitle}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {page.nearby.map((y) => (
              <button
                key={y.year}
                type="button"
                onClick={() => yearBrowse.setYear(y.year)}
                aria-pressed={y.active}
                className={cn(a.nearbyChip, "text-left transition-colors", y.active ? a.nearbyChipActive : cn(a.nearbyChipIdle, "hover:border-secondary/40"))}
              >
                <span className={cn("block", a.nearbyYear)}>{y.label}</span>
                <span className={cn("block", y.month ? a.nearbyMonth : a.nearbyNone)}>
                  {y.month === undefined ? "…" : (y.month ?? page.copy.nearbyNone)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={pc.panelLearn}>
        <h2 className={cn(pc.panelTitle, "m-0")}>{page.copy.learnTitle}</h2>
        {page.learn.map((block) => (
          <div key={block.key}>
            <h3 className={pc.learnHeading}>{block.title}</h3>
            <p className={cn(pc.learnBody, "m-0")}>{block.body}</p>
          </div>
        ))}
        <Link
          to="/learn/$slug"
          params={{ slug: page.learnSlug }}
          className={cn(a.readMore, "no-underline hover:underline")}
        >
          {page.copy.readMore}
        </Link>
      </section>

      <section className={pc.panel}>
        <h2 className={pc.panelTitleSpaced}>{page.copy.observeTitle}</h2>
        <ul className={cn(pc.prohibitedList, "m-0 list-none p-0")}>
          {page.observe.map((item) => (
            <li key={item.key} className={cn(pc.prohibitedItem, "last:border-0 last:pb-0")}>
              <p className={cn(pc.itemTitle, "m-0")}>{item.title}</p>
              <p className={cn(pc.itemDesc, "m-0")}>{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}

function AdhikCard({ month, page }: { month: AdhikMaasView; page: ReturnType<typeof useAdhikMaasPage> }) {
  return (
    <article className={cn(pc.periodCard, "shadow-ring-soft")}>
      <div className={pc.periodHead}>
        <h3 className={cn("m-0", a.cardName)}>{month.name}</h3>
        <span className={cn(pc.varietyBadge, pc.varietyText)}>{month.days}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={pc.boundary}>
          <p className={pc.boundaryLabel}>{page.copy.bsLabel}</p>
          <p className={pc.boundaryValue}>{month.bsRange}</p>
        </div>
        <div className={pc.boundary}>
          <p className={pc.boundaryLabel}>{page.copy.adLabel}</p>
          <p className={pc.boundaryValue}>{month.adRange}</p>
        </div>
      </div>
      <p className={pc.duration}>{month.nijNote}</p>
    </article>
  );
}
