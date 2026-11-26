import { Pressable, View } from "react-native";
import { Icon } from "@vedic-patro/ui";
import { shellIcons } from "@vedic-patro/ui/kit/shell";
import { isGregorianEra, patroBrowseTodayEra, type Era } from "@vedic-patro/domain/calendar/era";
import { patroBrowseTodayYear } from "@vedic-patro/domain/calendar/patro-browse-params";
import { usePatroYearHeadlineSubtitle } from "@vedic-patro/features/common";
import type { TopBarHeader } from "@/components/navigation/TopBarSlot";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { patroEraShortLabel } from "@vedic-patro/domain/calendar/patro-era-label";
import { resolveSamvatsaraForPatroYear } from "@vedic-patro/domain/calendar/samvatsara";
import { haptics } from "@vedic-patro/ui/motion";
import { Text } from "@/components/ui/Text";
import { useEffect } from "react";
import { useCalendarSystem, useLocale } from "@/lib/i18n";

/** What a page's header shows left of its buttons on a phone: the date badge and the year line. */
export type HeaderDateTitleProps = {
  /** Badge top half (month, or era on a year page). */
  badgeTop: string;
  /** Badge bottom half (the month's day range, the day, or the year). */
  badgeBottom: string;
  title: string;
  subtitle?: string;
  /** Tap the badge to jump back to today. */
  onToday?: () => void;
  /** Tap the year line to open the month/year picker. Given, the badge and the
      year line sit in one filled split button with a ▾ (home). */
  onPick?: () => void;
};

/** Year + era + samvatsara (२०८३ वि.सं. युव), from the app's own table so it agrees with the server. */
export function usePatroYearLine(era: Era, year: number): string {
  const { lang, digits } = useLocale();
  const samvatsara = resolveSamvatsaraForPatroYear(era, year);
  const name = samvatsara ? (lang === "en" ? samvatsara.name_en : samvatsara.name_ne) : undefined;
  return `${digits(year)} ${patroEraShortLabel(era, lang)}${name ? ` ${name}` : ""}`;
}

/** Home's first-row title, shared by every page with a date header: badge (the Today key) + year line. */
export function HeaderDateTitle({ badgeTop, badgeBottom, title, subtitle, onToday, onPick }: HeaderDateTitleProps) {
  const { t } = useLocale();
  if (onPick) {
    // Content width, no fill: badge (today) + year line with ▾ (picker), as tall as the badge.
    return (
      <View className="min-w-0 shrink flex-row items-center gap-2">
        <Pressable
          onPress={() => {
            if (!onToday) return;
            haptics.tick();
            onToday();
          }}
          disabled={!onToday}
          accessibilityRole="button"
          accessibilityLabel={t("calendar.today_jump")}
          className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-xl border border-border bg-card active:opacity-70"
          style={{ borderCurve: "continuous" }}
        >
          <View className="h-[18px] items-center justify-center bg-secondary px-0.5">
            <Text numberOfLines={1} className="text-diagram-sm font-bold text-secondary-foreground">
              {badgeTop}
            </Text>
          </View>
          <View className="flex-1 items-center justify-center px-0.5">
            <Text numberOfLines={1} className="text-xs font-bold text-secondary">
              {badgeBottom}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.tick();
            onPick();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${t("calendar.pick_month_year")}: ${title}${subtitle ? `, ${subtitle}` : ""}`}
          hitSlop={6}
          className="min-w-0 shrink justify-center active:opacity-60"
          style={{ height: 46 }}
        >
          <View className="min-w-0 flex-row items-center gap-1">
            <Text numberOfLines={1} className="shrink text-base font-bold text-foreground">
              {title}
            </Text>
            <Icon node={shellIcons.chevronDown} size="sm" tone="secondary" />
          </View>
          {subtitle ? (
            <Text numberOfLines={1} className="text-diagram-sm font-medium text-muted-foreground">
              {subtitle}
            </Text>
          ) : null}
        </Pressable>
      </View>
    );
  }
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-2">
      <Pressable
        onPress={() => {
          if (!onToday) return;
          haptics.tick();
          onToday();
        }}
        disabled={!onToday}
        accessibilityRole="button"
        accessibilityLabel={t("calendar.today_jump")}
        className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-2xl border border-border active:opacity-70"
      >
        <View className="flex-1 items-center justify-center bg-secondary px-0.5">
          <Text numberOfLines={1} className="text-sm font-bold text-secondary-foreground">
            {badgeTop}
          </Text>
        </View>
        <View className="flex-1 items-center justify-center bg-card px-0.5">
          <Text numberOfLines={1} className="text-xs font-semibold text-secondary">
            {badgeBottom}
          </Text>
        </View>
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-base font-bold text-foreground">
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} className="text-diagram-sm font-medium text-muted-foreground">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** The year pages' first row: era over year in the badge (tap: this year), year line, AD range. */
export function usePatroYearTopBarHeader({
  era,
  year,
  onYearChange,
  onEraChange,
  onToday,
  gregorianRange,
  crossEraSubtitle,
  location,
  onLocationChange,
}: {
  era: Era;
  year: number;
  onYearChange: (year: number) => void;
  onEraChange?: (era: Era) => void;
  onToday?: () => void;
  gregorianRange?: { start: string; end: string } | null;
  crossEraSubtitle?: string;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
}): TopBarHeader {
  const { lang, digits } = useLocale();
  const title = usePatroYearLine(era, year);
  const subtitle = usePatroYearHeadlineSubtitle(era, year, gregorianRange, crossEraSubtitle);
  return {
    location,
    onLocationChange,
    title,
    subtitle,
    badgeTop: patroEraShortLabel(era, lang),
    badgeBottom: digits(year),
    // Same "this year" as the year picker's own (PatroYearNav).
    onToday:
      onToday ??
      (() => {
        const targetEra = patroBrowseTodayEra(era);
        if (targetEra !== era) onEraChange?.(targetEra);
        onYearChange(patroBrowseTodayYear(era));
      }),
  };
}

/**
 * A page's date header follows the app's BS | AD setting (home's toggle, Settings): switch to AD
 * and every page shows AD dates; back to BS and a Gregorian page returns to BS.
 */
export function useFollowCalendarSystem(era: Era, onEraChange?: (era: Era) => void) {
  const { calendar } = useCalendarSystem();
  useEffect(() => {
    if (!onEraChange) return;
    if (calendar === "ad" && !isGregorianEra(era)) onEraChange("ad");
    else if (calendar === "bs" && isGregorianEra(era)) onEraChange("bs");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar]);
}
