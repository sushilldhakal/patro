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
} from "@vedic-patro/domain/gochar-page-utils";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

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
    <View className={gocharClasses.ingressCard}>
      <View className={gocharClasses.ingressHead}>
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className={gocharClasses.ingressEyebrow} style={nepaliTextStyle()}>
              {pick("के परिवर्तन हुँदैछ", "What's changing")}
            </Text>
            <Text className={gocharClasses.ingressTitle} style={nepaliTextStyle()}>
              {pick("आगामी गोचर घटनाहरू", "Upcoming transit events")}
            </Text>
          </View>
          {showMonthNav ? (
            <View className={cn("flex-row", gocharClasses.navGroup)}>
              <NavBtn icon="chevron-back" onPress={onPrevMonth!} />
              <Text
                numberOfLines={1}
                className={cn("min-w-[6.5rem]", gocharClasses.navLabel)}
                style={nepaliTextStyle()}
              >
                {browseMonthLabel}
              </Text>
              <NavBtn icon="chevron-forward" onPress={onNextMonth!} />
            </View>
          ) : null}
        </View>
      </View>

      <View className={cn("flex-row flex-wrap", gocharClasses.filterBar)}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              className={cn(
                gocharClasses.filterChip,
                "active:opacity-80",
                active ? gocharClasses.filterChipActive : gocharClasses.filterChipIdle,
              )}
            >
              <Text
                className={cn(gocharClasses.filterText, active ? gocharClasses.filterTextActive : gocharClasses.filterTextIdle)}
                style={nepaliTextStyle()}
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
        contentContainerClassName={gocharClasses.ingressList}
      >
        {loading ? (
          <Text className={gocharClasses.ingressStatus} style={nepaliTextStyle()}>
            {pick("लोड हुँदै…", "Loading…")}
          </Text>
        ) : visible.length === 0 ? (
          <Text className={gocharClasses.ingressStatus} style={nepaliTextStyle()}>
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
                className={cn("flex-row", gocharClasses.ingressRow)}
                style={{ minHeight: INGRESS_EVENT_ROW_HEIGHT }}
              >
                <View className="w-11 shrink-0 overflow-hidden rounded-lg border border-border">
                  <View className="bg-secondary px-1 py-0.5">
                    <Text
                      numberOfLines={1}
                      className="text-center text-xs font-bold text-secondary-foreground"
                      style={nepaliTextStyle()}
                    >
                      {chip.month}
                    </Text>
                  </View>
                  <Text className="py-0.5 text-center font-num text-sm font-bold text-foreground" style={nepaliTextStyle()}>
                    {chip.day}
                  </Text>
                </View>

                <GrahaPlanetIcon graha={ev.graha as GrahaKey} size={22} />

                <View className={gocharClasses.ingressBody}>
                  <Text className={gocharClasses.ingressName} style={nepaliTextStyle()}>
                    {ingressGrahaLabel(ev, lang)}
                  </Text>
                  <Text
                    className={gocharClasses.ingressDetail}
                    style={nepaliTextStyle()}
                  >
                    {ingressEventDetail(ev, lang)}
                  </Text>
                </View>

                <Text className={gocharClasses.ingressRel} style={nepaliTextStyle()}>
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
      className={cn(gocharClasses.navButton, "active:bg-muted")}
    >
      <Ionicons name={icon} size={16} color={colors.foreground} />
    </Pressable>
  );
}
