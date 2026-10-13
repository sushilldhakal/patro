import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/Text";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { fetchTropicalSeasons, seasonsKeys } from "@/lib/api";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  displayRituSlot,
  RITU_MARKER_KEYS,
  RITU_SEASON_EMOJI,
  RITU_SEASON_KEYS,
} from "@/lib/ritu-display";
import { useBreakpoint } from "@/lib/responsive";
import { useTheme } from "@/lib/theme-context";
import {
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";
import { todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";

const DAY = 86_400_000;

const midnightUtcMs = (adStr: string) => Date.parse(`${adStr}T00:00:00Z`);
const civilNoon = (adStr: string) => new Date(`${adStr}T12:00:00Z`);
const fmtAd = (adStr: string, lang: "ne" | "en") =>
  civilNoon(adStr).toLocaleDateString(lang === "en" ? "en-US" : "ne-NP", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

interface SeasonItem {
  solarSlot: number;
  angle: number;
  startBs: { day: number; month: number };
  startAd: string;
  isCurrent: boolean;
  daysUntil: number;
  progress: { elapsed: number; total: number; pct: number } | null;
}

export function RituSeasons({
  location,
  showToolbar = true,
}: {
  location: PanchangaLocation;
  showToolbar?: boolean;
}) {
  const router = useRouter();
  const { digits, lang, t } = useLocale();
  const { colors, isDark } = useTheme();
  /* Web: `text-secondary dark:text-primary` for the current-season accents. */
  const accent = isDark ? colors.primary : colors.secondary;
  const { width } = useBreakpoint();
  const tz = resolveLocationTimezone(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), tz), [tz]);
  /* Web grid: grid-cols-1 compact:grid-cols-2 md:grid-cols-3, gap-3. Percent widths leave
     4% per gap (12px) so the last tile does not wrap. */
  const cols = width >= 768 ? 3 : width >= 480 ? 2 : 1;
  const cardWidth = `${((100 - 4 * (cols - 1)) / cols).toFixed(2)}%`;

  const seasonsQ = useQuery({
    queryKey: seasonsKeys.tropical(location.params),
    queryFn: () => fetchTropicalSeasons(location.params),
    staleTime: 1000 * 60 * 60,
  });

  const south = seasonsQ.data?.southern_hemisphere ?? false;
  const [nowMs] = useState(() => Date.now());

  const seasons = useMemo<SeasonItem[]>(() => {
    const boundaries = seasonsQ.data?.boundaries;
    if (!boundaries?.length) return [];

    const todayMid = midnightUtcMs(todayAd);

    return boundaries.map((b, i) => {
      const startAd = todayAdStringInTimezone(new Date(b.start_instant_utc), tz);
      const bs = adToBS(civilNoon(startAd));
      const next = boundaries[i + 1];
      let progress: SeasonItem["progress"] = null;
      if (b.is_current && next) {
        const startMs = Date.parse(b.start_instant_utc);
        const endMs = Date.parse(next.start_instant_utc);
        const total = Math.max(1, (endMs - startMs) / DAY);
        const elapsed = Math.max(0, (nowMs - startMs) / DAY);
        progress = {
          elapsed: Math.round(elapsed),
          total: Math.round(total),
          pct: Math.max(0, Math.min(100, (elapsed / total) * 100)),
        };
      }
      return {
        solarSlot: b.slot,
        angle: b.angle,
        startBs: { day: bs.day, month: bs.month },
        startAd,
        isCurrent: b.is_current,
        daysUntil: Math.round((midnightUtcMs(startAd) - todayMid) / DAY),
        progress,
      };
    });
  }, [seasonsQ.data, todayAd, tz, nowMs]);

  const relLabel = (days: number) => {
    if (days <= 0) return "";
    if (days === 1) return t("rel.tomorrow");
    return t("ritu.days_after", { days: digits(days) });
  };

  const whyLink = (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(hrefForLearnSlug("ritu-drift"))}
      className={cn("flex-row active:opacity-80", rituClasses.whyLink)}
    >
      <Ionicons name="help-circle-outline" size={13} color={accent} />
      <Text className={rituClasses.whyLinkText} style={[nepaliTextStyle(), { color: accent }]}>
        {t("ritu.why_link")}
      </Text>
    </Pressable>
  );

  if (seasonsQ.isLoading && !seasonsQ.data) {
    return <LoadingState />;
  }
  if (seasonsQ.isError) {
    return <ErrorState />;
  }

  return (
    <View>
      {showToolbar ? (
        <View className={cn("flex-row flex-wrap", rituClasses.toolbar)}>
          {south ? (
            <Text className={rituClasses.southTag} style={nepaliTextStyle()}>
              {t("ritu.southern")}
            </Text>
          ) : null}
          {whyLink}
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        {seasons.map((item, i) => {
          const slot = displayRituSlot(item.solarSlot, south);
          const seasonKey = RITU_SEASON_KEYS[slot]!;
          const markerKey = RITU_MARKER_KEYS[item.solarSlot];
          const monthLabel =
            lang === "en"
              ? BS_MONTH_NAMES[item.startBs.month - 1]
              : BS_MONTHS_NE[item.startBs.month - 1];

          return (
            <View
              key={`${item.solarSlot}-${item.startAd}-${i}`}
              style={{ width: cardWidth as `${number}%` }}
              className={rituClasses.card}
            >
              {item.isCurrent ? (
                <View
                  pointerEvents="none"
                  className="absolute inset-0 rounded-xl border-[1.5px] border-secondary/40 dark:border-primary/40"
                />
              ) : null}
              <Text
                className={rituClasses.kicker}
                style={[nepaliTextStyle(), item.isCurrent ? { color: accent } : undefined]}
              >
                {item.isCurrent ? t("ritu.current") : relLabel(item.daysUntil)}
              </Text>

              <View className={cn("flex-row", rituClasses.seasonRow)}>
                <Text className={rituClasses.emoji}>{RITU_SEASON_EMOJI[seasonKey]}</Text>
                <View className={rituClasses.nameWrap}>
                  <Text className={rituClasses.name} style={nepaliTextStyle()}>
                    {t(`ritu.${seasonKey}`)}
                  </Text>
                </View>
                <View className={cn("h-[46px] w-[46px] bg-secondary/[0.13]", rituClasses.dateChip)}>
                  <Text className={rituClasses.dateDay}>
                    {digits(item.startBs.day)}
                  </Text>
                  <Text className={rituClasses.dateMonth} style={nepaliTextStyle()}>
                    {monthLabel}
                  </Text>
                </View>
              </View>

              <View className={cn("flex-row", rituClasses.metaRow)}>
                <Text className={cn("min-w-0 flex-1", rituClasses.metaText)} style={nepaliTextStyle()}>
                  {markerKey
                    ? `${t(markerKey)} · ${t("ui.ritu_seasons.sun_angle", { angle: digits(item.angle) })}`
                    : t("ui.ritu_seasons.sun_angle", { angle: digits(item.angle) })}
                </Text>
                <Text className={cn("shrink-0", rituClasses.metaFrom)} style={nepaliTextStyle()}>
                  {fmtAd(item.startAd, lang)} {t("common.from")}
                </Text>
              </View>

              {item.isCurrent && item.progress ? (
                <>
                  <View className={rituClasses.track}>
                    <View
                      className={rituClasses.bar}
                      style={{
                        width: `${item.progress.pct}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </View>
                  <View className={cn("flex-row", rituClasses.progressRow)}>
                    <Text className={rituClasses.progressText} style={nepaliTextStyle()}>
                      {digits(item.progress.elapsed)} / {digits(item.progress.total)}{" "}
                      {t("common.days")}
                    </Text>
                    <Text className={rituClasses.progressPct} style={nepaliTextStyle()}>
                      {digits(Math.round(item.progress.pct))}%
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          );
        })}
      </View>

      {south ? (
        <Text className={rituClasses.southNote} style={nepaliTextStyle()}>
          {t("ritu.southern_hemisphere_note")}
        </Text>
      ) : null}
    </View>
  );
}
