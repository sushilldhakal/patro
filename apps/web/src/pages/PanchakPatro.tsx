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
} from "@vedic-patro/domain/panchak/panchak-patro-data";
import {
  PANCHAK_VARIETIES,
  panchakVarietyFromStartAd,
} from "@vedic-patro/domain/panchak/panchak-types";
import { fetchPanchakYear, panchakKeys } from "@/lib/api";
import { formatBsMonthDayPatro } from "@vedic-patro/domain/panchanga-format";
import { useLocale } from "@/i18n/locale";
import { isEnglishLocale } from "@vedic-patro/domain/avakahada-locale";
import { patroNoteBox } from "@/lib/patro-classes";
import { panchakClasses as pc } from "@vedic-patro/design-tokens/classes/panchak-classes";
import { fmtAdShort } from "@/lib/date-format";
import { cn } from "@vedic-patro/domain/utils";
import { formatBrowsePatroYear } from "@vedic-patro/domain/patro-year-axis";

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
    <article className={cn(pc.periodCard, "shadow-ring-soft")}>
      <div className={pc.periodHead}>
        <h3 className={cn(pc.periodTitle, "m-0")}>
          {t("panchak.period_label", { n: digits(index + 1) })}
        </h3>
        {variety ? (
          <span className={cn(pc.varietyBadge, pc.varietyText)}>
            {en ? variety.labelEn : variety.labelNe}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={pc.boundary}>
          <p className={pc.boundaryLabel}>
            {t("panchak.start_date")}
          </p>
          <p className={pc.boundaryValue}>
            {digits(bsStart)}, {en ? period.start.timeEn : period.start.timeNe}
          </p>
          <p className={cn(pc.boundaryAd, "mono")}>{fmtAdShort(period.start.ad, en ? "en" : "ne")}</p>
        </div>
        <div className={pc.boundary}>
          <p className={pc.boundaryLabel}>
            {t("panchak.end_date")}
          </p>
          <p className={pc.boundaryValue}>
            {digits(bsEnd)}, {en ? period.end.timeEn : period.end.timeNe}
          </p>
          <p className={cn(pc.boundaryAd, "mono")}>{fmtAdShort(period.end.ad, en ? "en" : "ne")}</p>
        </div>
      </div>

      <p className={pc.duration}>
        {t("panchak.duration")}:{" "}
        <span className={pc.durationValue}>{en ? period.durationEn : period.durationNe}</span>
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
    <PageShell className={cn(pc.pageStack, "space-y-4")}>
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs hover:text-foreground mb-2"
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

      <p className={cn(patroNoteBox, pc.introText)}>{t("panchak.intro")}</p>

      <RoutePageState isLoading={query.isLoading} data={query.data}>
        {() =>
          !periods.length ? (
            <p className={pc.noData}>{t("panchak.no_data", { year: yearLabel })}</p>
          ) : (
            <section className={pc.windows}>
              <h2 className={cn(pc.sectionTitle, pc.windowsHeading)}>
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

      <section className={pc.panel}>
        <h2 className={pc.panelTitleSpaced}>{t("panchak.prohibited_title")}</h2>
        <ul className={pc.prohibitedList}>
          {PROHIBITED_ITEMS.map(({ titleKey, descKey }) => (
            <li key={titleKey} className={cn(pc.prohibitedItem, "last:border-0 last:pb-0")}>
              <p className={pc.itemTitle}>{t(titleKey)}</p>
              <p className={pc.itemDesc}>{t(descKey)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={pc.panelLearn}>
        <h2 className={pc.panelTitle}>{t("panchak.learn_title")}</h2>

        <div>
          <h3 className={pc.learnHeading}>{t("panchak.what_title")}</h3>
          <p className={pc.learnBody}>{t("panchak.what_body")}</p>
        </div>

        <div>
          <h3 className={pc.learnHeading}>{t("panchak.rahita_title")}</h3>
          <p className={pc.learnBody}>{t("panchak.rahita_body")}</p>
        </div>

        <div>
          <h3 className={pc.learnHeadingSpaced}>{t("panchak.types_title")}</h3>
          <ul className={pc.typesList}>
            {PANCHAK_VARIETIES.map((v) => (
              <li key={v.id} className={pc.typeItem}>
                <span className={pc.typeName}>{en ? v.labelEn : v.labelNe}</span>
                <span> — {en ? v.noteEn : v.noteNe}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
