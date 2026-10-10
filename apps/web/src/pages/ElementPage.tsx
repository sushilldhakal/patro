import { getRouteApi, Navigate, useParams } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GrahaBanner, ElementDescription } from "@/components/graha/GrahaPageParts";
import { RoutePageState } from "@/components/common/RoutePageState";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import { useElementPageUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useResolvedPatroDayQuery } from "@/hooks/use-resolved-patro-day-query";
import { cn } from "@/lib/utils";
import { patroCard, patroGoodBadTone } from "@/lib/patro-classes";
import { clockFromGhati, parseHHMM } from "@/lib/time-format";
import { PatroDayTimeNav, PatroMonthYearNav } from "@/components/patro-date";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { NavataraBalamCardGrid } from "@/components/panchanga/NavataraBalamCardGrid";
import { useRouteLoading } from "@/lib/route-loading";
import { searchToLocation } from "@/lib/url-state";
import { ELEMENT_BY_ID } from "@/lib/panchanga-elements";
import { getChandraBalamCards, getTaraBalamCards } from "@/lib/balam-cards";
import {
  CHOGHADIYA_TYPE_KEYS,
  TONE_BY_KEY,
  choghadiyaLegendLabel,
  choghadiyaLegendMarker,
  choghadiyaRowLabel,
  choghadiyaTone,
} from "@/lib/choghadiya-display";
import {
  getChandrabalamTable,
  getTarabalaTable,
  formatElementStampDisplay,
} from "@/lib/panchanga-format";
import { formatRashiDisplay } from "@/lib/rashi-i18n";
import {
  ElementDayRowIcon,
  ElementSpanIcon,
  RashiGlyphIcon,
  NakshatraGlyphIcon,
} from "@/components/panchanga/element/ElementGlyphIcon";
import { todayAdStringInTimezone, resolveTimeZone } from "@/lib/zoned-time";
import {
  elementKeys,
  fetchElementDay,
  fetchElementSpans,
  type ElementSpan,
  type ElementStamp,
  type PanchangaDay,
} from "@/lib/api";

const routeApi = getRouteApi("/panchanga-shell/panchanga/element/$name");

/* ── span (begin→end) view ─────────────────────────────────────────────── */

function SpanBoundary({
  label,
  stamp,
  tone,
}: {
  label: string;
  stamp: ElementStamp;
  tone: "begin" | "end";
}) {
  const { digits, lang } = useLocale();
  const shell =
    tone === "begin"
      ? "rounded-md bg-success/10 px-2 py-1.5"
      : "rounded-md bg-danger/10 px-2 py-1.5";
  const labelCls = tone === "begin" ? "font-semibold text-success" : "font-semibold text-danger";

  return (
    <div className={cn("flex flex-col gap-0.5", shell)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={labelCls}>{label}</span>
        <span className="font-num tabular-nums text-foreground">{digits(stamp.time_label)}</span>
      </div>
      <p className="m-0 font-num text-sm font-semibold leading-snug text-foreground md:text-base">
        {formatElementStampDisplay(stamp, lang)}
      </p>
    </div>
  );
}

function SpanList({ spans, elementId }: { spans: ElementSpan[]; elementId: string }) {
  const { lang } = useLocale();
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {spans.map((s, i) => (
        <div key={`${s.name}-${i}`} className={cn(patroCard, "flex flex-col gap-2 p-3")}>
          <div className="flex items-center gap-2.5">
            <ElementSpanIcon elementId={elementId} span={s} size={34} className="opacity-95" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-bold text-foreground">
                  {bilingualText(lang, s.name_ne, s.name)}
                </span>
                {s.paksha ? (
                  <span className="text-xs text-base">
                    {s.paksha === "shukla" ? t("common.paksha_shukla") : t("common.paksha_krishna")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <SpanBoundary
              label={t("common.begins")}
              stamp={s.begins}
              tone="begin"
            />
            <SpanBoundary
              label={t("common.ends")}
              stamp={s.ends}
              tone="end"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── table (per-day) view — generic renderer ───────────────────────────── */

type AnyRow = Record<string, unknown>;

function ChoghadiyaLegend() {
  const { lang } = useLocale();
  return (
    <ul className="m-0 mb-3 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2">
      {CHOGHADIYA_TYPE_KEYS.map((key) => (
        <li key={key} className="text-sm leading-snug text-muted-foreground">
          {choghadiyaLegendMarker(TONE_BY_KEY[key])} {choghadiyaLegendLabel(key, lang)}
        </li>
      ))}
    </ul>
  );
}

type ChoghadiyaRow = {
  name_ne?: string;
  name?: string;
  start_local_time_short?: string;
  end_local_time_short?: string;
  start_g?: number;
  end_g?: number;
  bad?: boolean;
};

function ChoghadiyaTableView({ data, sunrise }: { data: ChoghadiyaRow[]; sunrise?: string }) {
  const { digits, lang } = useLocale();
  const { t } = useTranslation();
  const sunriseMin = parseHHMM(sunrise);

  if (data.length === 0) {
    return <p className="text-sm">{t("element_page.no_entries_day")}</p>;
  }

  return (
    <>
      <ChoghadiyaLegend />
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((it, i) => {
          const nameNe = String(it.name_ne ?? it.name ?? "—");
          const tone = choghadiyaTone(nameNe, it.bad);
          const label = choghadiyaRowLabel(nameNe, lang, it.bad);
          let time: string | null = null;
          if (it.start_local_time_short) {
            time = `${digits(String(it.start_local_time_short))}–${digits(String(it.end_local_time_short ?? ""))}`;
          } else if (typeof it.start_g === "number") {
            const a = clockFromGhati(sunriseMin, it.start_g);
            const b = clockFromGhati(sunriseMin, it.end_g as number);
            if (a && b) time = `${digits(a)}–${digits(b)}`;
          }
          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm",
                patroGoodBadTone(tone === "good", tone === "bad"),
              )}
            >
              <span className="font-semibold">{label}</span>
              {time ? <span className="font-num tabular-nums text-sm opacity-90">{time}</span> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

function TableView({
  data,
  sunrise,
  elementId,
}: {
  data: unknown;
  sunrise?: string;
  elementId?: string;
}) {
  const { lang, digits } = useLocale();
  const { t } = useTranslation();
  const sunriseMin = parseHHMM(sunrise);

  // Object with a `rows` array → moon/star strength table (chandrabala/tarabala).
  if (data && typeof data === "object" && Array.isArray((data as AnyRow).rows)) {
    const obj = data as AnyRow;
    const rows = obj.rows as AnyRow[];
    const anchor = bilingualText(lang, 
      String(obj.moon_label ?? obj.label_ne ?? ""),
      String(obj.moon_label_en ?? obj.label_en ?? ""),
    );
    return (
      <div className="flex flex-col gap-2">
        {anchor ? (
          <p className="text-sm text-base">
            {t("common.moon_sign")}: <span className="font-bold text-foreground">{anchor}</span>
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r, i) => {
            const good = r.tone === "good" || r.quality === "शुभ";
            const bad = r.tone === "bad" || r.quality === "अशुभ";
            const rowNum = typeof r.number === "number" ? r.number : i + 1;
            return (
              <div
                key={i}
                className={cn("flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm", patroGoodBadTone(good, bad))}
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  {elementId === "tarabala" ? (
                    <NakshatraGlyphIcon
                      name={String(r.name ?? "")}
                      number={rowNum}
                      size={24}
                    />
                  ) : (
                    <RashiGlyphIcon name={String(r.name ?? "")} number={rowNum} size={24} />
                  )}
                  {bilingualText(lang, String(r.name ?? ""), String(r.name_en ?? r.name ?? ""))}
                </span>
                <span className="text-sm opacity-90">
                  {bilingualText(lang, String(r.tara ?? ""), String(r.tara ?? ""))}
                  {r.quality ? ` · ${bilingualText(lang, String(r.quality), String(r.quality))}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Array of time segments (choghadiya / hora / lagna / panchaka / pushkara).
  if (Array.isArray(data)) {
    const rows = data as AnyRow[];
    if (elementId === "choghadiya") {
      return <ChoghadiyaTableView data={rows as ChoghadiyaRow[]} sunrise={sunrise} />;
    }
    if (rows.length === 0) {
      return <p className="text-sm">{t("element_page.no_entries_day")}</p>;
    }
    return (
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((it, i) => {
          const label = bilingualText(lang, 
            String(it.name_ne ?? it.planet_ne ?? it.lagna_ne ?? it.name ?? it.lagna ?? "—"),
            String(it.name ?? it.planet_en ?? it.lagna ?? it.name_ne ?? "—"),
          );
          let time: string | null = null;
          if (it.start_local_time_short) {
            time = `${digits(String(it.start_local_time_short))}–${digits(String(it.end_local_time_short ?? ""))}`;
          } else if (typeof it.start_g === "number") {
            const a = clockFromGhati(sunriseMin, it.start_g as number);
            const b = clockFromGhati(sunriseMin, it.end_g as number);
            if (a && b) time = `${digits(a)}–${digits(b)}`;
          }
          const bad = it.bad === true || it.good === false;
          const good = it.good === true || it.tone === "good";
          const hasPushkara = Array.isArray(it.pushkara_navamsha) && (it.pushkara_navamsha as unknown[]).length > 0;
          return (
            <div
              key={i}
              className={cn("flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm", patroGoodBadTone(good, bad))}
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <ElementDayRowIcon elementId={elementId} row={it} size={24} />
                {label}
                {hasPushkara ? (
                  <span className="rounded-full bg-secondary/20 px-1.5 py-px text-sm font-bold text-secondary dark:text-accent">
                    {t("common.pushkara")}
                  </span>
                ) : null}
              </span>
              {time ? <span className="font-num tabular-nums text-sm opacity-90">{time}</span> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return <p className="text-sm">{t("common.no_data")}</p>;
}

function NavataraBalamElementView({
  elementId,
  p,
  clock,
}: {
  elementId: "chandrabala" | "tarabala";
  p: PanchangaDay;
  clock?: string;
}) {
  const { lang } = useLocale();
  const { t } = useTranslation();
  const isChandra = elementId === "chandrabala";
  const cards = isChandra ? getChandraBalamCards(p) : getTaraBalamCards(p);
  const table = isChandra ? getChandrabalamTable(p) : getTarabalaTable(p);

  const moonLabel = isChandra
    ? formatRashiDisplay(table?.moon_label, table?.moon_label_en, lang)
    : bilingualText(lang, table?.moon_label ?? "", table?.moon_label_en ?? table?.moon_label ?? "");
  const moonRef =
    table?.moon_label && moonLabel
      ? t(isChandra ? "element_page.moon_sign_sunrise" : "element_page.moon_nakshatra_sunrise", {
          label: moonLabel,
        })
      : undefined;

  const formatName = isChandra
    ? (card: ReturnType<typeof getChandraBalamCards>[number]) =>
        formatRashiDisplay(card.name, card.nameEn, lang) ?? bilingualText(lang, card.name, card.nameEn ?? card.name)
    : (card: ReturnType<typeof getTaraBalamCards>[number]) => bilingualText(lang, card.name, card.nameEn ?? card.name);

  if (!cards.length) {
    return <p className="text-sm">{t("common.no_data")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {moonRef ? <p className="m-0 text-center text-sm text-muted-foreground">{moonRef}</p> : null}
      <NavataraBalamCardGrid
        cards={cards}
        clock={clock}
        formatName={formatName}
        lang={lang}
        variant={elementId}
      />
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

export function ElementPage() {
  const { name } = useParams({ strict: false }) as { name?: string };
  const { t } = useTranslation();
  const { lang } = useLocale();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const meta = name ? ELEMENT_BY_ID[name] : undefined;
  const isNavataraBal = name === "chandrabala" || name === "tarabala";

  const todayAd = todayAdStringInTimezone(
    new Date(),
    resolveTimeZone(undefined, location.params.timezone),
  );
  const isSpan = meta?.kind === "span";

  const { monthBrowse, dayBrowse } = useElementPageUrlBrowse(
    Boolean(isSpan),
    search,
    navigate,
    location,
    setLocation,
  );
  const { dayState, date, setDate, setDisplayEra, syncPickerFromDateAd, syncResolvedPatroDay } =
    dayBrowse;

  const dayResolveQ = useResolvedPatroDayQuery(
    dayState,
    location.params,
    { syncPickerFromDateAd, syncResolvedPatroDay },
    {
      enabled: Boolean(name) && Boolean(meta) && !isSpan,
      syncFromData: !isSpan,
    },
  );

  const dayAd = dayResolveQ.data?.date_ad ?? "";

  const spanQuery = useQuery({
    queryKey: [
      "element",
      "spans",
      name,
      monthBrowse.era,
      monthBrowse.year,
      monthBrowse.month,
      location.params,
    ] as const,
    queryFn: () =>
      fetchElementSpans(
        name!,
        {
          era: monthBrowse.era,
          year: monthBrowse.year,
          month: monthBrowse.month,
        },
        location.params,
      ),
    enabled: Boolean(name) && Boolean(meta) && isSpan,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const dayQuery = useQuery({
    queryKey: elementKeys.day(name ?? "", dayAd, location.params),
    queryFn: () => fetchElementDay(name!, dayAd, location.params),
    enabled: Boolean(name) && Boolean(meta) && !isSpan && !isNavataraBal && Boolean(dayAd),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const panchangaQuery = dayResolveQ;

  const timezone = resolveTimeZone(undefined, location.params.timezone);
  const elementClock =
    dayAd === todayAdStringInTimezone(new Date(), timezone)
      ? defaultClockForTimezone(timezone)
      : undefined;

  const firstLoading = isSpan
    ? spanQuery.isLoading && !spanQuery.data
    : isNavataraBal
      ? dayResolveQ.isLoading && !dayResolveQ.data
      : dayQuery.isLoading && !dayQuery.data;
  useRouteLoading(Boolean(meta) && firstLoading);

  if (name === "udaya-lagna") {
    return (
      <Navigate
        to="/panchanga/element/$name"
        params={{ name: "lagna" }}
        search={search}
        replace
      />
    );
  }

  if (!meta) {
    return (
      <PageShell>
        <PageHeader icon={<Sparkles className="h-6 w-6 text-secondary" />} title={t("element_page.unknown_element")} />
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

      {isSpan ? (
        <PatroMonthYearNav
          era={monthBrowse.era}
          year={monthBrowse.year}
          month={monthBrowse.month}
          displayLanguage={lang}
          onMonthChange={(m) => monthBrowse.setYearMonth(monthBrowse.year, m)}
          onYearChange={(y) => monthBrowse.setYearMonth(y, monthBrowse.month)}
          onBrowseCommit={monthBrowse.commitEraYear}
          onPrev={() => monthBrowse.stepMonth(-1)}
          onNext={() => monthBrowse.stepMonth(1)}
          onToday={() => monthBrowse.goToday(todayAd)}
          todayAd={todayAd}
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
          todayAd={todayAd}
          location={location}
          onLocationChange={setLocation}
        />
      )}

      {isSpan ? (
        <RoutePageState isLoading={spanQuery.isLoading} data={spanQuery.data}>
          {(data) => <SpanList spans={data.spans} elementId={name!} />}
        </RoutePageState>
      ) : isNavataraBal ? (
        <RoutePageState isLoading={panchangaQuery.isLoading} data={panchangaQuery.data}>
          {(data) => (
            <div className={cn(patroCard, "p-3.5")}>
              <NavataraBalamElementView
                elementId={name as "chandrabala" | "tarabala"}
                p={data}
                clock={elementClock}
              />
            </div>
          )}
        </RoutePageState>
      ) : (
        <RoutePageState isLoading={dayQuery.isLoading} data={dayQuery.data}>
          {(data) => (
            <div className={cn(patroCard, "p-3.5")}>
              <TableView data={data.data} sunrise={data.sunrise} elementId={name} />
            </div>
          )}
        </RoutePageState>
      )}

      <ElementDescription elementId={meta.id} />

      <PanchangaDetailsBackLink />
    </PageShell>
  );
}

export default ElementPage;
