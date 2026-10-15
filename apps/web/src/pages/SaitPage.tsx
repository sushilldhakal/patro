import { getRouteApi, useParams } from "@tanstack/react-router";
import { CalendarHeart, Info } from "lucide-react";
import { useSaitPage } from "@vedic-patro/features/sait";
import { SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { cn } from "@vedic-patro/domain/utils";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroCard } from "@/lib/patro-classes";
import { useRouteLoading } from "@/lib/route-loading";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SaitSources } from "@/components/sait/SaitSources";
import { SuitabilityLegend } from "@/components/sait/sait-suitability";

const routeApi = getRouteApi("/panchanga-shell/sait/$category");

/** A sait ceremony — the website's drawing of `useSaitPage` (@vedic-patro/features). */
export function SaitPage() {
  const { category } = useParams({ strict: false }) as { category?: string };
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { lang } = useLocale();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const page = useSaitPage(category, yearBrowse.year, location.params);
  const { personalize } = page;
  useRouteLoading(page.known && page.loading);

  if (!page.known || !page.content || !page.id) {
    return (
      <PageShell>
        <PageHeader icon={<CalendarHeart className="h-6 w-6 text-secondary" />} title={page.copy.unknown} />
        <PanchangaDetailsBackLink labelKey="element_page.back_to_details" variant="inline" />
      </PageShell>
    );
  }

  return (
    <SaitCeremonyLayout
      {...({
        title: page.copy.title,
        subtitle: page.copy.subtitle,
        year: yearBrowse.year,
        onYearChange: yearBrowse.setYear,
        onEraChange: yearBrowse.setEra,
        era: yearBrowse.era,
        location,
        onLocationChange: setLocation,
        method: page.content.method,
        rules: page.content.rules,
        engineVersion: page.engineVersion,
        enabledRuleIds: page.enabledRuleIds,
        onToggleRule: page.toggleRule,
        rulesBusy: page.rulesBusy,
        nakshatraMode: page.nakshatraMode,
        onNakshatraModeChange: page.setNakshatraMode,
        days: page.days,
        count: page.count,
        profileControl: (
          <>
            <SaitProfilePicker selectedId={personalize.selectedProfile?.id ?? null} onSelect={personalize.setSelectedProfile} />
            {personalize.selectedProfile && personalize.data ? <SuitabilityLegend counts={personalize.data.counts} /> : null}
          </>
        ),
        suitabilityByDay: personalize.suitabilityByDay,
        personalizeByDay: personalize.personalizeByDay,
        loading: page.loading,
        notice: page.copy.requiresBirthDate ? (
          <div className={cn(patroCard, saitClasses.notice)}>
            <Info className="mt-0.5 size-4 shrink-0 text-secondary" />
            <p className={cn("m-0", saitClasses.noticeText)}>{page.copy.requiresBirthDate}</p>
          </div>
        ) : null,
        emptyLabel: page.copy.empty,
        countLabel: page.countLabel,
        footer: <SaitSources category={page.id} />,
      } as React.ComponentProps<typeof SaitCeremonyLayout> & { era: typeof yearBrowse.era })}
    >
      {!page.isMuhurta ? (
        page.loading ? (
          <div className={cn("grid", saitClasses.dateSkeletonList)}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={cn("animate-pulse", saitClasses.dateSkeleton)} />
            ))}
          </div>
        ) : page.months.length > 0 ? (
          <div className={saitClasses.dateList}>
            {page.months.map((m) => (
              <div key={m.key} className={cn(patroCard, saitClasses.dateRow)}>
                <span className={saitClasses.dateRowMonth}>{m.label}</span>
                <div className={saitClasses.dateRowDays}>
                  {m.days.map((d) => {
                    const style = d.verdict ? SUITABILITY_STYLE[d.verdict] : null;
                    const name = personalize.selectedProfile?.full_name ?? "";
                    return (
                      <span
                        key={d.day}
                        title={style ? bilingualText(lang, `${name}: ${style.ne}`, `${name}: ${style.en}`) : undefined}
                        className={cn(
                          saitClasses.dateChip,
                          "inline-flex",
                          saitClasses.dateChipText,
                          d.verdict
                            ? cn(saitClasses.suitability[d.verdict].box, saitClasses.suitability[d.verdict].text, style?.ring)
                            : cn(saitClasses.toneChip.good, saitClasses.toneChipText.good),
                        )}
                      >
                        {d.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={cn(saitClasses.noDates, "text-center")}>
            <p className={cn("m-0", saitClasses.noDatesText)}>{page.copy.noDates}</p>
          </div>
        )
      ) : null}
    </SaitCeremonyLayout>
  );
}

export default SaitPage;
