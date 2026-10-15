/**
 * Ritu logic, shared by both apps: the seasons page (`RituSeasons` in each app)
 * and the current-season chip (`useCurrentRitu`, home and navigation).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTropicalSeasons, seasonsKeys, type LocationParams } from "@vedic-patro/api-client";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { RITU_MARKER_KEYS, RITU_SEASON_EMOJI, RITU_SEASON_KEYS, displayRituSlot, rituSeasonKeyAtSlot } from "@vedic-patro/domain/ritu-display";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
import { fmtAdDayMonth, seasonItems } from "./model";

export * from "./model";

/** The place's time zone, Kathmandu when it has none (both apps' rule). */
const zoneOf = (location?: LocationParams) => location?.timezone ?? "Asia/Kathmandu";

function useSeasons(location?: LocationParams) {
  return useQuery({
    queryKey: seasonsKeys.tropical(location),
    queryFn: () => fetchTropicalSeasons(location),
    staleTime: 1000 * 60 * 60,
  });
}

export type RituCard = {
  key: string;
  current: boolean;
  /** "Now" for the current season, else "in 12 days" / "tomorrow" (empty once past). */
  kicker: string;
  emoji: string;
  name: string;
  day: string;
  month: string;
  /** "Vernal equinox · Sun 0°". */
  meta: string;
  /** "Mar 20 from". */
  from: string;
  progress?: { pct: number; label: string; pctLabel: string };
};

export type RituPage = {
  copy: { title: string; subtitle: string; whyLink: string; southern: string; southNote: string };
  south: boolean;
  status: PageStatus;
  cards: RituCard[];
};

export function useRituPage(location?: LocationParams): RituPage {
  const { t, lang, digits } = useLocale();
  const tz = zoneOf(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), tz), [tz]);
  const [nowMs] = useState(() => Date.now());
  const query = useSeasons(location);
  const south = query.data?.southern_hemisphere ?? false;
  const items = useMemo(() => seasonItems(query.data?.boundaries, todayAd, tz, nowMs), [query.data, todayAd, tz, nowMs]);

  const rel = (days: number) =>
    days <= 0 ? "" : days === 1 ? t("ritu.tomorrow") : t("ritu.days_after", { count: days, days: digits(days) });

  return {
    copy: {
      title: t("ritu.title"),
      subtitle: t("ritu.subtitle"),
      whyLink: t("ritu.why_link"),
      southern: t("ritu.southern"),
      southNote: t("ritu.southern_hemisphere_note"),
    },
    south,
    status: statusOf(query),
    cards: items.map((item, i) => {
      const seasonKey = RITU_SEASON_KEYS[displayRituSlot(item.solarSlot, south)]!;
      const markerKey = RITU_MARKER_KEYS[item.solarSlot];
      const sun = t("ritu.sun_deg", { deg: digits(item.angle) });
      return {
        key: `${item.solarSlot}-${item.startAd}-${i}`,
        current: item.isCurrent,
        kicker: item.isCurrent ? t("ritu.current") : rel(item.daysUntil),
        emoji: RITU_SEASON_EMOJI[seasonKey],
        name: t(`ritu.${seasonKey}`),
        day: digits(item.startBs.day),
        month: bilingualText(lang, BS_MONTHS_NE[item.startBs.month - 1], BS_MONTH_NAMES[item.startBs.month - 1]),
        meta: markerKey ? `${t(markerKey)} · ${sun}` : sun,
        from: `${fmtAdDayMonth(item.startAd, lang)} ${t("common.from")}`,
        progress: item.progress
          ? {
              pct: item.progress.pct,
              label: `${digits(item.progress.elapsed)} / ${digits(item.progress.total)} ${t("common.days")}`,
              pctLabel: `${digits(Math.round(item.progress.pct))}%`,
            }
          : undefined,
      };
    }),
  };
}

/** The season right now at a place (home quick links, navigation). */
export function useCurrentRitu(location?: LocationParams) {
  const query = useSeasons(location);
  const south = query.data?.southern_hemisphere ?? false;
  const current = useMemo(() => {
    const boundary = query.data?.boundaries?.find((b) => b.is_current);
    if (!boundary) return null;
    const seasonKey = rituSeasonKeyAtSlot(boundary.slot, south);
    return { seasonKey, emoji: RITU_SEASON_EMOJI[seasonKey], solarSlot: boundary.slot, angle: boundary.angle };
  }, [query.data, south]);
  return { current, south, loading: query.isLoading, timezone: zoneOf(location) };
}
