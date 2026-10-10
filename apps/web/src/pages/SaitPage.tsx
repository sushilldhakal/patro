import { useMemo, useState } from "react";
import { getRouteApi, useParams } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarHeart, Info } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { patroCard } from "@/lib/patro-classes";
import { useRouteLoading } from "@/lib/route-loading";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { CEREMONY_META } from "@/lib/panchanga-elements";
import { isMuhurtaSaitCategory, type SaitCategoryId } from "@/lib/sait-data";
import { SAIT_RULES_CONTENT } from "@/lib/sait-rules-content";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SaitSources } from "@/components/sait/SaitSources";
import { SuitabilityLegend } from "@/components/sait/sait-suitability";
import { SUITABILITY_STYLE } from "@/lib/sait-suitability";
import {
  fetchSait,
  fetchSaitDetail,
  fetchSaitPersonalize,
  saitDetailKey,
  saitKeys,
  saitPersonalizeKey,
  type BratabandhaNakshatraMode,
  type SaitPersonalizeDay,
  type SaitSuitability,
} from "@/lib/api";
import type { Profile } from "@/lib/auth/client";
import { profileChartParams } from "@/lib/kundali/profile-chart";

const routeApi = getRouteApi("/panchanga-shell/sait/$category");

export function SaitPage() {
  const { category } = useParams({ strict: false }) as { category?: string };
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { digits, lang } = useLocale();
  const { t } = useTranslation();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const browseYear = yearBrowse.year;

  const meta = CEREMONY_META.find((c) => c.id === category);
  const isMuhurta = category ? isMuhurtaSaitCategory(category) : false;
  const content = meta ? SAIT_RULES_CONTENT[meta.id as SaitCategoryId] : undefined;
  const isBratabandha = category === "bratabandha";

  // Community rule toggles: ids the user has switched OFF. Reset when the
  // ceremony changes so one ceremony's picks don't leak into another.
  const [disabledRules, setDisabledRules] = useState<Set<string>>(() => new Set());
  const [nakshatraMode, setNakshatraMode] =
    useState<BratabandhaNakshatraMode>("classical");
  const [trackedCategory, setTrackedCategory] = useState(category);
  if (category !== trackedCategory) {
    setTrackedCategory(category);
    setDisabledRules(new Set());
    setNakshatraMode("classical");
  }

  const toggleableIds = useMemo(
    () =>
      (content?.rules ?? [])
        .map((r) => r.id)
        .filter((id): id is string => Boolean(id)),
    [content],
  );
  const hasToggles = isMuhurta && toggleableIds.length > 0;
  const enabledRuleIds = useMemo(
    () => new Set(toggleableIds.filter((id) => !disabledRules.has(id))),
    [toggleableIds, disabledRules],
  );
  const excludeRules = useMemo(() => [...disabledRules], [disabledRules]);
  const handleToggleRule = (id: string, enabled: boolean) =>
    setDisabledRules((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(id);
      else next.add(id);
      return next;
    });

  const detailQuery = useQuery({
    queryKey: saitDetailKey(
      browseYear,
      category ?? "",
      location.params,
      excludeRules,
      isBratabandha ? nakshatraMode : null,
    ),
    queryFn: () =>
      fetchSaitDetail(
        browseYear,
        category!,
        location.params,
        excludeRules,
        isBratabandha ? nakshatraMode : null,
      ),
    enabled: Boolean(category) && isMuhurta,
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const datesQuery = useQuery({
    queryKey: saitKeys.entries(browseYear, category ?? "", location.params),
    queryFn: () => fetchSait(browseYear, category!, location.params),
    enabled: Boolean(category) && !isMuhurta,
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const activeQuery = isMuhurta ? detailQuery : datesQuery;
  useRouteLoading(Boolean(meta) && activeQuery.isLoading && !activeQuery.data);

  // Total auspicious days for the summary line — for muhūrta categories it is
  // the per-day window count; for the deterministic Vās categories (rudri /
  // agni) it is the sum of the month-grouped day pills.
  const totalCount = isMuhurta
    ? (detailQuery.data?.days?.length ?? 0)
    : (datesQuery.data?.months?.reduce((sum, m) => sum + m.days.length, 0) ?? 0);

  // Native (profile-based) personalisation. The profile only supplies the birth
  // chart (janma Moon) — the viewing location stays whatever the user has chosen,
  // since they may be planning from somewhere other than their birth place.
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const birth = selectedProfile ? profileChartParams(selectedProfile) : null;
  const birthTz = selectedProfile?.timezone ?? "Asia/Kathmandu";
  const gender = selectedProfile?.gender ?? "";

  const personalizeQuery = useQuery({
    queryKey: saitPersonalizeKey(browseYear, category ?? "", location.params, birth?.moment ?? null, birthTz, gender),
    queryFn: () =>
      fetchSaitPersonalize(browseYear, category!, location.params, birth!.moment, birthTz, gender),
    enabled: Boolean(category) && Boolean(selectedProfile) && Boolean(birth),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const suitabilityByDay = useMemo(() => {
    const map = new Map<string, SaitSuitability>();
    for (const d of personalizeQuery.data?.days ?? []) {
      map.set(`${d.bs_month}-${d.bs_day}`, d.suitability);
    }
    return map;
  }, [personalizeQuery.data]);

  // Full per-day annotation (keyed the same way) so the muhūrta cards can show
  // the reason — e.g. bratabandha's Guru Śuddhi house — not just the verdict.
  const personalizeByDay = useMemo(() => {
    const map = new Map<string, SaitPersonalizeDay>();
    for (const d of personalizeQuery.data?.days ?? []) {
      map.set(`${d.bs_month}-${d.bs_day}`, d);
    }
    return map;
  }, [personalizeQuery.data]);

  const profileControl = (
    <>
      <SaitProfilePicker
        selectedId={selectedProfile?.id ?? null}
        onSelect={setSelectedProfile}
      />
      {selectedProfile && personalizeQuery.data ? (
        <SuitabilityLegend counts={personalizeQuery.data.counts} />
      ) : null}
    </>
  );

  if (!meta || !content) {
    return (
      <PageShell>
        <PageHeader
          icon={<CalendarHeart className="h-6 w-6 text-secondary" />}
          title={t("sait.unknown_ceremony")}
        />
        <PanchangaDetailsBackLink labelKey="element_page.back_to_details" variant="inline" />
      </PageShell>
    );
  }

  return (
    <SaitCeremonyLayout
      {...({
        title: t("sidebar_nav.sait_label", { category: t(`sait.categories.${meta.id}`) }),
        subtitle: t(`sait.descriptions.${meta.id}`),
        year: yearBrowse.year,
        onYearChange: yearBrowse.setYear,
        onEraChange: yearBrowse.setEra,
        era: yearBrowse.era,
        location,
        onLocationChange: setLocation,
        method: content.method,
        rules: content.rules,
        engineVersion: detailQuery.data?.engine_version,
        enabledRuleIds: hasToggles ? enabledRuleIds : undefined,
        onToggleRule: hasToggles ? handleToggleRule : undefined,
        rulesBusy: detailQuery.isFetching && !detailQuery.isLoading,
        nakshatraMode: isBratabandha ? nakshatraMode : null,
        onNakshatraModeChange: isBratabandha ? setNakshatraMode : undefined,
        days: isMuhurta ? (detailQuery.data?.days ?? []) : [],
        count: totalCount,
        profileControl,
        suitabilityByDay,
        personalizeByDay,
        loading: activeQuery.isLoading && !activeQuery.data,
        notice: content.requiresBirthDate ? (
          <div className={cn(patroCard, "flex gap-2.5 border-l-2 border-secondary p-3.5")}>
            <Info className="mt-0.5 size-4 shrink-0 text-secondary" />
            <p className="m-0 text-sm text-danger">{t("sait.requires_birth_date")}</p>
          </div>
        ) : null,
        emptyLabel: t("sait.empty_year"),
        countLabel: (count: number, y: number) =>
          t("sait.count_label", { count: digits(count), year: digits(y) }),
        footer: <SaitSources category={meta.id as SaitCategoryId} />,
      } as React.ComponentProps<typeof SaitCeremonyLayout> & {
        era: typeof yearBrowse.era;
      })}
    >
      {!isMuhurta ? (
        datesQuery.isLoading && !datesQuery.data ? (
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
            ))}
          </div>
        ) : datesQuery.data && datesQuery.data.months.length > 0 ? (
          <div className="flex flex-col gap-2">
            {datesQuery.data.months.map((m) => (
              <div
                key={m.month}
                className={cn(
                  patroCard,
                  "flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:gap-4",
                )}
              >
                <span className="w-28 shrink-0 text-sm font-bold text-foreground">
                  {lang === "en" ? `Month ${digits(m.month)}` : m.month_name_ne}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.days.map((d) => {
                    const verdict = suitabilityByDay.get(`${m.month}-${d}`);
                    const style = verdict ? SUITABILITY_STYLE[verdict] : null;
                    return (
                      <span
                        key={d}
                        title={
                          verdict
                            ? bilingualText(lang, `${selectedProfile?.full_name ?? ""}: ${style!.ne}`, `${selectedProfile?.full_name ?? ""}: ${style!.en}`)
                            : undefined
                        }
                        className={cn(
                          "font-num inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums",
                          style
                            ? cn(style.pill, style.ring)
                            : "bg-success/12 text-success-foreground dark:text-success",
                        )}
                      >
                        {digits(d)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface-inset px-6 py-12 text-center">
            <p className="m-0 text-sm text-muted-foreground">
              {t("sait.no_dates_year")}
            </p>
          </div>
        )
      ) : null}
    </SaitCeremonyLayout>
  );
}

export default SaitPage;
