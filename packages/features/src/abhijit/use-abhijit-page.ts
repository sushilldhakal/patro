/**
 * Abhijit muhurta page logic, shared by the website (`apps/web/src/pages/AbhijitMuhurta.tsx`)
 * and the app (`apps/mobile/app/(tabs)/abhijit-muhurta.tsx`).
 *
 * Each app passes its month fetcher (both normalise the month payload; the
 * app's also answers offline). The era always goes to it.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LocationParams, MonthCalendar } from "@vedic-patro/api-client";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { bilingualText } from "@vedic-patro/domain/locale";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";
import { clockMinutes, clockWindow, spanText, useNowMs, type NowHeroView } from "../common/now-hero";
import { abhijitClock, abhijitDays, type AbhijitDayView } from "./model";

export * from "./model";

export type MonthScope = { era: Era; year: number; month: number; location?: LocationParams };

export type AbhijitPage = {
  copy: {
    title: string;
    subtitle: string;
    backHome: string;
    todayHero: string;
    todayBadge: string;
    noon: string;
    note: string;
    error: string;
    none: string;
    /** "Abhijit muhurta this month — Baisakh 2083". */
    heading: string;
    /** "30 days", once loaded. */
    count?: string;
    /** "Sunrise … · sunset …" for today's hero. */
    sunContext?: string;
  };
  /** Today's date (AD) in the location's time zone — for the "today" button. */
  todayAd: string;
  status: PageStatus;
  days: AbhijitDayView[];
  today?: AbhijitDayView;
  /** Today's window: on now (how far), still to come, or over — and tomorrow's. */
  hero?: NowHeroView;
  /** The raw month (the app reads its browse limits from it). */
  data?: MonthCalendar;
};

export function useAbhijitPage(
  scope: MonthScope,
  fetchMonth: (year: number, month: number, location: LocationParams | undefined, options: { era: Era; full?: boolean }) => Promise<MonthCalendar>,
): AbhijitPage {
  const { t, lang, digits } = useLocale();
  // Kathmandu when the place has no zone, as the website always did.
  const timeZone = scope.location?.timezone ?? "Asia/Kathmandu";
  const nowMs = useNowMs();
  const todayAd = todayAdStringInTimezone(new Date(nowMs), timeZone);
  const query = useQuery({
    queryKey: ["panchanga", "month", scope.era, lang, scope.year, scope.month, scope.location, "lite"] as const,
    queryFn: () => fetchMonth(scope.year, scope.month, scope.location, { era: scope.era, full: false }),
    staleTime: 1000 * 60 * 60,
  });
  const calendar = query.data?.calendar;
  const days = useMemo(() => abhijitDays(calendar ?? [], todayAd, lang), [calendar, todayAd, lang]);
  const today = days.find((d) => d.isToday);
  const monthName = bilingualText(
    lang,
    query.data?.month_name_ne ?? query.data?.month_name ?? "",
    query.data?.month_name ?? query.data?.month_name_ne ?? "",
    "",
  );
  let hero: NowHeroView | undefined;
  const todayRaw = calendar?.find((d) => d.date_ad === todayAd);
  if (today && todayRaw) {
    const w = abhijitClock(todayRaw);
    const win = clockWindow(w?.start, w?.end, clockMinutes(nowMs, timeZone));
    const at = days.indexOf(today);
    const tomorrow = days[at + 1];
    const ms = (win?.minutes ?? 0) * 60_000;
    hero = {
      eyebrow: t(win?.state === "on" ? "now_hero.abhijit_now" : "now_hero.abhijit_today"),
      live: win?.state === "on",
      tone: win?.state === "over" ? "plain" : "good",
      title: today.range,
      subtitle: `${today.weekday} · ${today.day}`,
      progress: win?.state === "on" ? win.progress : undefined,
      foot: {
        left: t("now_hero.noon", { time: today.noon }),
        right:
          win?.state === "on"
            ? t("now_hero.left", { time: spanText(ms, t, digits) })
            : win?.state === "before"
              ? t("now_hero.starts_in", { time: spanText(ms, t, digits) })
              : t("now_hero.over_today"),
      },
      facts: [
        { label: t("now_hero.sunrise"), value: today.sunrise },
        { label: t("now_hero.sunset"), value: today.sunset },
      ],
      next: tomorrow ? { label: t("now_hero.tomorrow"), title: tomorrow.range, detail: `${tomorrow.weekday} · ${tomorrow.day}` } : undefined,
    };
  }
  return {
    hero,
    copy: {
      title: t("abhijit.title"),
      subtitle: t("abhijit.subtitle"),
      backHome: t("abhijit.back_home"),
      todayHero: t("abhijit.today_hero"),
      todayBadge: t("abhijit.jump_today"),
      noon: t("abhijit.col_noon"),
      note: t("abhijit.note"),
      error: t("abhijit.error"),
      none: t("abhijit.none"),
      heading: `${t("abhijit.month_heading")} — ${monthName} ${digits(scope.year)}`,
      count: days.length ? t("abhijit.days_count", { count: digits(days.length) }) : undefined,
      sunContext: today ? t("abhijit.sun_context", { sunrise: today.sunrise, sunset: today.sunset }) : undefined,
    },
    todayAd,
    status: statusOf(query),
    days,
    today,
    data: query.data,
  };
}
