import { useCallback, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Orbit } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroDayTimeNav } from "@/components/patro-date";
import { GocharSkySection } from "@/components/gochar/GocharSkySection";
import { GocharIngressSection } from "@/components/gochar/GocharIngressSection";
import { GocharPlanetDeepDive } from "@/components/gochar/GocharPlanetDeepDive";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { usePatroDayUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useResolvedPatroDayQuery } from "@/hooks/use-resolved-patro-day-query";
import { useTranslation } from "react-i18next";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";
import { todayAdStringInTimezone, resolveTimeZone } from "@/lib/zoned-time";
import { searchToLocation } from "@/lib/url-state";
import type { GrahaKey } from "@/lib/graha-details";
import {
  fetchGocharIngress,
  fetchGocharJd,
  fetchMonthCalendar,
  gocharKeys,
} from "@/lib/api";
import {
  buildGocharIngressMonthList,
  ingressFetchRangeForBrowseMonth,
  ingressGocharFetchEra,
} from "@/lib/gochar-page-utils";
import { formatBsIsoDateNepali } from "@/lib/panchanga-format";
import { formatPatroCivilDayLabel } from "@/lib/patro-headline-subtitle";
import {
  adMonthLabel,
  bsMonthLabel,
  isGregorianEraBrowse,
} from "@/components/patro-date/patro-month-labels";
import {
  pickAdDate,
  pickBrowseVikramDate,
  stepBrowseVikramMonth,
} from "@/lib/patro-date-options";

const routeApi = getRouteApi("/panchanga-shell/gochar");

export function Gochar() {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const dayBrowse = usePatroDayUrlBrowse(search, navigate, location, setLocation);
  const { dayState, date, setDate, setDisplayEra, syncPickerFromDateAd, syncResolvedPatroDay } =
    dayBrowse;
  const patroEra = dayState.display.era;
  const displayLanguage = dayState.display.language;
  const todayAd = todayAdStringInTimezone(
    new Date(),
    resolveTimeZone(undefined, location.params.timezone),
  );

  const [selectedPlanet, setSelectedPlanet] = useState<GrahaKey>("sun");

  const dayQ = useResolvedPatroDayQuery(dayState, location.params, {
    syncPickerFromDateAd,
    syncResolvedPatroDay,
  });

  const jdUt = dayQ.data?.jd_ut;
  const refDateAd = dayQ.data?.date_ad ?? todayAd;

  const gocharQ = useQuery({
    queryKey: gocharKeys.day(jdUt ?? 0, location.params),
    queryFn: () => fetchGocharJd(jdUt!, location.params),
    enabled: jdUt != null,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const isGregorianBrowse = isGregorianEraBrowse(patroEra);
  const vikramParts = dayQ.data?.date_parts?.vikram;
  const gregorianParts = dayQ.data?.date_parts?.gregorian;

  const ingressBrowseMonth = useMemo((): { year: number; month: number } | null => {
    if (isGregorianBrowse && gregorianParts?.year && gregorianParts.month) {
      return { year: gregorianParts.year, month: gregorianParts.month };
    }
    if (vikramParts?.year && vikramParts.month) {
      return { year: vikramParts.year, month: vikramParts.month };
    }
    if (
      dayState.kind === "input" &&
      (dayState.inputEra === "bs" || dayState.inputEra === "bbs" || dayState.inputEra === "ad")
    ) {
      return { year: dayState.year, month: dayState.month };
    }
    return null;
  }, [isGregorianBrowse, gregorianParts, vikramParts, dayState]);

  const ingressFetchEra = ingressGocharFetchEra(patroEra);

  const monthCalQ = useQuery({
    queryKey: [
      "panchanga",
      "month",
      patroEra,
      ingressBrowseMonth?.year ?? 0,
      ingressBrowseMonth?.month ?? 0,
      location.params,
      "gochar-ingress",
    ] as const,
    queryFn: () =>
      fetchMonthCalendar(ingressBrowseMonth!.year, ingressBrowseMonth!.month, location.params, {
        era: patroEra,
        full: true,
      }),
    enabled: ingressBrowseMonth != null,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const ingressMonthDays = useMemo(
    () => monthCalQ.data?.calendar ?? [],
    [monthCalQ.data?.calendar],
  );

  const ingressRange = useMemo(() => {
    if (!ingressBrowseMonth) return null;
    return ingressFetchRangeForBrowseMonth(
      patroEra,
      ingressBrowseMonth.year,
      ingressBrowseMonth.month,
      ingressMonthDays,
    );
  }, [ingressBrowseMonth, patroEra, ingressMonthDays]);

  const ingressQ = useQuery({
    queryKey: gocharKeys.ingressEra(
      ingressRange?.from ?? "",
      ingressRange?.to ?? "",
      "patro",
      ingressFetchEra,
      location.params,
    ),
    queryFn: () =>
      fetchGocharIngress(ingressRange!.from, ingressRange!.to, location.params, {
        level: "patro",
        era: ingressFetchEra,
      }),
    enabled: Boolean(ingressRange?.from && ingressRange?.to),
    staleTime: 1000 * 60 * 30,
  });

  const ingressRows = useMemo(() => {
    if (!ingressBrowseMonth || ingressMonthDays.length === 0) return [];
    return buildGocharIngressMonthList(
      ingressQ.data?.events ?? [],
      patroEra,
      ingressBrowseMonth.year,
      ingressBrowseMonth.month,
      ingressMonthDays,
      refDateAd,
      lang === "en" ? "en" : "ne",
      digits,
    );
  }, [
    ingressQ.data?.events,
    ingressBrowseMonth,
    ingressMonthDays,
    patroEra,
    refDateAd,
    lang,
    digits,
  ]);

  const ingressLoading =
    ingressQ.isLoading || (ingressBrowseMonth != null && monthCalQ.isLoading && !monthCalQ.data);

  const dateLabel = useMemo(() => {
    const isEn = lang === "en";
    const v = dayQ.data?.date_parts?.vikram;
    if (!isEn && v?.year != null && v.month != null && v.day != null) {
      const bsIso = `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
      const bs = formatBsIsoDateNepali(bsIso, { lang, includeYear: true });
      if (bs) return bs;
    }
    if (!isEn && dayQ.data?.date_bs) {
      const bs = formatBsIsoDateNepali(dayQ.data.date_bs, { lang, includeYear: true });
      if (bs) return bs;
    }
    if (!isEn && gocharQ.data?.date_bs) {
      const bs = formatBsIsoDateNepali(gocharQ.data.date_bs, { lang, includeYear: true });
      if (bs) return bs;
    }
    const g = dayQ.data?.date_parts?.gregorian;
    if (g?.year && g.month && g.day) {
      return formatPatroCivilDayLabel(
        `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`,
        lang,
        digits,
      );
    }
    if (refDateAd) return formatPatroCivilDayLabel(refDateAd, lang, digits);
    return "—";
  }, [dayQ.data, gocharQ.data, refDateAd, lang, digits]);

  useRouteLoading((dayQ.isLoading && !dayQ.data) || (gocharQ.isLoading && !gocharQ.data));

  const gochar = gocharQ.data?.gochar;

  const ingressBrowseMonthLabel = useMemo(() => {
    if (isGregorianBrowse && gregorianParts?.year && gregorianParts.month) {
      return `${adMonthLabel(gregorianParts.month, lang)} ${digits(gregorianParts.year)}`;
    }
    if (vikramParts?.year && vikramParts.month) {
      return `${bsMonthLabel(vikramParts.month, lang)} ${digits(vikramParts.year)}`;
    }
    if (
      dayState.kind === "input" &&
      (dayState.inputEra === "bs" || dayState.inputEra === "bbs" || dayState.inputEra === "ad")
    ) {
      if (dayState.inputEra === "ad") {
        return `${adMonthLabel(dayState.month, lang)} ${digits(dayState.year)}`;
      }
      return `${bsMonthLabel(dayState.month, lang)} ${digits(dayState.year)}`;
    }
    return "";
  }, [isGregorianBrowse, gregorianParts, vikramParts, dayState, lang, digits]);

  const stepIngressBrowseMonth = useCallback(
    (delta: number) => {
      if (isGregorianBrowse) {
        const g = gregorianParts;
        if (!g?.year || !g.month || !g.day) return;
        let m = g.month + delta;
        let y = g.year;
        while (m < 1) {
          m += 12;
          y -= 1;
        }
        while (m > 12) {
          m -= 12;
          y += 1;
        }
        pickAdDate(setDate, y, m, g.day);
        return;
      }
      let browseYear = vikramParts?.year;
      let browseMonth = vikramParts?.month;
      let browseDay = vikramParts?.day;
      if (
        (browseYear == null || browseMonth == null || browseDay == null) &&
        dayState.kind === "input" &&
        (dayState.inputEra === "bs" || dayState.inputEra === "bbs")
      ) {
        browseYear = dayState.year;
        browseMonth = dayState.month;
        browseDay = dayState.day;
      }
      if (browseYear == null || browseMonth == null || browseDay == null) return;
      const next = stepBrowseVikramMonth(patroEra, browseYear, browseMonth, delta);
      pickBrowseVikramDate(
        setDate,
        patroEra,
        next.year,
        next.month,
        browseDay,
        location.params,
      );
    },
    [
      isGregorianBrowse,
      gregorianParts,
      vikramParts,
      dayState,
      patroEra,
      setDate,
      location.params,
    ],
  );

  return (
    <PageShell>
      <PageHeader
        icon={<Orbit className="size-7 text-secondary" strokeWidth={1.75} />}
        title={t("gochar.page_title")}
        subtitle={t("gochar.page_subtitle")}
      />

      <PatroDayTimeNav
          era={patroEra}
          displayLanguage={displayLanguage}
          date={date}
          vikram={dayQ.data?.date_parts?.vikram}
          civilDateAd={dayQ.data?.date_ad}
          gregorian={dayQ.data?.date_parts?.gregorian}
          onDateChange={setDate}
          onEraChange={setDisplayEra}
          todayAd={todayAd}
          location={location}
          onLocationChange={setLocation}
        />

      {gochar ? (
        <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
          <GocharSkySection
            gochar={gochar}
            dateLabel={dateLabel}
            onSelectPlanet={setSelectedPlanet}
          />

          <div className="grid min-w-0 max-w-full gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <GocharIngressSection
              rows={ingressRows}
              refDateAd={refDateAd}
              loading={ingressLoading}
              browseMonthLabel={ingressBrowseMonthLabel}
              onPrevMonth={() => stepIngressBrowseMonth(-1)}
              onNextMonth={() => stepIngressBrowseMonth(1)}
            />
            <GocharPlanetDeepDive
              gochar={gochar}
              selected={selectedPlanet}
              onSelect={setSelectedPlanet}
            />
          </div>
        </div>
      ) : dayQ.isError || gocharQ.isError ? (
        <p className="text-sm text-destructive">{t("gochar.load_error")}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      <p className="text-sm text-muted-foreground">
        {bilingualText(
          lang,
          "स्थितिहरू स्थानीय सूर्योदय (उदय) मा गणना गरिएका छन् — लाहिरी निरयन।",
          "Positions are computed at local sunrise (udaya) — Lahiri sidereal.",
        )}
      </p>
    </PageShell>
  );
}

export default Gochar;
