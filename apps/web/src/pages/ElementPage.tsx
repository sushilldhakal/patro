import { getRouteApi, Navigate, useParams } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useElementPage, type ElementPage as ElementPageView, type SpanBoundaryView, type SpanCard, type ToneRowView, type UdayaSummary } from "@vedic-patro/features/panchanga-element";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GrahaBanner, ElementDescription } from "@vedic-patro/ui/kit/panchanga";
import { RoutePageState } from "@/components/common/RoutePageState";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import { useLocale } from "@/i18n/locale";
import { useElementPageUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useResolvedPatroDayQuery } from "@/hooks/use-resolved-patro-day-query";
import { cn } from "@vedic-patro/design-tokens/cn";
import { patroCard, patroGoodBadTone } from "@/lib/patro-classes";
import { PatroDayTimeNav, PatroMonthYearNav } from "@/components/patro-date";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { NavataraBalamCardGrid } from "@vedic-patro/ui/kit/panchanga";
import { useRouteLoading } from "@/lib/route-loading";
import { searchToLocation } from "@/lib/url-state";
import { ELEMENT_BY_ID } from "@vedic-patro/domain/panchanga/panchanga-elements";
import {
  ElementDayRowIcon,
  ElementSpanIcon,
  RashiGlyphIcon,
  NakshatraGlyphIcon,
} from "@/components/panchanga/element/ElementGlyphIcon";

const routeApi = getRouteApi("/panchanga-shell/panchanga/element/$name");

/* ── span (begin→end) view ─────────────────────────────────────────────── */

function SpanBoundary({ view, tone }: { view: SpanBoundaryView; tone: "begin" | "end" }) {
  const shell = tone === "begin" ? "rounded-md bg-success/10 px-2 py-1.5" : "rounded-md bg-danger/10 px-2 py-1.5";
  const labelCls = tone === "begin" ? "text-xs font-semibold text-success" : "text-xs font-semibold text-danger";
  // The time is already in `when`; repeating it in the corner showed it twice.
  return (
    <div className={cn("flex flex-col gap-0.5", shell)}>
      <span className={labelCls}>{view.label}</span>
      <p className="m-0 font-num text-sm font-semibold leading-snug text-foreground md:text-base">{view.when}</p>
    </div>
  );
}

/** The patro day(s) a tithi names — the line that says which date it belongs to. */
function PatroDays({ card }: { card: SpanCard }) {
  if (!card.days) return null;
  const kind = card.udaya?.kind;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5",
        kind === "kshaya" ? "bg-danger/10" : kind === "vriddhi" ? "bg-secondary/15" : "bg-muted/40",
      )}
    >
      <span className="text-xs font-semibold text-muted-foreground">{card.days.label}</span>
      {card.days.list.map((d) => (
        <span key={d} className="rounded-full bg-card px-2 py-px font-num text-sm font-bold text-foreground">
          {d}
        </span>
      ))}
      {card.days.empty ? <span className="text-sm font-bold text-danger">{card.days.empty}</span> : null}
    </div>
  );
}

function UdayaSummaryCard({ summary }: { summary: UdayaSummary }) {
  return (
    <div className={cn(patroCard, "flex flex-col gap-2 p-3")}>
      <p className="m-0 text-sm font-bold text-foreground">{summary.title}</p>
      {summary.groups.map((g) => (
        <div key={g.kind} className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-px text-xs font-bold",
              g.kind === "kshaya" ? "bg-danger/10 text-danger" : "bg-secondary/15 text-secondary dark:text-accent",
            )}
          >
            {g.label}
          </span>
          <span className="text-sm text-foreground">{g.items.join(" · ")}</span>
        </div>
      ))}
    </div>
  );
}

function SpanList({ spans, elementId, udaya }: { spans: SpanCard[]; elementId: string; udaya?: UdayaSummary | null }) {
  return (
    <div className="flex flex-col gap-2.5">
      {udaya ? <UdayaSummaryCard summary={udaya} /> : null}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {spans.map((s) => (
          <div
            key={s.key}
            className={cn(
              patroCard,
              "flex flex-col gap-2 p-3",
              s.udaya?.kind === "vriddhi" && "border-2 border-secondary/50",
              s.udaya?.kind === "kshaya" && "border-2 border-dashed border-danger/40",
            )}
          >
            <div className="flex items-center gap-2.5">
              <ElementSpanIcon elementId={elementId} span={s.span} size={34} className="opacity-95" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-bold text-foreground">{s.name}</span>
                {s.paksha ? <span className="text-xs text-muted-foreground">{s.paksha}</span> : null}
              </div>
              {s.udaya ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                    s.udaya.kind === "kshaya" ? "bg-danger text-white" : "bg-secondary text-white",
                  )}
                >
                  {s.udaya.label}
                </span>
              ) : null}
            </div>
            <PatroDays card={s} />
            {s.udaya ? <p className="m-0 text-xs leading-snug text-muted-foreground">{s.udaya.note}</p> : null}
            <div className="flex flex-col gap-1.5">
              <SpanBoundary view={s.begins} tone="begin" />
              <SpanBoundary view={s.ends} tone="end" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── table (per-day) view ──────────────────────────────────────────────── */

function ToneRow({ row, elementId, compact }: { row: ToneRowView; elementId: string; compact?: boolean }) {
  const leading = row.glyph ? (
    row.glyph.kind === "nakshatra" ? (
      <NakshatraGlyphIcon name={row.glyph.name} number={row.glyph.number} size={24} />
    ) : (
      <RashiGlyphIcon name={row.glyph.name} number={row.glyph.number} size={24} />
    )
  ) : elementId === "choghadiya" ? null : (
    <ElementDayRowIcon elementId={elementId} row={row.raw} size={24} />
  );
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg px-3 text-sm",
        compact ? "py-1.5" : "py-2",
        patroGoodBadTone(row.good, row.bad),
      )}
    >
      <span className="flex min-w-0 items-center gap-2 font-semibold">
        {leading}
        {row.label}
        {row.badge ? (
          <span className="rounded-full bg-secondary/20 px-1.5 py-px text-sm font-bold text-secondary dark:text-accent">{row.badge}</span>
        ) : null}
      </span>
      {row.trailing ? <span className={cn("text-sm opacity-90", !row.glyph && "font-num tabular-nums")}>{row.trailing}</span> : null}
    </div>
  );
}

function TableView({ table, elementId }: { table: NonNullable<ElementPageView["table"]>; elementId: string }) {
  switch (table.kind) {
    case "message":
      return <p className="text-sm">{table.text}</p>;
    case "strength":
      return (
        <div className="flex flex-col gap-2">
          {table.anchor ? (
            <p className="text-sm text-base">
              {table.anchor.label}: <span className="font-bold text-foreground">{table.anchor.value}</span>
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {table.rows.map((row) => (
              <ToneRow key={row.key} row={row} elementId={elementId} compact />
            ))}
          </div>
        </div>
      );
    case "choghadiya":
      return (
        <>
          <ul className="m-0 mb-3 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2">
            {table.legend.map((item) => (
              <li key={item.key} className="text-sm leading-snug text-muted-foreground">
                {item.text}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {table.rows.map((row) => (
              <ToneRow key={row.key} row={row} elementId={elementId} />
            ))}
          </div>
        </>
      );
    default:
      return (
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {table.rows.map((row) => (
            <ToneRow key={row.key} row={row} elementId={elementId} />
          ))}
        </div>
      );
  }
}

function BalamView({ balam, clock }: { balam: NonNullable<ElementPageView["balam"]>; clock?: string }) {
  const { lang } = useLocale();
  if (balam.empty) return <p className="text-sm">{balam.empty}</p>;
  return (
    <div className="flex flex-col gap-2">
      {balam.moonRef ? <p className="m-0 text-center text-sm text-muted-foreground">{balam.moonRef}</p> : null}
      <NavataraBalamCardGrid cards={balam.cards} clock={clock} formatName={balam.cardName} lang={lang} variant={balam.variant} />
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

/** A panchanga element — the website's drawing of `useElementPage` (@vedic-patro/features). */
export function ElementPage() {
  const { name } = useParams({ strict: false }) as { name?: string };
  const { lang } = useLocale();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const elementMeta = name ? ELEMENT_BY_ID[name] : undefined;
  const isSpanName = elementMeta?.kind === "span";

  const { monthBrowse, dayBrowse } = useElementPageUrlBrowse(isSpanName, search, navigate, location, setLocation);
  const { dayState, date, setDate, setDisplayEra, syncPickerFromDateAd, syncResolvedPatroDay } = dayBrowse;

  const dayResolveQ = useResolvedPatroDayQuery(
    dayState,
    location.params,
    { syncPickerFromDateAd, syncResolvedPatroDay },
    { enabled: Boolean(elementMeta) && !isSpanName, syncFromData: !isSpanName },
  );

  const page = useElementPage({
    name,
    location,
    month: { era: monthBrowse.era, year: monthBrowse.year, month: monthBrowse.month },
    day: {
      dateAd: dayResolveQ.data?.date_ad,
      panchanga: dayResolveQ.data,
      resolvedByApp: true,
      isLoading: dayResolveQ.isLoading,
    },
  });
  const { meta, copy } = page;

  useRouteLoading(page.loading);

  if (page.redirectTo) {
    return <Navigate to="/panchanga/element/$name" params={{ name: page.redirectTo }} search={search} replace />;
  }

  if (!meta) {
    return (
      <PageShell>
        <PageHeader icon={<Sparkles className="h-6 w-6 text-secondary" />} title={copy.unknown} />
        <PanchangaDetailsBackLink labelKey="element_page.back_to_details" variant="inline" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <GrahaBanner
        icon={<Sparkles className="size-6" />}
        titleKey={`panchanga_elements.${meta.id}.title`}
        blurbKey={`panchanga_elements.${meta.id}.blurb`}
      />

      {page.kind === "span" ? (
        <PatroMonthYearNav
          onBrowse={(next) => monthBrowse.setYearMonth(next.year, next.month)}
          onEraChange={(e) => monthBrowse.commitEraYear(e, monthBrowse.year)}
          era={monthBrowse.era}
          year={monthBrowse.year}
          month={monthBrowse.month}
          displayLanguage={lang}
          location={location}
          onLocationChange={setLocation}
        />
      ) : (
        <PatroDayTimeNav
          era={dayState.display.era}
          displayLanguage={lang}
          date={date}
          vikram={dayResolveQ.data?.date_parts?.vikram}
          civilDateAd={dayResolveQ.data?.date_ad}
          gregorian={dayResolveQ.data?.date_parts?.gregorian}
          onDateChange={setDate}
          onEraChange={setDisplayEra}
          todayAd={page.todayAd}
          location={location}
          onLocationChange={setLocation}
        />
      )}

      <RoutePageState isLoading={page.status === "loading"} data={page.status === "ready" ? page : undefined}>
        {(p) =>
          p.kind === "span" ? (
            <SpanList spans={p.spans} elementId={meta.id} udaya={p.udaya} />
          ) : (
            <div className={cn(patroCard, "p-3.5")}>
              {p.kind === "balam" && p.balam ? (
                <BalamView balam={p.balam} clock={p.clock} />
              ) : p.table ? (
                <TableView table={p.table} elementId={meta.id} />
              ) : null}
            </div>
          )
        }
      </RoutePageState>

      <ElementDescription elementId={meta.id} />

      <PanchangaDetailsBackLink />
    </PageShell>
  );
}

export default ElementPage;
