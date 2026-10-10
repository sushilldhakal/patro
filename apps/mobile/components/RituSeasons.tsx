import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/Text";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { fetchTropicalSeasons, seasonsKeys } from "@/lib/api";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  displayRituSlot,
  RITU_MARKER_KEYS,
  RITU_SEASON_EMOJI,
  RITU_SEASON_KEYS,
} from "@/lib/ritu-display";
import { rituMarkerLabel, rituSeasonLabel } from "@/lib/ritu-labels";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import {
  resolveLocationTimezone,
  type PanchangaLocation,
} from "@/lib/use-panchanga-location";
import { cn } from "@/lib/utils";
import { todayAdStringInTimezone } from "@/lib/zoned-time";

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
  const { pick, digits, lang } = useLocale();
  const colors = useThemeColors();
  const { width } = useBreakpoint();
  const tz = resolveLocationTimezone(location);
  const todayAd = useMemo(() => todayAdStringInTimezone(new Date(), tz), [tz]);
  const cardWidth = width >= 821 ? "32%" : width >= 481 ? "49%" : "100%";

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
    if (days === 1) return pick("भोलि", "Tomorrow");
    return pick(`${digits(days)} दिनपछि`, `${digits(days)} days later`);
  };

  const whyLink = (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(hrefForLearnSlug("ritu-drift"))}
      className="flex-row items-center gap-1 rounded-full border px-2.5 py-1 active:opacity-80"
      style={{ borderColor: `${colors.secondary}59` }}
    >
      <Ionicons name="help-circle-outline" size={13} color={colors.secondary} />
      <Text
        className="text-caption font-semibold"
        style={{ color: colors.secondary, ...nepaliTextStyle(12) }}
      >
        {pick("ऋतु किन सर्छ?", "Why do seasons shift?")}
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
        <View className="mb-4 flex-row flex-wrap items-center justify-end gap-2">
          {south ? (
            <Text
              className="text-caption font-semibold"
              style={{ color: colors.primary, ...nepaliTextStyle(12) }}
            >
              {pick(" · दक्षिणी गोलार्ध", " · Southern hemisphere")}
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
              style={{
                width: cardWidth as `${number}%`,
                borderColor: item.isCurrent ? `${colors.secondary}61` : colors.border,
                backgroundColor: colors.card,
              }}
              className={cn(
                "gap-2 rounded-xl p-3.5",
                item.isCurrent ? "border-[1.5px]" : "border border-border/40",
              )}
            >
              <Text
                className="text-body font-bold uppercase tracking-wider"
                style={{
                  color: item.isCurrent ? colors.secondary : colors.mutedForeground,
                  ...nepaliTextStyle(13),
                }}
              >
                {item.isCurrent ? pick("चालू ऋतु", "Current season") : relLabel(item.daysUntil)}
              </Text>

              <View className="flex-row items-center gap-3">
                <Text className="text-title">{RITU_SEASON_EMOJI[seasonKey]}</Text>
                <View className="min-w-0 flex-1">
                  <Text className="text-title font-bold text-foreground" style={nepaliTextStyle(20)}>
                    {rituSeasonLabel(seasonKey, lang)}
                  </Text>
                </View>
                <View
                  className="h-[46px] w-[46px] items-center justify-center gap-px rounded-lg"
                  style={{ backgroundColor: `${colors.secondary}21` }}
                >
                  <Text className="text-body font-num font-bold text-accent">
                    {digits(item.startBs.day)}
                  </Text>
                  <Text className="text-body font-semibold text-accent" style={nepaliTextStyle(13)}>
                    {monthLabel}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-baseline justify-between gap-2">
                <Text className="text-body min-w-0 flex-1 font-semibold text-foreground" style={nepaliTextStyle(14)}>
                  {markerKey
                    ? `${rituMarkerLabel(markerKey, lang)} · ${pick(`सूर्य ${digits(item.angle)}°`, `Sun ${digits(item.angle)}°`)}`
                    : pick(`सूर्य ${digits(item.angle)}°`, `Sun ${digits(item.angle)}°`)}
                </Text>
                <Text className="text-caption shrink-0 font-num text-muted-foreground">
                  {fmtAd(item.startAd, lang)} {pick("देखि", "from")}
                </Text>
              </View>

              {item.isCurrent && item.progress ? (
                <>
                  <View className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${item.progress.pct}%`,
                        backgroundColor: colors.secondary,
                      }}
                    />
                  </View>
                  <View className="flex-row items-baseline justify-between gap-2">
                    <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
                      {digits(item.progress.elapsed)} / {digits(item.progress.total)}{" "}
                      {pick("दिन", "days")}
                    </Text>
                    <Text className="text-caption font-num font-semibold text-foreground">
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
        <Text className="text-body mx-0.5 mt-2.5 leading-normal text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick(
            "दक्षिणी गोलार्धमा ऋतु ६ महिना उल्टो हुन्छ — माथिका नाम तपाईंको स्थानको वास्तविक ऋतु अनुसार मिलाइएका छन् (विषुव/अयनान्तका मिति उही नै हुन्)।",
            "In the southern hemisphere the seasons are reversed by 6 months — the names above are matched to your location's actual season (the equinox/solstice dates stay the same).",
          )}
        </Text>
      ) : null}
    </View>
  );
}
