import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { useRituPage } from "@vedic-patro/features/ritu";
import { cn } from "@vedic-patro/domain/utils";
import { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useTheme } from "@/lib/theme-context";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";

/** ऋतु — the app's drawing of `useRituPage` (@vedic-patro/features), shared with the website. */
export function RituSeasons({
  location,
  showToolbar = true,
}: {
  location: PanchangaLocation;
  showToolbar?: boolean;
}) {
  const router = useRouter();
  const page = useRituPage(location.params);
  const { colors, isDark } = useTheme();
  /* Web: `text-secondary dark:text-primary` for the current-season accents. */
  const accent = isDark ? colors.primary : colors.secondary;
  const { width } = useBreakpoint();
  /* Web grid: grid-cols-1 compact:grid-cols-2 md:grid-cols-3, gap-3. Percent widths leave
     4% per gap (12px) so the last tile does not wrap. */
  const cols = width >= 768 ? 3 : width >= 480 ? 2 : 1;
  const cardWidth = `${((100 - 4 * (cols - 1)) / cols).toFixed(2)}%`;

  if (page.status === "loading") return <LoadingState />;
  if (page.status === "error") return <ErrorState />;

  return (
    <View>
      {showToolbar ? (
        <View className={cn("flex-row flex-wrap", rituClasses.toolbar)}>
          {page.south ? (
            <Text className={rituClasses.southTag} style={nepaliTextStyle()}>
              {page.copy.southern}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(hrefForLearnSlug("ritu-drift"))}
            className={cn("flex-row active:opacity-80", rituClasses.whyLink)}
          >
            <Ionicons name="help-circle-outline" size={13} color={accent} />
            <Text className={rituClasses.whyLinkText} style={[nepaliTextStyle(), { color: accent }]}>
              {page.copy.whyLink}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="flex-row flex-wrap gap-3">
        {page.cards.map((card) => (
          <View key={card.key} style={{ width: cardWidth as `${number}%` }} className={rituClasses.card}>
            {card.current ? (
              <View pointerEvents="none" className="absolute inset-0 rounded-xl border-[1.5px] border-secondary/40 dark:border-primary/40" />
            ) : null}
            <Text className={rituClasses.kicker} style={[nepaliTextStyle(), card.current ? { color: accent } : undefined]}>
              {card.kicker}
            </Text>
            <View className={cn("flex-row", rituClasses.seasonRow)}>
              <Text className={rituClasses.emoji}>{card.emoji}</Text>
              <View className={rituClasses.nameWrap}>
                <Text className={rituClasses.name} style={nepaliTextStyle()}>
                  {card.name}
                </Text>
              </View>
              <View className={cn("h-[46px] w-[46px] bg-secondary/[0.13]", rituClasses.dateChip)}>
                <Text className={rituClasses.dateDay}>{card.day}</Text>
                <Text className={rituClasses.dateMonth} style={nepaliTextStyle()}>
                  {card.month}
                </Text>
              </View>
            </View>
            <View className={cn("flex-row", rituClasses.metaRow)}>
              <Text className={cn("min-w-0 flex-1", rituClasses.metaText)} style={nepaliTextStyle()}>
                {card.meta}
              </Text>
              <Text className={cn("shrink-0", rituClasses.metaFrom)} style={nepaliTextStyle()}>
                {card.from}
              </Text>
            </View>
            {card.progress ? (
              <>
                <View className={rituClasses.track}>
                  <View className={rituClasses.bar} style={{ width: `${card.progress.pct}%`, backgroundColor: accent }} />
                </View>
                <View className={cn("flex-row", rituClasses.progressRow)}>
                  <Text className={rituClasses.progressText} style={nepaliTextStyle()}>
                    {card.progress.label}
                  </Text>
                  <Text className={rituClasses.progressPct} style={nepaliTextStyle()}>
                    {card.progress.pctLabel}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        ))}
      </View>

      {page.south ? (
        <Text className={rituClasses.southNote} style={nepaliTextStyle()}>
          {page.copy.southNote}
        </Text>
      ) : null}
    </View>
  );
}
