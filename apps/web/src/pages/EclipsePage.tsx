import { getRouteApi } from "@tanstack/react-router";
import { Eclipse, MoonStar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RoutePageState } from "@/components/common/RoutePageState";
import { GrahaDetailPageFrame } from "@/components/graha/GrahaDetailPageFrame";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import {
  usePatroYearDataPage,
  usePatroYearDataQuery,
} from "@/hooks/use-patro-year-data-page";
import { useLocale } from "@/i18n/locale";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@/lib/utils";
import { localTimeShortFromIso } from "@/lib/time-format";
import {
  fetchEclipseYear,
  grahaDetailKeys,
  type EclipseEvent,
} from "@/lib/api";

const suryaRouteApi = getRouteApi("/panchanga-shell/panchanga/surya-grahan");
const chandraRouteApi = getRouteApi("/panchanga-shell/panchanga/chandra-grahan");

function renderedEclipseDate(ev: EclipseEvent): string {
  const label = ev.date_jd_date?.trim();
  if (label) return label;
  return ev.date_bs ?? ev.date_ad ?? "";
}

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
    <div className={cn(patroCard, "flex flex-col")}>
      <div
        className={cn(
          "flex items-baseline justify-between gap-2 border-b border-border px-3.5 py-2.5",
          ev.visible ? "bg-success/[0.12]" : "bg-secondary/[0.09] dark:bg-secondary/20",
        )}
      >
        <span className="text-base font-bold text-foreground">{typeLabel}</span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
            ev.visible
              ? "bg-success/20 text-success"
              : "bg-foreground/10 text-muted-foreground",
          )}
        >
          {ev.visible
            ? t("graha_pages.eclipse.visible_nepal")
            : t("graha_pages.eclipse.not_visible_nepal")}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 p-3.5 text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">{t("graha_pages.eclipse.date")}</span>
          <span className="text-right font-semibold text-foreground">
            <span className="font-num tabular-nums">{digits(dateLabel)}</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-muted-foreground">{t("graha_pages.eclipse.maximum")}</span>
          <span className="font-num tabular-nums text-foreground">{max ? digits(max) : "—"}</span>
        </div>
        {ev.visible && begin ? (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">
              {isLunar
                ? t("graha_pages.eclipse.partial_begins")
                : t("graha_pages.eclipse.first_contact")}
            </span>
            <span className="font-num tabular-nums text-foreground">{digits(begin)}</span>
          </div>
        ) : null}
        {ev.visible && end ? (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">
              {isLunar
                ? t("graha_pages.eclipse.partial_ends")
                : t("graha_pages.eclipse.last_contact")}
            </span>
            <span className="font-num tabular-nums text-foreground">{digits(end)}</span>
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
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.events.map((ev, i) => (
                <EclipseCard key={i} ev={ev} pageId={pageId} />
              ))}
            </div>
          ) : (
            <p className={cn(patroCard, "mt-2 p-4 text-sm text-muted-foreground")}>
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
