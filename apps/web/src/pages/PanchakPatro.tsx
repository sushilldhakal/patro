import { useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, CalendarClock } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { RoutePageState } from "@/components/common/RoutePageState";
import {
  usePatroYearDataPage,
  usePatroYearDataQuery,
} from "@/hooks/use-patro-year-data-page";
import {
  mapPanchakPeriod,
  type PanchakPeriod,
} from "@/lib/panchak/panchak-patro-data";
import {
  PANCHAK_VARIETIES,
  panchakVarietyFromStartAd,
} from "@/lib/panchak/panchak-types";
import { fetchPanchakYear, panchakKeys } from "@/lib/api";
import { formatBsMonthDayPatro } from "@/lib/panchanga-format";
import { useLocale } from "@/i18n/locale";
import { isEnglishLocale } from "@/lib/avakahada-locale";
import { patroNoteBox } from "@/lib/patro-classes";
import { fmtAdShort } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { formatBrowsePatroYear } from "@/lib/patro-year-axis";

const routeApi = getRouteApi("/panchanga-shell/panchak-patro");

const PROHIBITED_ITEMS = [
  { titleKey: "panchak.prohibited.south_travel", descKey: "panchak.prohibited.south_travel_desc" },
  { titleKey: "panchak.prohibited.roof", descKey: "panchak.prohibited.roof_desc" },
  { titleKey: "panchak.prohibited.bed", descKey: "panchak.prohibited.bed_desc" },
  { titleKey: "panchak.prohibited.fuel", descKey: "panchak.prohibited.fuel_desc" },
  { titleKey: "panchak.prohibited.last_rites", descKey: "panchak.prohibited.last_rites_desc" },
] as const;

function PanchakPeriodCard({
  index,
  period,
  lang,
}: {
  index: number;
  period: PanchakPeriod;
  lang?: string;
}) {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const en = isEnglishLocale(lang);
  const variety = panchakVarietyFromStartAd(period.start.ad);

  const bsStart = formatBsMonthDayPatro(
    period.start.bsYear,
    period.start.bsMonth,
    period.start.bsDay,
  );
  const bsEnd = formatBsMonthDayPatro(period.end.bsYear, period.end.bsMonth, period.end.bsDay);

  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs shadow-ring-soft">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <h3 className="text-sm font-bold text-foreground m-0">
          {t("panchak.period_label", { n: digits(index + 1) })}
        </h3>
        {variety ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-sm font-semibold text-amber-800 dark:text-amber-300">
            {en ? variety.labelEn : variety.labelNe}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
          <p className="text-sm font-semibold uppercase tracking-wider mb-1.5">
            {t("panchak.start_date")}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {digits(bsStart)}, {en ? period.start.timeEn : period.start.timeNe}
          </p>
          <p className="mono mt-1 text-xs">{fmtAdShort(period.start.ad, en ? "en" : "ne")}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3">
          <p className="text-sm font-semibold uppercase tracking-wider mb-1.5">
            {t("panchak.end_date")}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {digits(bsEnd)}, {en ? period.end.timeEn : period.end.timeNe}
          </p>
          <p className="mono mt-1 text-xs">{fmtAdShort(period.end.ad, en ? "en" : "ne")}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-base">
        {t("panchak.duration")}:{" "}
        <span className="text-foreground">{en ? period.durationEn : period.durationNe}</span>
      </p>
    </article>
  );
}

export function PanchakPatro() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const en = isEnglishLocale(lang);
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const { year, era, setYear, setEra } = yearBrowse;

  const yearLabel = useMemo(
    () => formatBrowsePatroYear(era, year, lang, digits),
    [era, year, lang, digits],
  );

  const query = usePatroYearDataQuery({ location, setLocation, yearBrowse }, {
    queryKey: panchakKeys.year,
    queryFn: fetchPanchakYear,
  });

  const periods = useMemo(
    () => query.data?.periods.map(mapPanchakPeriod) ?? [],
    [query.data?.periods],
  );

  return (
    <PageShell className="pb-16 space-y-4">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-base hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("panchak.back_home")}
        </Link>

        <PageHeader
          icon={<CalendarClock className="h-7 w-7 text-secondary shrink-0" />}
          title={t("panchak.title", { year: yearLabel })}
          subtitle={t("panchak.subtitle")}
        />
      </div>

      <PatroYearNavBlock
        era={era}
        year={year}
        onYearChange={setYear}
        onEraChange={setEra}
        gregorianRange={query.data?.gregorian_range}
        location={location}
        onLocationChange={setLocation}
        className=""
      />

      <p className={cn(patroNoteBox, "text-sm leading-relaxed")}>{t("panchak.intro")}</p>

      <RoutePageState isLoading={query.isLoading} data={query.data}>
        {() =>
          !periods.length ? (
            <p className="text-sm">{t("panchak.no_data", { year: yearLabel })}</p>
          ) : (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600" />
                {t("panchak.periods_title", { year: yearLabel })}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {periods.map((period, i) => (
                  <PanchakPeriodCard key={`${period.start.ad}-${period.end.ad}`} index={i} period={period} lang={lang} />
                ))}
              </div>
            </section>
          )
        }
      </RoutePageState>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-bold text-foreground mb-3">{t("panchak.prohibited_title")}</h2>
        <ul className="space-y-3">
          {PROHIBITED_ITEMS.map(({ titleKey, descKey }) => (
            <li key={titleKey} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
              <p className="text-sm mt-0.5 leading-relaxed">{t(descKey)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <h2 className="text-base font-bold text-foreground">{t("panchak.learn_title")}</h2>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("panchak.what_title")}</h3>
          <p className="text-sm leading-relaxed">{t("panchak.what_body")}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{t("panchak.rahita_title")}</h3>
          <p className="text-sm leading-relaxed">{t("panchak.rahita_body")}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("panchak.types_title")}</h3>
          <ul className="space-y-2.5">
            {PANCHAK_VARIETIES.map((v) => (
              <li key={v.id} className="text-sm leading-relaxed">
                <span className="font-semibold text-foreground">{en ? v.labelEn : v.labelNe}</span>
                <span> — {en ? v.noteEn : v.noteNe}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
