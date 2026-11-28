import { useContentWidth } from "@/lib/responsive";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  fetchUpcomingFestivals,
  holidayKeys,
  type UpcomingFestival,
} from "@vedic-patro/api-client";
import { monthLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { adToBS } from "@vedic-patro/domain/calendar/bs-calendar";
import { useThemeColors } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";
import { Text } from "@/components/ui/Text";
import type { LocationParams } from "@/lib/api";

import { SLIDER_TINT, TintCard } from "./TintCard";

/**
 * Upcoming festivals, as on the web's "आगामी चाडपर्व": a left-right slider,
 * three cards in a row on a phone (more on an iPad), each with the BS date, the festival name, the weekday
 * and how many days away it is (आज / भोलि / N दिनमा). Festivals that fall on
 * the same date share one card, with a +N for the rest of them. Swipe left
 * and right for more.
 *
 * It is its own section at the end of the home page, outside the aside's
 * bordered card. Tapping a card opens that day's panchanga; "सबै हेर्नुहोस्"
 * opens the holidays list. While it loads it shows grey placeholder cards;
 * on error or when there is nothing coming up it shows nothing, so it never
 * breaks the page.
 *
 * The card width is worked out from the screen width (sliderCardWidth), so
 * exactly three fit across on any phone and more on an iPad. `horizontalInset` is the padding the parent already
 * puts around this section (the page's card inset), so the cards line up
 * with the rest of the page.
 */
const gap = 8;
/** Narrowest a card gets on a tablet before one fewer fits across. */
const MIN_CARD = 170;
/** Below this the screen is a phone: always two and a half cards, whatever its size. */
const PHONE_MAX_WIDTH = 600;

/**
 * Card width for the home sliders: two and a half across on every phone (the half card shows the
 * row scrolls; a Pro Max gets wider cards, not more of them), and on a tablet as many as fit at
 * MIN_CARD, up to eight and a half.
 */
export function sliderCardWidth(windowWidth: number, horizontalInset: number): number {
  const row = windowWidth - horizontalInset * 2;
  const visible =
    windowWidth < PHONE_MAX_WIDTH ? 2.5 : Math.min(8.5, Math.max(2.5, Math.floor(row / MIN_CARD) + 0.5));
  return Math.max(96, Math.floor((row - gap * Math.floor(visible)) / visible));
}

export const SLIDER_GAP = gap;
export const SLIDER_CARD_HEIGHT = 140;
/** Forex and gold/silver cards carry a sparkline, so they stand taller. */
export const RATE_CARD_HEIGHT = 184;

export function UpcomingFestivalsSlider({
  location,
  horizontalInset = 0,
}: {
  location?: LocationParams;
  horizontalInset?: number;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const windowWidth = useContentWidth();
  const { data, isLoading } = useQuery({
    queryKey: holidayKeys.upcoming(90, 15, false, location),
    queryFn: () => fetchUpcomingFestivals(90, 15, false, location),
    staleTime: 60_000,
  });

  const cardWidth = sliderCardWidth(windowWidth, horizontalInset);

  // One card per date, in the order the server returns them (nearest first).
  // A date with several festivals shows the first one and a +N for the rest.
  const cards = useMemo(() => {
    const byDate = new Map<string, UpcomingFestival[]>();
    for (const f of data?.festivals ?? []) {
      if (!f.start_date) continue;
      const key = f.bs_start_date ?? f.start_date;
      const list = byDate.get(key);
      if (list) list.push(f);
      else byDate.set(key, [f]);
    }
    return [...byDate.values()].map((list) => ({
      first: list[0],
      extra: list.length - 1,
    }));
  }, [data]);

  if (!isLoading && cards.length === 0) return null;

  const title = t("ui.home.upcoming_festivals");
  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">{title}</Text>
        <Pressable
          onPress={() => router.push("/holidays")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: colors.secondary }}
          >
            {t("common.view_all")} ›
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + gap}
        snapToAlignment="start"
        // The cards start on the line of the cards above (the page's card inset) and scroll out to its edge.
        style={{ marginHorizontal: -horizontalInset }}
        contentContainerStyle={{ paddingHorizontal: horizontalInset, gap }}
      >
        {isLoading
          ? [0, 1, 2].map((i) => (
              <View
                key={i}
                className="rounded-3xl bg-muted"
                style={{ width: cardWidth, height: SLIDER_CARD_HEIGHT }}
              />
            ))
          : cards.map(({ first, extra }) => (
              <FestivalCard
                key={first.id}
                festival={first}
                extra={extra}
                width={cardWidth}
              />
            ))}
      </ScrollView>
    </View>
  );
}

function FestivalCard({
  festival,
  extra,
  width,
}: {
  festival: UpcomingFestival;
  extra: number;
  width: number;
}) {
  const { t, lang, digits } = useLocale();
  const router = useRouter();
  const name =
    lang === "en"
      ? (festival.name_en ?? festival.name ?? "")
      : (festival.name_ne ?? festival.name ?? "");
  // BS day + month, e.g. ८ मंसिर. Prefer the server's BS date; fall back to
  // converting the AD date when it is missing.
  const bs = bsDateOf(festival);
  const bsText = bs
    ? `${digits(bs.day)} ${monthLabel("bs", bs.month, lang)}`
    : "";
  // The weekday follows the language: मंग / बुध in Nepali, Tue / Wed in
  // English.
  const weekday = festival.start_date
    ? new Date(`${festival.start_date}T12:00:00`).toLocaleDateString(
        lang === "en" ? "en-US" : "ne-NP",
        {
          weekday: "short",
        },
      )
    : "";
  const badge =
    festival.days_until === 0
      ? t("calendar.today_btn")
      : festival.days_until === 1
        ? t("rel.tomorrow")
        : t("ui.home.in_n_days", { n: digits(festival.days_until) });
  const soon = festival.days_until <= 1;
  return (
    <TintCard
      tint={soon ? SLIDER_TINT.festivalSoon : SLIDER_TINT.festival}
      width={width}
      minHeight={SLIDER_CARD_HEIGHT}
      onPress={
        festival.start_date
          ? () =>
              router.push({
                pathname: "/day/[ad]",
                params: { ad: festival.start_date! },
              })
          : undefined
      }
    >
      <View className="flex-row">
        <View
          className={
            soon
              ? "rounded-full bg-secondary px-2 py-0.5"
              : "rounded-full bg-muted px-2 py-0.5"
          }
        >
          <Text
            className={
              soon
                ? "text-diagram-xs font-bold text-secondary-foreground"
                : "text-diagram-xs font-bold text-muted-foreground"
            }
          >
            {badge}
          </Text>
        </View>
      </View>
      {bsText ? (
        <Text className="mt-1.5 text-xl font-extrabold text-foreground">
          {bsText}
        </Text>
      ) : null}
      <Text
        className="mt-1 text-base font-semibold leading-snug text-foreground"
        numberOfLines={2}
      >
        {name}
      </Text>
      <View className="mt-auto flex-row items-center gap-1.5 pt-1">
        {weekday ? (
          <Text className="text-sm text-muted-foreground">{weekday}</Text>
        ) : null}
        {extra > 0 ? (
          <View className="rounded-full bg-muted px-1.5 py-0.5">
            <Text className="text-xs font-bold text-muted-foreground">
              +{digits(extra)}
            </Text>
          </View>
        ) : null}
      </View>
    </TintCard>
  );
}

/** The BS year/month/day a festival falls on, from its BS date or its AD date. */
function bsDateOf(
  f: UpcomingFestival,
): { year: number; month: number; day: number } | null {
  if (f.bs_start_date) {
    const [y, m, d] = f.bs_start_date.split("-").map(Number);
    if (y && m >= 1 && m <= 12 && d >= 1) return { year: y, month: m, day: d };
  }
  if (f.start_date) {
    const [y, m, d] = f.start_date.split("-").map(Number);
    if (y && m && d) {
      const bs = adToBS(new Date(y, m - 1, d));
      return { year: bs.year, month: bs.month, day: bs.day };
    }
  }
  return null;
}
