import { useMemo } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Sparkles, Users } from "lucide-react";
import { useRashifalPage } from "@vedic-patro/features/rashifal";
import { Button } from "@/components/ui/button";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroDayTimeNav } from "@/components/patro-date";
import { DataUnavailablePanel } from "@/components/common/DataUnavailablePanel";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { RashifalPersonalCard } from "@/components/rashifal/RashifalPersonalCard";
import { RashifalProfilePicker } from "@/components/rashifal/RashifalProfilePicker";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { usePatroDayUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useResolvedPatroDayQuery } from "@/hooks/use-resolved-patro-day-query";
import { useRouteLoading } from "@/lib/route-loading";
import { cn } from "@vedic-patro/domain/utils";
import { patroAsideTab } from "@/lib/patro-classes";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { RASHIFAL_PERIOD_ICON } from "@/lib/rashifal-ui";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { searchToLocation } from "@/lib/url-state";
import { panchangaKeys } from "@/lib/api";
import { buildPatroDayApiQuery } from "@/lib/patro-day-url";

const routeApi = getRouteApi("/panchanga-shell/jyotish/rashifal");

/** Rashifal — the website's drawing of `useRashifalPage` (@vedic-patro/features). */
export function Rashifal() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const dayBrowse = usePatroDayUrlBrowse(search, navigate, location, setLocation);
  const { dayState, date, setDate, setDisplayEra, syncPickerFromDateAd, syncResolvedPatroDay } = dayBrowse;
  const todayAd = todayAdStringInTimezone(new Date(), resolveTimeZone(undefined, location.params.timezone));

  // The day query drives the date navigator's BS/AD labels; the rashifal itself comes from /panchanga/rashifal.
  const dayQ = useResolvedPatroDayQuery(dayState, location.params, { syncPickerFromDateAd, syncResolvedPatroDay });
  const day = useMemo(
    () => ({ key: panchangaKeys.daySelection(dayState, location.params), query: buildPatroDayApiQuery(dayState) }),
    [dayState, location.params],
  );
  const page = useRashifalPage({ day, location: location.params });
  useRouteLoading(page.general.status === "loading" && !page.profile);

  return (
    <PageShell className="pb-16">
      <PageHeader icon={<Sparkles className="size-7 text-secondary" />} title={page.copy.title} subtitle={page.copy.subtitle} />

      <p className={rashifalClasses.eyebrow}>{page.copy.eyebrow}</p>

      <div className={rashifalClasses.navWrap}>
        <PatroDayTimeNav
          era={dayState.display.era}
          date={date}
          vikram={dayQ.data?.date_parts?.vikram}
          civilDateAd={dayQ.data?.date_ad}
          gregorian={dayQ.data?.date_parts?.gregorian}
          onDateChange={setDate}
          onEraChange={setDisplayEra}
          todayAd={todayAd}
          location={location}
          onLocationChange={setLocation}
          subtitleOverride={page.rangeLabel}
          stepOverride={
            page.stepDate
              ? { onPrev: () => setDate(page.stepDate!(date, -1)), onNext: () => setDate(page.stepDate!(date, 1)) }
              : undefined
          }
        />
      </div>

      {/* Active tab carries its label; the rest stay icon-only. */}
      <div className={rashifalClasses.tabBar} role="tablist" aria-label={page.copy.tabsLabel}>
        {page.periods.map(({ id, label, active }) => {
          const Icon = RASHIFAL_PERIOD_ICON[id];
          return (
            <Button
              key={id}
              type="button"
              role="tab"
              variant="ghost"
              size="sm"
              className={cn(patroAsideTab(active), "h-auto", rashifalClasses.tab, active ? rashifalClasses.tabGapActive : rashifalClasses.tabGapIdle)}
              aria-selected={active}
              aria-label={label}
              title={label}
              onClick={() => page.setPeriod(id)}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {active ? <span className="whitespace-nowrap">{label}</span> : null}
            </Button>
          );
        })}
      </div>

      <div className={rashifalClasses.profileWrap}>
        <RashifalProfilePicker selectedId={page.profile?.id ?? null} onSelect={page.selectProfile} />
        {page.profileError ? <p className={rashifalClasses.profileError}>{page.copy.missingBirthData}</p> : null}
      </div>

      {page.profile ? (
        <div className={rashifalClasses.panel} role="tabpanel">
          <div className={rashifalClasses.selectedBar}>
            <Users className="size-4" aria-hidden="true" />
            <span>{page.copy.showingFor}</span>
            <button type="button" className={cn(rashifalClasses.selectedLink, "hover:no-underline")} onClick={() => page.selectProfile(null)}>
              {page.copy.showAll}
            </button>
          </div>
          <p className={rashifalClasses.methodNote}>{page.copy.personalMethodNote}</p>
          {page.personal.status === "error" ? (
            <DataUnavailablePanel message={page.copy.error} className="mt-2" />
          ) : page.personal.status === "loading" ? (
            <div className={cn("mt-2", rashifalClasses.statusBox)}>{page.copy.resolving}</div>
          ) : (
            <div className={rashifalClasses.personalWrap}>
              <RashifalPersonalCard name={page.profile.full_name} personal={page.personal.data!} />
            </div>
          )}
        </div>
      ) : page.general.status === "error" ? (
        <DataUnavailablePanel message={page.copy.error} className="mt-6" />
      ) : page.general.status === "loading" ? (
        <div className={cn("mt-6", rashifalClasses.statusBox)}>{page.copy.loading}</div>
      ) : page.general.status === "empty" ? (
        <DataUnavailablePanel message={page.copy.noData} className="mt-6" />
      ) : (
        <div className={rashifalClasses.panel} role="tabpanel">
          {page.copy.intro ? <p className={rashifalClasses.intro}>{page.copy.intro}</p> : null}
          {page.copy.moon ? <p className={rashifalClasses.intro}>{page.copy.moon}</p> : null}
          <p className={rashifalClasses.methodNote}>{page.copy.methodNote}</p>
          <div className={rashifalClasses.signGrid}>
            {page.general.signs.map(({ sign, taraLine }) => (
              <RashifalSignCard key={sign.id} sign={sign} period={page.period} taraLine={taraLine} tone={sign.tone} />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
