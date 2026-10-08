import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { Text } from "@/components/ui/Text";
import type { GocharIngressEvent } from "@/lib/api";
import {
  countIngressByFilter,
  daysFromRef,
  filterIngressEvents,
  formatGocharIngressChip,
  ingressEventDateAd,
  ingressEventDetail,
  ingressGrahaLabel,
  relativeDayLabel,
  type IngressFilter,
} from "@/lib/gochar-page-utils";
import type { GrahaKey } from "@/lib/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { colorWithAlpha } from "@/lib/theme";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/** ~15 calendar-day rows visible; additional events scroll inside the panel. */
const INGRESS_VISIBLE_DAY_ROWS = 15;
const INGRESS_EVENT_ROW_HEIGHT = 54;

const FILTERS: { id: IngressFilter; ne: string; en: string }[] = [
  { id: "all", ne: "सबै", en: "All" },
  { id: "rashi", ne: "राशि", en: "Sign" },
  { id: "nakshatra", ne: "नक्षत्र", en: "Nakshatra" },
  { id: "asta", ne: "अस्त", en: "Combust" },
  { id: "retrograde", ne: "वक्री", en: "Retrograde" },
];

export function GocharIngressSection({
  events,
  refDateAd,
  loading,
  browseMonthLabel,
  onPrevMonth,
  onNextMonth,
}: {
  events: GocharIngressEvent[];
  refDateAd: string;
  loading?: boolean;
  browseMonthLabel?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { height: windowHeight } = useBreakpoint();
  const [filter, setFilter] = useState<IngressFilter>("all");

  const listMaxHeight = Math.min(
    INGRESS_VISIBLE_DAY_ROWS * INGRESS_EVENT_ROW_HEIGHT,
    Math.round(windowHeight * 0.52),
  );

  const counts = useMemo(() => countIngressByFilter(events), [events]);
  const visible = useMemo(() => filterIngressEvents(events, filter), [events, filter]);
  const showMonthNav = Boolean(browseMonthLabel && onPrevMonth && onNextMonth);

  return (
    <View className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <View className="gap-2 border-b border-border px-3 py-2.5">
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text
              style={{ letterSpacing: 1.2, ...nepaliTextStyle(11) }}
              className="text-xs font-bold uppercase text-muted-foreground"
            >
              {pick("के परिवर्तन हुँदैछ", "What's changing")}
            </Text>
            <Text
              className="mt-0.5 text-base font-bold text-foreground"
              style={nepaliTextStyle(16)}
            >
              {pick("आगामी गोचर घटनाहरू", "Upcoming transit events")}
            </Text>
          </View>
          {showMonthNav ? (
            <View className="shrink-0 flex-row items-center gap-1">
              <NavBtn icon="chevron-back" onPress={onPrevMonth!} />
              <Text
                numberOfLines={1}
                className="min-w-[86px] text-center text-sm font-bold text-foreground"
                style={nepaliTextStyle(13)}
              >
                {browseMonthLabel}
              </Text>
              <NavBtn icon="chevron-forward" onPress={onNextMonth!} />
            </View>
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap gap-1.5 border-b border-border px-2 py-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                borderColor: active ? colors.secondary : colors.border,
                backgroundColor: active
                  ? colorWithAlpha("#0b565a", 0.15)
                  : colors.background,
              }}
              className="rounded-lg border px-2 py-1.5 active:opacity-80"
            >
              <Text
                style={{
                  color: active ? colors.secondary : colors.mutedForeground,
                  ...nepaliTextStyle(12),
                }}
                className="text-xs font-bold"
              >
                {pick(f.ne, f.en)} ({digits(counts[f.id])})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={{ maxHeight: listMaxHeight }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingVertical: 4 }}
      >
        {loading ? (
          <Text className="px-2 py-6 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("लोड हुँदै…", "Loading…")}
          </Text>
        ) : visible.length === 0 ? (
          <Text className="px-2 py-6 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
            {pick("यस महिनामा कुनै आगामी गोचर छैन।", "No upcoming transits this month.")}
          </Text>
        ) : (
          visible.map((ev, i) => {
            const dateAd = ingressEventDateAd(ev) ?? refDateAd;
            const chip = formatGocharIngressChip(dateAd, lang, digits);
            const rel = relativeDayLabel(daysFromRef(dateAd, refDateAd), lang, digits);

            return (
              <View
                key={`${ev.graha}-${ev.entry_time_utc ?? i}-${ev.level}`}
                className="flex-row items-center gap-2.5 border-b border-border px-2 py-2"
                style={{ minHeight: INGRESS_EVENT_ROW_HEIGHT }}
              >
                <View className="w-11 shrink-0 overflow-hidden rounded-lg border border-border">
                  <View className="bg-secondary px-1 py-0.5">
                    <Text
                      numberOfLines={1}
                      className="text-center text-[12px] font-bold text-secondary-foreground"
                      style={nepaliTextStyle(10)}
                    >
                      {chip.month}
                    </Text>
                  </View>
                  <Text className="py-0.5 text-center font-num text-sm font-bold text-foreground">
                    {chip.day}
                  </Text>
                </View>

                <GrahaPlanetIcon graha={ev.graha as GrahaKey} size={22} />

                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-foreground" style={nepaliTextStyle(14)}>
                    {ingressGrahaLabel(ev, lang)}
                  </Text>
                  <Text
                    className="mt-0.5 text-sm font-semibold text-foreground"
                    style={nepaliTextStyle(13)}
                  >
                    {ingressEventDetail(ev, lang)}
                  </Text>
                </View>

                <Text
                  style={{ color: colors.secondary, ...nepaliTextStyle(12) }}
                  className="shrink-0 text-xs font-bold"
                >
                  {rel}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function NavBtn({
  icon,
  onPress,
}: {
  icon: "chevron-back" | "chevron-forward";
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className="h-7 w-7 items-center justify-center rounded-lg border border-border bg-background active:bg-muted"
    >
      <Ionicons name={icon} size={15} color={colors.foreground} />
    </Pressable>
  );
}
