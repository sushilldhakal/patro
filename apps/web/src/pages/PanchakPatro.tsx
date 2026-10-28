import { NowHero } from "@vedic-patro/ui/kit/panchanga";
import { Link, getRouteApi } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CalendarClock } from "lucide-react";
import { usePanchakPage, type PanchakCardView } from "@vedic-patro/features/panchak";
import { panchakClasses as pc } from "@vedic-patro/design-tokens/classes/panchak-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { RoutePageState } from "@/components/common/RoutePageState";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { patroNoteBox } from "@/lib/patro-classes";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/panchanga-shell/panchak-patro");

/** Panchak patro — the website's drawing of `usePanchakPage` (@vedic-patro/features). */
export function PanchakPatro() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = usePanchakPage({ year: yearBrowse.year, era: yearBrowse.era, location: location.params });
  useRouteLoading(page.status === "loading");

  return (
    <PageShell className={cn(pc.pageStack, "space-y-4")}>
      <div>
        <Link to="/" className="inline-flex items-center gap-1 text-xs hover:text-foreground mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {page.copy.backHome}
        </Link>
        <PageHeader
          icon={<CalendarClock className="h-7 w-7 text-secondary shrink-0" />}
          title={page.copy.title}
          subtitle={page.copy.subtitle}
        />
      </div>

      <PatroYearNavBlock
        era={yearBrowse.era}
        year={yearBrowse.year}
        onYearChange={yearBrowse.setYear}
        onEraChange={yearBrowse.setEra}
        gregorianRange={page.gregorianRange}
        location={location}
        onLocationChange={setLocation}
        className=""
      />
      {page.hero ? <NowHero hero={page.hero} /> : null}

      <p className={cn(patroNoteBox, pc.introText)}>{page.copy.intro}</p>

      <RoutePageState isLoading={page.status === "loading"} data={page.status === "ready" ? page.cards : undefined}>
        {(cards) =>
          !cards.length ? (
            <p className={pc.noData}>{page.copy.noData}</p>
          ) : (
            <section className={pc.windows}>
              <h2 className={cn(pc.sectionTitle, pc.windowsHeading)}>
                <AlertTriangle className="size-4 text-amber-600" />
                {page.copy.periodsTitle}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {cards.map((card) => (
                  <PeriodCard key={card.key} card={card} durationLabel={page.copy.duration} />
                ))}
              </div>
            </section>
          )
        }
      </RoutePageState>

      <section className={pc.panel}>
        <h2 className={pc.panelTitleSpaced}>{page.copy.prohibitedTitle}</h2>
        <ul className={pc.prohibitedList}>
          {page.prohibited.map((item) => (
            <li key={item.key} className={cn(pc.prohibitedItem, "last:border-0 last:pb-0")}>
              <p className={pc.itemTitle}>{item.title}</p>
              <p className={pc.itemDesc}>{item.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={pc.panelLearn}>
        <h2 className={pc.panelTitle}>{page.copy.learnTitle}</h2>
        {page.learn.map((block) => (
          <div key={block.title}>
            <h3 className={pc.learnHeading}>{block.title}</h3>
            <p className={pc.learnBody}>{block.body}</p>
          </div>
        ))}
        <div>
          <h3 className={pc.learnHeadingSpaced}>{page.copy.typesTitle}</h3>
          <ul className={pc.typesList}>
            {page.varieties.map((v) => (
              <li key={v.id} className={pc.typeItem}>
                <span className={pc.typeName}>{v.name}</span>
                <span> — {v.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}

function PeriodCard({ card, durationLabel }: { card: PanchakCardView; durationLabel: string }) {
  return (
    <article className={cn(pc.periodCard, "shadow-ring-soft")}>
      <div className={pc.periodHead}>
        <h3 className={cn(pc.periodTitle, "m-0")}>{card.title}</h3>
        {card.variety ? <span className={cn(pc.varietyBadge, pc.varietyText)}>{card.variety}</span> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[card.start, card.end].map((b) => (
          <div key={b.label} className={pc.boundary}>
            <p className={pc.boundaryLabel}>{b.label}</p>
            <p className={pc.boundaryValue}>{b.bs}</p>
            <p className={cn(pc.boundaryAd, "mono")}>{b.ad}</p>
          </div>
        ))}
      </div>
      <p className={pc.duration}>
        {durationLabel}: <span className={pc.durationValue}>{card.duration}</span>
      </p>
    </article>
  );
}
