import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Trans } from "@vedic-patro/i18n/react";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Sunrise,
  Sunset,
} from "lucide-react";
import { fetchMonthCalendar } from "@/lib/api";
import {
  useDainikKrantiPage,
  type DainikDayRow,
  type DainikPakshaFilter,
} from "@vedic-patro/features/dainik-kranti";
import { useRouteLoading } from "@/lib/route-loading";
import { PageShell } from "@/components/PageShell";
import { usePatroMonthUrlBrowse } from "@/hooks/use-patro-url-browse";
import { PatroMonthYearNav } from "@/components/patro-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import {
  searchToLocation,
} from "@/lib/url-state";
import {
  patroStickyHeadCell,
  patroStickyHeadRow,
} from "@/lib/patro-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DayPatroExpandPanel, MonthCalcNotes, MonthGrahaSpashta, MonthLagnaMatrix, NowHero } from "@vedic-patro/ui/kit/panchanga";
import { D1Chart } from "@/components/kundali/D1Chart";
import { GocharKundaliChart, GocharRashyadiTable } from "@vedic-patro/ui/kit/panchanga";
import {
  DainikKrantiMobileLoading,
  DainikKrantiTableLoading,
} from "@/components/dainikKranti/DainikKrantiDayListLoading";

const COL_SPAN = 10;

const routeApi = getRouteApi("/panchanga-shell/dainikkranti");
type PakshaFilter = DainikPakshaFilter;

const MOBILE_PAKSHA_MQ = "(max-width: 767px)";

function useMobilePakshaLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_PAKSHA_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_PAKSHA_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMobile;
}

const th = cn(dainikKrantiClasses.th, "whitespace-nowrap align-middle");
const thWrap = cn(dainikKrantiClasses.thWrap, "h-auto min-h-10 whitespace-normal align-middle");
const subLine = dainikKrantiClasses.subLine;
const sunColW = "w-[7.25rem] min-w-[7.25rem] max-w-[7.25rem] whitespace-normal";
const moonColW = "w-[5.5rem] min-w-[5.5rem] max-w-[5.5rem] whitespace-normal break-words leading-snug";
/** Festival column — wide enough for two wrapped lines of names. */
const festivalColW = "min-w-[17rem] w-[19.5rem] max-w-[19.5rem] whitespace-normal";
const holidayText = "text-rose-600 dark:text-rose-400";

/** BS gate large; AD day smaller beside it. English AD browse: the AD day alone. */
function DayLabel({ row }: { row: DainikDayRow }) {
  const accentClass = row.holiday ? holidayText : "text-foreground";
  if (row.adDay == null) {
    return <span className={cn(dainikKrantiClasses.dayNumAd, accentClass)}>{row.dayNumber}</span>;
  }
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      <span className={cn(dainikKrantiClasses.dayNumBs, accentClass)}>{row.dayNumber}</span>
      <span className={dainikKrantiClasses.dayNumAdSmall}>{row.adDay}</span>
    </span>
  );
}

function SunRiseSetSignValue({ sun }: { sun: DainikDayRow["sun"] }) {
  return (
    <div className={dainikKrantiClasses.sunRiseSetValue}>
      <div className={cn(dainikKrantiClasses.sunRiseSetTimes, "whitespace-nowrap")}>{sun.times}</div>
      <div className={cn(subLine, "break-words")}>{sun.sign}</div>
    </div>
  );
}

function AngaValue({ anga }: { anga: DainikDayRow["moon"] }) {
  return (
    <>
      <div>{anga.value}</div>
      {anga.until ? <div className={subLine}>{anga.until}</div> : null}
    </>
  );
}

function CardField({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string | null;
}) {
  return (
    <div className={dainikKrantiClasses.field}>
      <div className={dainikKrantiClasses.fieldLabel}>{label}</div>
      <div className={dainikKrantiClasses.fieldValue}>{value}</div>
      {sub ? <div className={dainikKrantiClasses.fieldSub}>{sub}</div> : null}
    </div>
  );
}

type PageCopy = ReturnType<typeof useDainikKrantiPage>["copy"];

function TransitList({ row, nowrap }: { row: DainikDayRow; nowrap?: boolean }) {
  return (
    <>
      {row.transits.map((ev, i) => (
        <div key={i} className={cn(dainikKrantiClasses.transitRow, nowrap && "whitespace-nowrap")}>
          <span className={dainikKrantiClasses.transitName}>{ev.label}</span>{" "}
          <span className={dainikKrantiClasses.transitPlanet}>{ev.planet}</span>
          {ev.time ? <span> {ev.time}</span> : null}
        </div>
      ))}
    </>
  );
}

/**
 * Mobile (<md) card for one day — replaces the horizontally-scrolling table
 * row. The advanced lagna / graha spashta / notes data lives in a per-card
 * expandable so it's available without a wide table.
 */
function DayPatroCard({ row, copy }: { row: DainikDayRow; copy: PageCopy }) {
  return (
    <div
      className={cn(
        dainikKrantiClasses.dayCard,
        row.isToday
          ? dainikKrantiClasses.dayCardToday
          : row.hasFestival
          ? dainikKrantiClasses.dayCardFestival
          : dainikKrantiClasses.dayCardPlain,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(dainikKrantiClasses.cardDateCol, "shrink-0")}>
          <DayLabel row={row} />
          <span className={cn(dainikKrantiClasses.weekday, row.isSaturday && dainikKrantiClasses.saturday)}>
            {row.weekday}
          </span>
        </div>
        {row.festivals ? (
          <div className={cn(dainikKrantiClasses.festivalInline, "flex")}>
            <span aria-hidden className={dainikKrantiClasses.festivalDot} />
            <div className={cn(dainikKrantiClasses.festivalText, "line-clamp-3")}>{row.festivals}</div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {row.isToday ? (
          <span className={cn(dainikKrantiClasses.todayBadge, dainikKrantiClasses.todayBadgeText)}>
            {copy.today}
          </span>
        ) : null}
      </div>

      {/* Columns follow the card's own width: 2 on a narrow phone, 3 on most
          phones, all 6 in one row once the card is tablet-wide. */}
      <div className={cn(dainikKrantiClasses.fieldGridCompact, "@container")}>
        <div className={dainikKrantiClasses.fieldGridCompactCols}>
          <CardField label={copy.tithi} value={row.tithi.value} sub={row.tithi.until} />
          <CardField label={copy.nakshatra} value={row.nakshatra.value} sub={row.nakshatra.until} />
          <CardField label={copy.yoga} value={row.yoga.value} sub={row.yoga.until} />
          <CardField label={copy.karana} value={row.karana.value} sub={row.karana.until} />
          <CardField label={copy.moonSign} value={row.moon.value} sub={row.moon.until} />
          <CardField label={copy.sunRiseSetSign} value={<SunRiseSetSignValue sun={row.sun} />} />
        </div>
      </div>

      {row.transits.length > 0 ? (
        <div className={cn(dainikKrantiClasses.transitsInline, "flex")}>
          <span className={dainikKrantiClasses.fieldLabel}>{copy.transits}</span>
          {row.transits.map((ev, i) => (
            <span key={i} className={cn(dainikKrantiClasses.transitRow, "whitespace-nowrap")}>
              <span className={dainikKrantiClasses.transitName}>{ev.label}</span>{" "}
              <span className={dainikKrantiClasses.transitPlanet}>{ev.planet}</span>
              {ev.time ? <span> {ev.time}</span> : null}
            </span>
          ))}
        </div>
      ) : null}

      {row.hasExtra ? (
        <div className={dainikKrantiClasses.expandWrap}>
          <button
            type="button"
            onClick={row.toggle}
            aria-expanded={row.expanded}
            className={cn(
              dainikKrantiClasses.expandBtn,
              dainikKrantiClasses.expandBtnText,
              "flex w-full active:bg-muted/60",
            )}
          >
            <span>{row.expanded ? copy.hideDetails : copy.showDetails}</span>
            <ChevronDown className={cn(dainikKrantiClasses.expandChevron, row.expanded && "rotate-180")} />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-out",
              row.expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              {row.expanded ? (
                <div className={dainikKrantiClasses.expandBody}>
                  <DayPatroExpandPanel lagna={row.lagna} graha={row.graha} notes={row.notes} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DainikKranti() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  // Seed from the URL so a shared link opens on its month/paksha/location.
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const isMobilePaksha = useMobilePakshaLayout();
  const [paksha, setPaksha] = useState<PakshaFilter>(() => search.paksha ?? "all");
  const browseMirror = useMemo(
    () => (paksha === "all" ? undefined : { paksha }),
    [paksha],
  );
  const monthBrowse = usePatroMonthUrlBrowse(search, navigate, location, setLocation, {
    mirror: browseMirror,
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  // Back/forward only — do not depend on local `paksha` or we revert clicks before URL updates.
  useEffect(() => {
    const urlPaksha = search.paksha ?? "all";
    setPaksha((current) => (current === urlPaksha ? current : urlPaksha));
  }, [search.paksha]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const page = useDainikKrantiPage({
    browse: { era: monthBrowse.era, year: monthBrowse.year, month: monthBrowse.month },
    location,
    paksha,
    setPaksha,
    compact: isMobilePaksha,
    monthSource: {
      queryKey: [
        "panchanga",
        "month",
        monthBrowse.era,
        monthBrowse.year,
        monthBrowse.month,
        location.params,
        "full-slim",
      ] as const,
      queryFn: () =>
        fetchMonthCalendar(monthBrowse.year, monthBrowse.month, location.params, {
          era: monthBrowse.era,
          slim: true,
        }),
    },
  });
  const { status, copy, rows, tables, gochar, header } = page;
  const nowKey = page.todayKey;

  useRouteLoading(status.pageLoading);

  // Paksha filter rides in the header toggle (one phone button when it has two options).
  const pakshaSegments = (isMobilePaksha ? copy.pakshaOptions.filter(([value]) => value !== "all") : copy.pakshaOptions).map(
    ([value, label]) => ({
      key: value,
      label,
      active: (isMobilePaksha ? page.compactPaksha : paksha) === value,
      onPress: () => setPaksha(value),
    }),
  );

  return (
    <PageShell>
      <PatroMonthYearNav
        era={monthBrowse.era}
        year={monthBrowse.year}
        month={monthBrowse.month}
        onBrowse={(next) => monthBrowse.setYearMonth(next.year, next.month)}
        onEraChange={(e) => monthBrowse.commitEraYear(e, monthBrowse.year)}
        location={location}
        onLocationChange={setLocation}
        segments={pakshaSegments}
        segmentsLabel={copy.pakshaAria}
      />
      {page.hero ? <NowHero hero={page.hero} /> : null}

      <div className={dainikKrantiClasses.monthHead}>
        <div className={dainikKrantiClasses.monthTitleRow}>
          <h2 className={dainikKrantiClasses.monthTitle}>{header.title}</h2>
          {header.yearBs ? <span className={dainikKrantiClasses.metaText}>{header.yearBs}</span> : null}
          {header.ritu ? <span className={dainikKrantiClasses.metaText}>· {header.ritu}</span> : null}
          {header.dayCount ? <span className={dainikKrantiClasses.metaSmall}>· {header.dayCount}</span> : null}
        </div>
        <p className={dainikKrantiClasses.metaText}>{header.intro}</p>
      </div>

      {page.adhikNotice ? (
        <div className={cn(dainikKrantiClasses.adhikBox, dainikKrantiClasses.adhikText)}>
          <Trans
            i18nKey={page.adhikNotice.i18nKey}
            values={page.adhikNotice.values}
            components={{ b: <span className={dainikKrantiClasses.adhikStrong} /> }}
          />
        </div>
      ) : null}

      {page.kshayaNotice ? (
        <div className={cn(dainikKrantiClasses.adhikBox, dainikKrantiClasses.adhikText)}>
          <Trans
            i18nKey={page.kshayaNotice.i18nKey}
            values={page.kshayaNotice.values}
            components={{ b: <span className={dainikKrantiClasses.adhikStrong} /> }}
          />
        </div>
      ) : null}

      <div className={cn(dainikKrantiClasses.pageBody, "w-full")}>
        <div className="w-full min-w-0 space-y-4">
        {/* mobile (<md): one card per day, wide table replaced to avoid horizontal scroll */}
        <div className="space-y-3 md:hidden">
          {status.monthError ? (
            <div className={cn(dainikKrantiClasses.stateBox, dainikKrantiClasses.stateText)}>
              {copy.loadError}
            </div>
          ) : status.monthLoading ? (
            <DainikKrantiMobileLoading />
          ) : rows.length === 0 ? (
            <div className={cn(dainikKrantiClasses.stateBox, dainikKrantiClasses.stateText)}>
              {copy.noDays}
            </div>
          ) : (
            rows.map((row) => (
              <Fragment key={row.key}>
                {row.segLabel ? <h3 className={dainikKrantiClasses.segLabel}>{row.segLabel}</h3> : null}
                <DayPatroCard row={row} copy={copy} />
              </Fragment>
            ))
          )}
        </div>

        {/* desktop (md+): full daily table */}
        <div className={cn(dainikKrantiClasses.tableWrap, "hidden overflow-x-auto md:block")}>
          <Table className="w-full min-w-max text-sm">
            <TableHeader>
              <TableRow className={patroStickyHeadRow}>
                <TableHead className={cn(th, patroStickyHeadCell, "w-9 px-1")} aria-label={copy.expand} />
                <TableHead className={cn(th, patroStickyHeadCell)}>{copy.colDay}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{copy.tithi}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{copy.nakshatra}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{copy.yoga}</TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{copy.karana}</TableHead>
                <TableHead className={cn(thWrap, patroStickyHeadCell, sunColW)}>
                  <span className="block">{copy.sunRiseSet}</span>
                  <span className="block">{copy.sign}</span>
                </TableHead>
                <TableHead className={cn(thWrap, patroStickyHeadCell, moonColW)}>
                  <span className="block">{copy.moon}</span>
                  <span className="block">{copy.sign}</span>
                </TableHead>
                <TableHead className={cn(th, patroStickyHeadCell)}>{copy.transits}</TableHead>
                <TableHead className={cn(thWrap, patroStickyHeadCell, festivalColW)}>{copy.festival}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {status.monthError ? (
                <TableRow><TableCell colSpan={COL_SPAN} className="py-8 text-center">{copy.loadError}</TableCell></TableRow>
              ) : status.monthLoading ? (
                <DainikKrantiTableLoading colSpan={COL_SPAN} />
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={COL_SPAN} className="py-8 text-center">{copy.noDays}</TableCell></TableRow>
              ) : (
                rows.map((row) => (
                  <Fragment key={row.key}>
                    {row.segLabel ? (
                      <TableRow className={cn(dainikKrantiClasses.segRow, "hover:bg-muted/70")}>
                        <TableCell colSpan={COL_SPAN} className={dainikKrantiClasses.segRowText}>
                          {row.segLabel}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow
                      className={cn(
                        "cursor-pointer",
                        row.isToday && cn(dainikKrantiClasses.rowToday, "hover:bg-secondary/20"),
                        !row.isToday && row.hasFestival && dainikKrantiClasses.rowFestival,
                        row.expanded && "border-b-0",
                      )}
                      role="button"
                      tabIndex={0}
                      aria-expanded={row.expanded}
                      aria-label={row.ariaLabel}
                      onClick={row.toggle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          row.toggle();
                        }
                      }}
                    >
                      <TableCell className="w-9 px-1">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md"
                          aria-hidden
                        >
                          <ChevronRight
                            className={cn("h-4 w-4 transition-transform", row.expanded && "rotate-90")}
                          />
                        </span>
                      </TableCell>
                      <TableCell className={cn("align-top", row.isSaturday && dainikKrantiClasses.saturday)}>
                        <div className={cn(dainikKrantiClasses.dateCell, "inline-flex items-center whitespace-nowrap")}>
                          {row.isToday ? <span className={dainikKrantiClasses.todayDot} aria-hidden /> : null}
                          <DayLabel row={row} />
                        </div>
                        <div className={cn(subLine, row.isSaturday && dainikKrantiClasses.saturday)}>
                          {row.weekday}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><AngaValue anga={row.tithi} /></TableCell>
                      <TableCell className="whitespace-nowrap"><AngaValue anga={row.nakshatra} /></TableCell>
                      <TableCell className="whitespace-nowrap"><AngaValue anga={row.yoga} /></TableCell>
                      <TableCell className="whitespace-nowrap"><AngaValue anga={row.karana} /></TableCell>
                      <TableCell className={cn(sunColW, "align-top", dainikKrantiClasses.cellText)}>
                        <SunRiseSetSignValue sun={row.sun} />
                      </TableCell>
                      <TableCell className={cn(moonColW, "align-top", dainikKrantiClasses.cellText)}>
                        <AngaValue anga={row.moon} />
                      </TableCell>
                      <TableCell className="align-top">
                        {row.transits.length > 0 ? (
                          <div className="space-y-0.5">
                            <TransitList row={row} nowrap />
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(festivalColW, "align-top")}>
                        {row.festivals ? (
                          <div className={cn(dainikKrantiClasses.festivalText, "line-clamp-2")}>
                            {row.festivals}
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {row.expanded ? (
                      <TableRow className={cn(dainikKrantiClasses.expandRow, "hover:bg-muted/25")}>
                        <TableCell
                          colSpan={COL_SPAN}
                          className="max-w-0 whitespace-normal px-2 py-2 sm:px-4"
                        >
                          <DayPatroExpandPanel lagna={row.lagna} graha={row.graha} notes={row.notes} />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Accordion type="multiple" className={dainikKrantiClasses.accordion}>
          <AccordionItem value="lagna-month">
            <AccordionTrigger className={cn(dainikKrantiClasses.accordionTrigger, "hover:no-underline")}>
              {copy.lagnaMonth}
            </AccordionTrigger>
            <AccordionContent className={dainikKrantiClasses.accordionBody}>
              <p className={dainikKrantiClasses.accordionIntro}>{copy.lagnaMonthIntro}</p>
              <div className={cn(dainikKrantiClasses.accordionTable, "overflow-x-auto")}>
                <MonthLagnaMatrix
                  embedded
                  rows={tables.lagnaMatrix}
                  todayKey={nowKey}
                  loading={status.monthLoading}
                  empty={status.empty}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="graha-month">
            <AccordionTrigger className={cn(dainikKrantiClasses.accordionTrigger, "hover:no-underline")}>
              {copy.grahaMonth}
            </AccordionTrigger>
            <AccordionContent className={dainikKrantiClasses.accordionBody}>
              <p className={dainikKrantiClasses.accordionIntro}>{copy.grahaMonthIntro}</p>
              <MonthGrahaSpashta
                embedded
                rows={tables.grahaMatrix}
                todayKey={nowKey}
                loading={status.monthLoading}
                empty={status.empty}
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="calc-notes">
            <AccordionTrigger className={cn(dainikKrantiClasses.accordionTrigger, "hover:no-underline")}>
              {copy.calcNotes}
            </AccordionTrigger>
            <AccordionContent className={dainikKrantiClasses.accordionBody}>
              <MonthCalcNotes
                embedded
                notes={tables.calcNotes}
                loading={status.monthLoading || status.ingressLoading}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        </div>

        {/* bottom panels — was sidebar */}
        <aside className="grid w-full gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* sunrise / sunset quick glance for the reference day */}
          {page.sunRef ? (
            <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-4">
              <div className={dainikKrantiClasses.sunBox}>
                <Sunrise className="h-5 w-5 text-amber-500" />
                <div className={dainikKrantiClasses.panelText}>
                  <div className={dainikKrantiClasses.sunLabel}>{copy.sunrise}</div>
                  <div className={dainikKrantiClasses.sunValue}>{page.sunRef.sunrise}</div>
                </div>
              </div>
              <div className={dainikKrantiClasses.sunBox}>
                <Sunset className="h-5 w-5 text-indigo-500" />
                <div className={dainikKrantiClasses.panelText}>
                  <div className={dainikKrantiClasses.sunLabel}>{copy.sunset}</div>
                  <div className={dainikKrantiClasses.sunValue}>{page.sunRef.sunset}</div>
                </div>
              </div>
            </div>
          ) : null}

          {/* gochar kundali flanked by rashyadi start / end */}
          <div className="grid grid-cols-1 items-stretch gap-4 md:col-span-2 xl:col-span-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)_minmax(0,1fr)]">
            {tables.rashyadiRange.start ? (
              <GocharRashyadiTable
                segment={tables.rashyadiRange.start}
                kundaliGrahas={gochar.grahas}
                kundaliDateAd={gochar.dateAd}
                loading={status.monthLoading || status.ingressLoading}
              />
            ) : null}
            <GocharKundaliChart
              className="flex flex-col justify-center lg:mx-auto lg:w-full lg:max-w-[300px]"
              grahas={gochar.grahas}
              gapanshaLine={tables.gapanshaLine}
              papanshaLine={tables.papanshaLine}
              dateBs={gochar.dateBs}
              dateAd={gochar.dateAd}
              loading={status.gocharLoading}
              renderChart={(houses) => <D1Chart houses={houses} />}
            />
            {tables.rashyadiRange.end ? (
              <GocharRashyadiTable
                segment={tables.rashyadiRange.end}
                loading={status.monthLoading || status.ingressLoading}
              />
            ) : null}
          </div>

          {/* graha gochar / udayast */}
          <div className={dainikKrantiClasses.panel}>
            <h3 className={dainikKrantiClasses.panelTitle}>{copy.gocharTitle}</h3>
            {gochar.rows.length === 0 ? (
              <p className={dainikKrantiClasses.panelText}>{gochar.emptyText}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {gochar.rows.map((g) => (
                  <li key={g.key} className={dainikKrantiClasses.gocharRow}>
                    <span className={dainikKrantiClasses.gocharName}>
                      {g.name}
                      <span className={dainikKrantiClasses.gocharRashi}>{g.rashi}</span>
                    </span>
                    {g.next ? (
                      <span className={dainikKrantiClasses.gocharNext}>
                        {g.next.label}
                        <br />
                        {g.next.time}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* kartavya */}
          <div className={cn(dainikKrantiClasses.panelMuted, "md:col-span-2 xl:col-span-4")}>
            <h3 className={dainikKrantiClasses.panelTitle}>{page.kartavya.title}</h3>
            <div className={cn(dainikKrantiClasses.kartavyaText, "space-y-2")}>
              {page.kartavya.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className={dainikKrantiClasses.legendCard}>
        <header className={dainikKrantiClasses.legendHead}>
          <Sparkles className="h-4 w-4 text-secondary" />
          <h3 className={dainikKrantiClasses.legendTitle}>{copy.legendTitle}</h3>
          {gochar.legendDate ? <span className={dainikKrantiClasses.legendDate}>{gochar.legendDate}</span> : null}
        </header>

        <div className={cn(dainikKrantiClasses.legendBody, "grid md:grid-cols-2")}>
          {/* live graha spashta (degree · kala · vikala) + motion */}
          <div className="md:col-span-2">
            <h4 className={dainikKrantiClasses.legendHeading}>{copy.legendPositions}</h4>
            {gochar.rows.length === 0 ? (
              <p className={dainikKrantiClasses.panelText}>{gochar.emptyText}</p>
            ) : (
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {gochar.rows.map((g) => (
                  <div key={g.key} className={dainikKrantiClasses.legendPlanetRow}>
                    <span className={dainikKrantiClasses.legendMeaning}>{g.name}</span>
                    <span>{g.rashi}</span>
                    {g.dms ? <span className={dainikKrantiClasses.legendMeaning}>{g.dms}</span> : null}
                    <span
                      className={cn(
                        dainikKrantiClasses.motionPill,
                        g.vakri ? dainikKrantiClasses.motionVakri : dainikKrantiClasses.motionMargi,
                      )}
                    >
                      {g.motion}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className={cn(dainikKrantiClasses.legendNote, "mt-2")}>
              <Trans
                i18nKey={page.legends.positionsNoteKey}
                components={{
                  vakri: <span className="text-rose-600 dark:text-rose-300" />,
                  margi: <span className="text-emerald-600 dark:text-emerald-300" />,
                }}
              />
            </p>
          </div>

          {/* udayast symbol legend */}
          <div>
            <h4 className={dainikKrantiClasses.legendHeading}>{copy.legendUdayast}</h4>
            <dl className="space-y-1.5">
              {page.legends.udayast.map((it) => (
                <div key={it.code} className={dainikKrantiClasses.legendRow}>
                  <dt className={cn("w-24", dainikKrantiClasses.legendCodeCol)}>
                    <span className={cn(dainikKrantiClasses.legendCodeChip, dainikKrantiClasses.legendCodeText)}>{it.code}</span>
                  </dt>
                  <dd>
                    <span className={dainikKrantiClasses.legendMeaning}>{it.full}</span> — {it.meaning}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* gochar / papashanti house legend */}
          <div>
            <h4 className={dainikKrantiClasses.legendHeading}>{copy.legendGochar}</h4>
            <dl className="space-y-1.5">
              {page.legends.gochar.map((it) => (
                <div key={it.code} className={dainikKrantiClasses.legendRow}>
                  <dt className={cn("w-20", dainikKrantiClasses.legendCodeCol)}>
                    <span className={cn(dainikKrantiClasses.legendCodeChip, dainikKrantiClasses.legendCodeText)}>{it.code}</span>
                  </dt>
                  <dd>{it.meaning}</dd>
                </div>
              ))}
            </dl>
            <p className={cn(dainikKrantiClasses.legendNote, "mt-3")}>
              <Trans
                i18nKey={page.legends.dashaNoteKey}
                components={{ b: <span className={dainikKrantiClasses.legendStrong} /> }}
              />
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export default DainikKranti;
