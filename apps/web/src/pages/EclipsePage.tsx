import { getRouteApi } from "@tanstack/react-router";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { Eclipse, MoonStar } from "lucide-react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import {
  usePatroYearDataPage,
  usePatroYearDataQuery,
} from "@/hooks/use-patro-year-data-page";
import { useLocale } from "@/i18n/locale";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { localTimeShortFromIso } from "@vedic-patro/domain/time-format";
import {
  fetchEclipseYear,
  grahaDetailKeys,
  type EclipseEvent,
} from "@/lib/api";
import { renderedEclipseDate } from "@vedic-patro/domain/eclipse-date";

const suryaRouteApi = getRouteApi("/panchanga-shell/panchanga/surya-grahan");
const chandraRouteApi = getRouteApi("/panchanga-shell/panchanga/chandra-grahan");

function EclipseCard({ ev, pageId }: { ev: EclipseEvent; pageId: string }) {
  const { digits, lang } = useLocale();
  const { t } = useTranslation();
  const begin = localTimeShortFromIso(ev.begin_local);
  const end = localTimeShortFromIso(ev.end_local);
  const max = localTimeShortFromIso(ev.max_local);
  const isLunar = pageId === "chandra-grahan";
  const typeLabel = lang === "en" ? ev.type_en : ev.type_ne;
  const dateLabel = renderedEclipseDate(ev);
  return (
    <div className={cn(patroCard, grahaClasses.eclipseCard, "flex flex-col")}>
      <div
        className={cn(
          grahaClasses.eclipseHead,
          "flex",
          ev.visible ? grahaClasses.eclipseHeadVisible : grahaClasses.eclipseHeadHidden,
        )}
      >
        <span className={grahaClasses.eclipseType}>{typeLabel}</span>
        <span
          className={cn(
            grahaClasses.eclipseBadge,
            ev.visible ? grahaClasses.eclipseBadgeVisible : grahaClasses.eclipseBadgeHidden,
          )}
        >
          {ev.visible
            ? t("graha_pages.eclipse.visible_nepal")
            : t("graha_pages.eclipse.not_visible_nepal")}
        </span>
      </div>
      <div className={cn(grahaClasses.eclipseBody, "flex flex-col text-sm")}>
        <div className={cn(grahaClasses.eclipseRow, "flex")}>
          <span className={grahaClasses.eclipseLabel}>{t("graha_pages.eclipse.date")}</span>
          <span className={grahaClasses.eclipseDate}>
            <span className={grahaClasses.eclipseNum}>{digits(dateLabel)}</span>
          </span>
        </div>
        <div className={cn(grahaClasses.eclipseRow, "flex")}>
          <span className={grahaClasses.eclipseLabel}>{t("graha_pages.eclipse.maximum")}</span>
          <span className={grahaClasses.eclipseValue}>{max ? digits(max) : "—"}</span>
        </div>
        {ev.visible && begin ? (
          <div className={cn(grahaClasses.eclipseRow, "flex")}>
            <span className={grahaClasses.eclipseLabel}>
              {isLunar
                ? t("graha_pages.eclipse.partial_begins")
                : t("graha_pages.eclipse.first_contact")}
            </span>
            <span className={grahaClasses.eclipseValue}>{digits(begin)}</span>
          </div>
        ) : null}
        {ev.visible && end ? (
          <div className={cn(grahaClasses.eclipseRow, "flex")}>
            <span className={grahaClasses.eclipseLabel}>
              {isLunar
                ? t("graha_pages.eclipse.partial_ends")
                : t("graha_pages.eclipse.last_contact")}
            </span>
            <span className={grahaClasses.eclipseValue}>{digits(end)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EclipseView({ kind }: { kind: "solar" | "lunar" }) {
  const { t } = useTranslation();
  const routeApi = kind === "solar" ? suryaRouteApi : chandraRouteApi;
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const pageId = kind === "solar" ? "surya-grahan" : "chandra-grahan";

  const query = usePatroYearDataQuery({ location, setLocation, yearBrowse }, {
    queryKey: (year, locationParams, era) =>
      grahaDetailKeys.eclipse(kind, year, locationParams, era),
    queryFn: (year, locationParams, era) =>
      fetchEclipseYear(kind, year, locationParams, era),
  });

  const banner =
    kind === "solar"
      ? {
          icon: <Eclipse className="h-6 w-6 text-accent dark:text-secondary" />,
          titleKey: "graha_pages.eclipse_solar.title",
          blurbKey: "graha_pages.eclipse_solar.blurb",
        }
      : {
          icon: <MoonStar className="h-6 w-6 text-accent dark:text-secondary" />,
          titleKey: "graha_pages.eclipse_lunar.title",
          blurbKey: "graha_pages.eclipse_lunar.blurb",
        };

  return (
    <GrahaDetailPageFrame
      banner={banner}
      descriptionPageId={pageId}
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
        {(data) =>
          data.events.length ? (
            <div className={cn(grahaClasses.eclipseGrid, "grid grid-cols-1 sm:grid-cols-2")}>
              {data.events.map((ev, i) => (
                <EclipseCard key={i} ev={ev} pageId={pageId} />
              ))}
            </div>
          ) : (
            <p className={cn(patroCard, grahaClasses.eclipseNone, grahaClasses.eclipseNoneText)}>
              {t("graha_pages.eclipse.no_eclipses_year")}
            </p>
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
