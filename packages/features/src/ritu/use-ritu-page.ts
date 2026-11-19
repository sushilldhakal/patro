/**
 * Ritu logic, shared by both apps: the seasons page (`RituSeasons` in each app)
 * and the current-season chip (`useCurrentRitu`, home and navigation).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTropicalSeasons, seasonsKeys, type LocationParams } from "@vedic-patro/api-client";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { RITU_MARKER_KEYS, RITU_SEASON_EMOJI, RITU_SEASON_KEYS, displayRituSlot, rituSeasonKeyAtSlot } from "@vedic-patro/domain/calendar/ritu-display";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { useCalculationSystem, useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
import { civilDayOf, daysBetween, fmtAdDayMonth, seasonItems, type CivilDay } from "./model";

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

/** One season or ayana card: the real-sky start, with its Vedic crossover beside it. */
export type RituCard = {
  key: string;
  current: boolean;
  /** "Now" for the current one, else "in 12 days" / "tomorrow" (empty once past). */
  kicker: string;
  /** Seasons only. */
  emoji?: string;
  name: string;
  day: string;
  month: string;
  /** "Vernal equinox · Sun 0°". */
  meta: string;
  /** "Mar 20 from". */
  from: string;
  progress?: { pct: number; label: string; pctLabel: string };
  /** The sidereal Sun at the same degree: "Mangsir 1 · Nov 16", and how far it sits from the real start. */
  vedic?: { label: string; date: string; shift: string };
};

export type RituPage = {
  copy: {
    title: string;
    subtitle: string;
    whyLink: string;
    southern: string;
    southNote: string;
    startsLabel: string;
    vedicNote: string;
    ayanaTitle: string;
  };
  south: boolean;
  status: PageStatus;
  cards: RituCard[];
  ayanas: RituCard[];
};

/** The solstice name for an ayana's turning degree. */
const SOLSTICE_MARKER: Record<number, string> = { 90: "ritu.june_solstice", 270: "ritu.december_solstice" };

export function useRituPage(location?: LocationParams): RituPage {
  const { t, lang, digits } = useLocale();
  // The Vedic crossings follow the siddhanta; the seasons key reads it, so re-render with it.
  useCalculationSystem();
  const tz = zoneOf(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), tz), [tz]);
  const [nowMs] = useState(() => Date.now());
  const query = useSeasons(location);
  const south = query.data?.southern_hemisphere ?? false;
  const items = useMemo(() => seasonItems(query.data?.boundaries, todayAd, tz, nowMs), [query.data, todayAd, tz, nowMs]);

  const rel = (days: number) =>
    days <= 0 ? "" : days === 1 ? t("ritu.tomorrow") : t("ritu.days_after", { count: days, days: digits(days) });
  const monthName = (month: number) => bilingualText(lang, BS_MONTHS_NE[month - 1], BS_MONTH_NAMES[month - 1]);
  const sunAt = (deg: number, markerKey?: string) => {
    const sun = t("ritu.sun_deg", { deg: digits(deg) });
    return markerKey ? `${t(markerKey)} · ${sun}` : sun;
  };
  const vedicLine = (real: CivilDay, vedic: CivilDay | undefined): RituCard["vedic"] => {
    if (!vedic) return undefined;
    const gap = daysBetween(real.ad, vedic.ad);
    return {
      label: t("ritu.vedic_label"),
      date: `${monthName(vedic.bs.month)} ${digits(vedic.bs.day)} · ${fmtAdDayMonth(vedic.ad, lang)}`,
      shift:
        gap === 0
          ? t("ritu.shift_same")
          : t(gap > 0 ? "ritu.shift_later" : "ritu.shift_earlier", { days: digits(Math.abs(gap)) }),
    };
  };
  const startFields = (start: CivilDay) => ({
    day: digits(start.bs.day),
    month: monthName(start.bs.month),
    from: `${fmtAdDayMonth(start.ad, lang)} ${t("common.from")}`,
  });

  const cards = items.map((item, i): RituCard => {
    const seasonKey = RITU_SEASON_KEYS[displayRituSlot(item.solarSlot, south)]!;
    const start = { ad: item.startAd, bs: item.startBs };
    return {
      key: `${item.solarSlot}-${item.startAd}-${i}`,
      current: item.isCurrent,
      kicker: item.isCurrent ? t("ritu.current") : rel(item.daysUntil),
      emoji: RITU_SEASON_EMOJI[seasonKey],
      name: t(`ritu.${seasonKey}`),
      ...startFields(start),
      meta: sunAt(item.angle, RITU_MARKER_KEYS[item.solarSlot]),
      vedic: vedicLine(start, item.vedic),
      progress: item.progress
        ? {
            pct: item.progress.pct,
            label: `${digits(item.progress.elapsed)} / ${digits(item.progress.total)} ${t("common.days")}`,
            pctLabel: `${digits(Math.round(item.progress.pct))}%`,
          }
        : undefined,
    };
  });

  const ayanas = (query.data?.ayanas ?? []).map((a): RituCard => {
    const start = civilDayOf(a, tz);
    return {
      key: `ayana-${a.angle}-${start.ad}`,
      current: a.is_current,
      kicker: a.is_current ? t("ritu.ayana_current") : rel(daysBetween(todayAd, start.ad)),
      name: t(a.angle === 270 ? "ritu.uttarayana" : "ritu.dakshinayana"),
      ...startFields(start),
      meta: sunAt(a.angle, SOLSTICE_MARKER[a.angle]),
      vedic: vedicLine(start, a.vedic ? civilDayOf(a.vedic, tz) : undefined),
    };
  });

  return {
    copy: {
      title: t("ritu.title"),
      subtitle: t("ritu.subtitle"),
      whyLink: t("ritu.why_link"),
      southern: t("ritu.southern"),
      southNote: t("ritu.southern_hemisphere_note"),
      startsLabel: t("ritu.starts"),
      vedicNote: t("ritu.vedic_note"),
      ayanaTitle: t("ritu.ayana_title"),
    },
    south,
    status: statusOf(query),
    cards,
    ayanas,
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
