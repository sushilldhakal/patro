/**
 * Rashifal page logic, shared by the website (`apps/web/src/pages/Rashifal.tsx`)
 * and the app (`apps/mobile/app/(tabs)/rashifal.tsx`).
 *
 * The apps address a day differently (the website by era-aware day state, the
 * app by an AD date), so each passes the day as API query params plus a cache
 * key; the API client's `…ForDay` requests take exactly that.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RASHIFAL_PERIODS,
  fetchPersonalRashifalForDay,
  fetchRashifalForDay,
  type LocationParams,
  type Profile,
  type RashifalBlock,
  type RashifalPeriod,
  type RashifalSignBlock,
} from "@vedic-patro/api-client";
import { instantCacheKey } from "@vedic-patro/domain/instant-query";
import { profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import { formatNavataraQuality, formatNavataraTara } from "@vedic-patro/domain/navatara-bala";
import { formatRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { rashifalRangeLabel, rashifalStepDate } from "@vedic-patro/domain/rashifal-ui";
import { useLocale } from "@vedic-patro/i18n/react";

export type RashifalDay = { key: readonly unknown[]; query: URLSearchParams };

/** A profile can only be read personally when it has a birth date and place. */
function chartOf(profile: Profile | null) {
  const chart = profile ? profileChartParams(profile) : null;
  return chart && chart.location.params.lat != null && chart.location.params.lon != null ? chart : null;
}

export function useRashifalPage({
  day,
  location,
  initialPeriod = "daily",
}: {
  day: RashifalDay;
  location?: LocationParams;
  initialPeriod?: RashifalPeriod;
}) {
  const { t, lang } = useLocale();
  const [period, setPeriod] = useState<RashifalPeriod>(initialPeriod);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const chart = chartOf(profile);

  const generalQ = useQuery({
    queryKey: ["rashifal", ...day.key, location, period],
    queryFn: () => fetchRashifalForDay(day.query, period, location),
    // Skipped once a profile is selected — the personal reading is a different
    // computation, not a filtered view of these twelve.
    enabled: !profile,
    staleTime: 1000 * 60 * 30,
  });

  const personalQ = useQuery({
    queryKey: ["rashifal-personal", profile?.id, chart ? instantCacheKey(chart.moment) : "", ...day.key, location, period],
    queryFn: () =>
      fetchPersonalRashifalForDay(
        day.query,
        period,
        {
          moment: chart!.moment,
          birthLat: chart!.location.params.lat as number,
          birthLon: chart!.location.params.lon as number,
          birthTz: chart!.location.params.timezone ?? "Asia/Kathmandu",
        },
        location,
      ),
    enabled: Boolean(profile && chart),
    staleTime: 1000 * 60 * 10,
  });

  const general: RashifalBlock | undefined = generalQ.data;
  // The range strip reads whichever payload is on screen.
  const windowSource = profile ? personalQ.data : general;
  const rangeLabel = useMemo(() => rashifalRangeLabel(windowSource, period, lang), [windowSource, period, lang]);

  // Moon at sunrise is one sunrise; over a month or a year it would read as a claim about the whole window.
  const shortWindow = period === "daily" || period === "weekly";
  const moonLabel = shortWindow && general?.moon_label ? formatRashiDisplay(general.moon_label, general.moon_label_en, lang) : undefined;

  const signs = (general?.signs ?? []).map((sign: RashifalSignBlock) => ({
    sign,
    // Chandrabala is a 2¼-day reading: shown on a day or a week only.
    taraLine:
      shortWindow && sign.tara && sign.quality
        ? `${formatNavataraTara(sign.tara, lang)}/${formatNavataraQuality(sign.quality, lang)}`
        : undefined,
  }));

  return {
    copy: {
      title: t("rashifal.title"),
      subtitle: t("rashifal.subtitle"),
      eyebrow: t("rashifal.eyebrow"),
      tabsLabel: t("rashifal.tabs_label"),
      methodNote: t("rashifal.method_note"),
      personalMethodNote: t("rashifal.personal.method_note"),
      error: t("rashifal.error"),
      loading: t("common.loading"),
      noData: t("common.no_data"),
      missingBirthData: t("rashifal.profile.missing_birth_data"),
      resolving: t("rashifal.profile.resolving"),
      showAll: t("rashifal.profile.show_all"),
      showingFor: profile ? t("rashifal.profile.showing_for", { name: profile.full_name }) : "",
      intro: period !== "daily" ? t(`rashifal.period_intro.${period}`) : undefined,
      moon: moonLabel ? t("rashifal.moon_at_sunrise", { sign: moonLabel }) : undefined,
    },
    periods: RASHIFAL_PERIODS.map((id) => ({ id, label: t(`rashifal.tabs.${id}`), active: id === period })),
    period,
    setPeriod,
    /** Header nav: the window's own range and whole-window steps once the period is longer than a day. */
    rangeLabel: period !== "daily" ? rangeLabel : undefined,
    stepDate: period !== "daily" ? (date: Date, dir: 1 | -1) => rashifalStepDate(windowSource, period, date, dir) : undefined,
    profile,
    profileError,
    selectProfile: (next: Profile | null) => {
      if (next && !chartOf(next)) {
        setProfileError(true);
        setProfile(null);
        return;
      }
      setProfileError(false);
      setProfile(next);
    },
    general: {
      status: generalQ.isError ? "error" : generalQ.isLoading && !general ? "loading" : general?.signs?.length ? "ready" : "empty",
      signs,
      retry: () => void generalQ.refetch(),
    } as const,
    personal: {
      status: personalQ.isError ? "error" : personalQ.data ? "ready" : "loading",
      data: personalQ.data,
      retry: () => void personalQ.refetch(),
    } as const,
  };
}
