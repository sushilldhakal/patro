import { useMemo } from "react";
import { Sunrise } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { GrahaGroupedEventCards } from "@/components/graha/GrahaGroupedEventCards";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import {
  usePatroYearDataPage,
  usePatroYearDataQuery,
} from "@/hooks/use-patro-year-data-page";
import { useLocale } from "@/i18n/locale";
import { grahaName } from "@/lib/graha-i18n";
import { cn } from "@vedic-patro/domain/utils";
import { formatBsIsoDateNepali } from "@vedic-patro/domain/panchanga-format";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { formatLocaleDigits } from "@/i18n/digits";
import { parsePatroDayDateKey } from "@vedic-patro/domain/patro-day";
import {
  fetchGrahaAstaYear,
  grahaDetailKeys,
  type AstaStamp,
  type GrahaAstaPeriod,
} from "@/lib/api";
import { getRouteApi } from "@tanstack/react-router";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

const routeApi = getRouteApi("/panchanga-shell/panchanga/graha-asta");

const GRAHA_ORDER = ["mercury", "venus", "moon", "mars", "jupiter", "saturn"];

function formatEraDayLabel(eraDay: string, lang: string): string | undefined {
  try {
    const { month, day } = parsePatroDayDateKey(eraDay);
    const isEn = lang.startsWith("en");
    const monthName = isEn ? BS_MONTH_NAMES[month - 1] : BS_MONTHS_NE[month - 1];
    return `${monthName} ${formatLocaleDigits(day, lang)}`;
  } catch {
    return formatBsIsoDateNepali(eraDay, { lang, includeYear: false });
  }
}

function renderedStampDate(stamp: AstaStamp | null, lang: string): string {
  if (!stamp) return "";
  const eraDay = stamp.date?.trim();
  if (eraDay) {
    return formatEraDayLabel(eraDay, lang) ?? eraDay;
  }
  const isEn = lang.startsWith("en");
  if (isEn) return stamp.date_ad ?? stamp.date_bs ?? "";
  return stamp.date_bs ?? stamp.date_ad ?? "";
}

function StampLine({
  label,
  stamp,
  tone,
}: {
  label: string;
  stamp: AstaStamp | null;
  tone: "asta" | "udaya";
}) {
  const { digits, lang } = useLocale();
  const { t } = useTranslation();
  const dateLabel = renderedStampDate(stamp, lang);
  return (
    <div className={cn(grahaClasses.stampRow, "flex")}>
      <span
        className={cn(
          grahaClasses.stampLabel,
          tone === "asta" ? grahaClasses.toneAsta : grahaClasses.toneUdaya,
        )}
      >
        {label}
      </span>
      <span className={grahaClasses.stampValue}>
        {stamp ? (
          <span className="block">
            {digits(dateLabel)}
            <span className={grahaClasses.stampTime}> · {digits(stamp.time_short)}</span>
          </span>
        ) : (
          <span className={grahaClasses.stampOutside}>{t("graha_pages.asta.outside_year")}</span>
        )}
      </span>
    </div>
  );
}

function PeriodCard({ period }: { period: GrahaAstaPeriod }) {
  const { digits } = useLocale();
  const { t } = useTranslation();
  const hemi =
    period.hemisphere === "east"
      ? t("graha_pages.asta.east_morning")
      : period.hemisphere === "west"
        ? t("graha_pages.asta.west_evening")
        : null;
  return (
    <div className={cn(grahaClasses.periodCard, "flex flex-col text-sm")}>
      <StampLine label={t("graha_pages.asta.asta_begins")} stamp={period.start} tone="asta" />
      <StampLine label={t("graha_pages.asta.udaya_ends")} stamp={period.end} tone="udaya" />
      <div className={cn(grahaClasses.periodFoot, grahaClasses.periodFootText, "flex")}>
        <span>{hemi}</span>
        {period.duration_days != null ? (
          <span>{t("graha_pages.asta.duration_days", { count: digits(period.duration_days) })}</span>
        ) : null}
      </div>
    </div>
  );
}

export function GrahaAsta() {
  const { lang } = useLocale();
  const { t } = useTranslation();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);

  const query = usePatroYearDataQuery({ location, setLocation, yearBrowse }, {
    queryKey: grahaDetailKeys.asta,
    queryFn: fetchGrahaAstaYear,
  });

  const byGraha = useMemo(() => {
    const groups = new Map<string, GrahaAstaPeriod[]>();
    for (const g of GRAHA_ORDER) groups.set(g, []);
    for (const p of query.data?.periods ?? []) {
      if (!groups.has(p.graha)) groups.set(p.graha, []);
      groups.get(p.graha)!.push(p);
    }
    return groups;
  }, [query.data?.periods]);

  return (
    <GrahaDetailPageFrame
      banner={{
        icon: <Sunrise className="h-6 w-6 text-accent dark:text-secondary" />,
        titleKey: "sidebar_nav.items.graha-asta.label",
        blurbKey: "sidebar_nav.items.graha-asta.blurb",
      }}
      descriptionPageId="graha-asta"
      nav={
        <PatroYearNavBlock
          era={yearBrowse.era}
          year={yearBrowse.year}
          onYearChange={yearBrowse.setYear}
          onEraChange={yearBrowse.setEra}
          gregorianRange={query.data?.gregorian_range}
          location={location}
          onLocationChange={setLocation}
        />
      }
    >
      <RoutePageState isLoading={query.isLoading} data={query.data}>
        {() => (
          <GrahaGroupedEventCards
            order={GRAHA_ORDER}
            groups={byGraha}
            renderCardHeader={(g, periods) => {
              const isMoon = g === "moon";
              return (
                <>
                  <span className={grahaClasses.columnTitle}>
                    {grahaName(g, lang)}
                    {isMoon ? (
                      <span className={grahaClasses.columnNote}>
                        {t("graha_pages.asta.tara_asta")}
                      </span>
                    ) : null}
                  </span>
                  <span className={grahaClasses.columnCount}>
                    {periods.length
                      ? t("graha_pages.asta.times", { count: periods.length })
                      : t("graha_pages.asta.none")}
                  </span>
                </>
              );
            }}
            renderItem={(p) => <PeriodCard period={p} />}
            emptyInGroup={
              <p className={grahaClasses.columnEmpty}>
                {t("graha_pages.asta.no_asta_year")}
              </p>
            }
          />
        )}
      </RoutePageState>
    </GrahaDetailPageFrame>
  );
}

export default GrahaAsta;
