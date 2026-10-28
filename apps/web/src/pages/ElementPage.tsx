import { getRouteApi, Navigate, useParams } from "@tanstack/react-router";
import { Moon, Sparkles, Sun } from "lucide-react";
import { useElementPage, type ElementPage as ElementPageView, type MuhurtaSlot, type ToneRowView } from "@vedic-patro/features/panchanga-element";
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
import { MuhurtaBoard, NavataraBalamCardGrid, SpanTimeline } from "@vedic-patro/ui/kit/panchanga";
import { useRouteLoading } from "@/lib/route-loading";
import { searchToLocation } from "@/lib/url-state";
import { ELEMENT_BY_ID } from "@vedic-patro/domain/panchanga/panchanga-elements";
import {
  ElementDayRowIcon,
  RashiGlyphIcon,
  NakshatraGlyphIcon,
} from "@/components/panchanga/element/ElementGlyphIcon";

const routeApi = getRouteApi("/panchanga-shell/panchanga/element/$name");

/** A board row's glyph: its rashi or nakshatra, or the hora planet. */
function SlotGlyph({ slot, elementId }: { slot: MuhurtaSlot; elementId: string }) {
  if (slot.glyph?.kind === "nakshatra") return <NakshatraGlyphIcon name={slot.glyph.name} number={slot.glyph.number} size={26} />;
  if (slot.glyph) return <RashiGlyphIcon name={slot.glyph.name} number={slot.glyph.number} size={26} />;
  if (elementId === "hora") return <ElementDayRowIcon elementId={elementId} row={slot.raw} size={26} />;
  return null;
}

/* ── table (per-day) view ──────────────────────────────────────────────── */

function ToneRow({ row, elementId, compact }: { row: ToneRowView; elementId: string; compact?: boolean }) {
  const leading = row.glyph ? (
    row.glyph.kind === "nakshatra" ? (
      <NakshatraGlyphIcon name={row.glyph.name} number={row.glyph.number} size={24} />
    ) : (
      <RashiGlyphIcon name={row.glyph.name} number={row.glyph.number} size={24} />
    )
  ) : (
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
    case "board":
      return null;
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
            <SpanTimeline elementId={meta.id} spans={p.spans} udaya={p.udaya} current={p.current} nowLabel={p.copy.now} />
          ) : p.table?.kind === "board" || p.balam?.board ? (
            <MuhurtaBoard
              board={p.table?.kind === "board" ? p.table.board : p.balam!.board!}
              icons={{ day: <Sun className="size-5" />, night: <Moon className="size-5" /> }}
              leading={(slot) => <SlotGlyph slot={slot} elementId={meta.id} />}
            />
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
