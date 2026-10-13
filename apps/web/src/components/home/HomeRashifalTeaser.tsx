import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/AuthContext";
import { useProfilesQuery } from "@/lib/kundali/profiles-query";
import { profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useLocale } from "@/i18n/locale";
import { patroRouteLinkSearch } from "@/lib/url-state";
import { toNepaliDigits } from "@/lib/rashifal-ui";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { PatroDayFetchState } from "@/lib/patro-day-url";
import {
  fetchPersonalRashifal,
  fetchRashifal,
  panchangaKeys,
  type RashifalSignBlock,
} from "@/lib/api";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { RashifalPersonalCard } from "@/components/rashifal/RashifalPersonalCard";
import { HomeRashifalSignPicker } from "@/components/home/HomeRashifalSignPicker";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { cn } from "@vedic-patro/domain/utils";

/**
 * Monthly rashifal on Home — same API and card components as /jyotish/rashifal
 * (monthly tab). Mobile: one card (personal default profile, or Sun-sign month).
 * Desktop (guests): 1/3 rashi grid + 2/3 selected sign card.
 */
export function HomeRashifalTeaser({
  location,
  dayState,
}: {
  location: PanchangaLocation;
  dayState: PatroDayFetchState;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const { isAuthenticated } = useAuth();
  const era = useCalendarEra();

  const { data: profiles } = useProfilesQuery(isAuthenticated);
  const defaultProfile = profiles?.find((p) => p.is_default) ?? null;
  const profileChart = defaultProfile ? profileChartParams(defaultProfile) : null;
  const hasUsableProfile = Boolean(
    defaultProfile &&
      profileChart &&
      profileChart.location.params.lat != null &&
      profileChart.location.params.lon != null,
  );

  const personalQ = useQuery({
    queryKey: [
      "home-rashifal-personal",
      defaultProfile?.id,
      profileChart?.moment,
      ...panchangaKeys.daySelection(dayState, location.params),
      "monthly",
    ],
    queryFn: () =>
      fetchPersonalRashifal(
        dayState,
        "monthly",
        {
          moment: profileChart!.moment,
          birthLat: profileChart!.location.params.lat as number,
          birthLon: profileChart!.location.params.lon as number,
          birthTz: profileChart!.location.params.timezone ?? "Asia/Kathmandu",
        },
        location.params,
      ),
    enabled: hasUsableProfile,
    staleTime: 1000 * 60 * 10,
  });

  const generalQ = useQuery({
    queryKey: [...panchangaKeys.daySelection(dayState, location.params), "rashifal", "monthly", "home"],
    queryFn: () => fetchRashifal(dayState, "monthly", location.params),
    enabled: !hasUsableProfile,
    staleTime: 1000 * 60 * 30,
  });

  const monthLabel = hasUsableProfile
    ? lang === "ne"
      ? `${personalQ.data?.bs_month_name_ne ?? ""} ${personalQ.data?.bs_year != null ? toNepaliDigits(personalQ.data.bs_year, lang) : ""}`.trim()
      : `${personalQ.data?.bs_month_name_en ?? ""} ${personalQ.data?.bs_year ?? ""}`.trim()
    : lang === "ne"
      ? `${generalQ.data?.bs_month_name_ne ?? ""} ${generalQ.data?.bs_year != null ? toNepaliDigits(generalQ.data.bs_year, lang) : ""}`.trim()
      : `${generalQ.data?.bs_month_name_en ?? ""} ${generalQ.data?.bs_year ?? ""}`.trim();

  const sunSign: RashifalSignBlock | undefined =
    generalQ.data?.signs?.length && generalQ.data.frame?.sun_sign
      ? (generalQ.data.signs.find((s) => s.id === generalQ.data!.frame!.sun_sign) ??
        generalQ.data.signs[0])
      : undefined;

  const linkSearch = patroRouteLinkSearch("/jyotish/rashifal", location, era);

  const loading = hasUsableProfile ? personalQ.isLoading : generalQ.isLoading;
  const hasContent = hasUsableProfile ? Boolean(personalQ.data) : Boolean(generalQ.data?.signs?.length);

  if (!loading && !hasContent) return null;

  return (
    <section>
      <div className={cn("text-center", homeClasses.rashifalHeader)}>
        <h2 className={cn("m-0", homeClasses.rashifalTitle)}>
          {t("home_rashifal.section_title")}
        </h2>
        {monthLabel ? (
          <p className={cn("m-0", homeClasses.rashifalMonth)}>{monthLabel}</p>
        ) : null}
      </div>

      {loading ? (
        <div className="mx-auto max-w-xl animate-pulse rounded-xl border border-border bg-muted/30 px-4 py-16" />
      ) : hasUsableProfile && personalQ.data ? (
        <>
          <div className="md:hidden">
            <RashifalPersonalCard name={defaultProfile!.full_name} personal={personalQ.data} />
          </div>
          <div className="mx-auto hidden max-w-lg md:block">
            <RashifalPersonalCard name={defaultProfile!.full_name} personal={personalQ.data} />
          </div>
        </>
      ) : generalQ.data?.signs?.length ? (
        <>
          <div className="md:hidden">
            {sunSign ? (
              <RashifalSignCard sign={sunSign} period="monthly" tone={sunSign.tone} />
            ) : null}
          </div>
          <div className="hidden md:block">
            <HomeRashifalSignPicker
              signs={generalQ.data.signs}
              defaultSignId={generalQ.data.frame?.sun_sign ?? sunSign?.id}
            />
          </div>
        </>
      ) : null}

      {!loading && hasContent ? (
        <div className={homeClasses.rashifalLinks}>
          <Link
            to="/jyotish/rashifal"
            search={linkSearch}
            className={cn(homeClasses.rashifalLinkPrimary, "no-underline hover:underline")}
          >
            {hasUsableProfile ? t("home_rashifal.see_full") : t("home_rashifal.see_yours")} →
          </Link>
          <Link
            to="/jyotish/rashifal"
            search={linkSearch}
            className={cn(homeClasses.rashifalLinkSecondary, "no-underline hover:text-secondary hover:underline")}
          >
            {t("home_rashifal.see_daily")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
