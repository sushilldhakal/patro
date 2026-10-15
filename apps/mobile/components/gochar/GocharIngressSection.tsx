import { Pressable, ScrollView, View } from "react-native";
import type { GocharPage } from "@vedic-patro/features/gochar";
import { Ionicons } from "@/components/icons/Ionicons";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

/** ~15 calendar-day rows visible; additional events scroll inside the panel. */
const INGRESS_VISIBLE_DAY_ROWS = 15;
const INGRESS_EVENT_ROW_HEIGHT = 54;

/** Upcoming ingress events of the browsed month — draws `page.ingress` from `useGocharPage`. */
export function GocharIngressSection({ page }: { page: GocharPage }) {
  const { ingress, copy } = page;
  const { height: windowHeight } = useBreakpoint();
  const listMaxHeight = Math.min(INGRESS_VISIBLE_DAY_ROWS * INGRESS_EVENT_ROW_HEIGHT, Math.round(windowHeight * 0.52));

  return (
    <View className={gocharClasses.ingressCard}>
      <View className={gocharClasses.ingressHead}>
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className={gocharClasses.ingressEyebrow} style={nepaliTextStyle()}>
              {copy.ingressEyebrow}
            </Text>
            <Text className={gocharClasses.ingressTitle} style={nepaliTextStyle()}>
              {copy.ingressTitle}
            </Text>
          </View>
          {ingress.monthLabel ? (
            <View className={cn("flex-row", gocharClasses.navGroup)}>
              <NavBtn icon="chevron-back" label={copy.prevMonth} onPress={ingress.prevMonth} />
              <Text numberOfLines={1} className={cn("min-w-[6.5rem]", gocharClasses.navLabel)} style={nepaliTextStyle()}>
                {ingress.monthLabel}
              </Text>
              <NavBtn icon="chevron-forward" label={copy.nextMonth} onPress={ingress.nextMonth} />
            </View>
          ) : null}
        </View>
      </View>

      <View className={cn("flex-row flex-wrap", gocharClasses.filterBar)}>
        {ingress.filters.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => ingress.setFilter(f.id)}
            className={cn(gocharClasses.filterChip, "active:opacity-80", f.active ? gocharClasses.filterChipActive : gocharClasses.filterChipIdle)}
          >
            <Text
              className={cn(gocharClasses.filterText, f.active ? gocharClasses.filterTextActive : gocharClasses.filterTextIdle)}
              style={nepaliTextStyle()}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ maxHeight: listMaxHeight }}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        contentContainerClassName={gocharClasses.ingressList}
      >
        {ingress.loading ? (
          <Text className={gocharClasses.ingressStatus} style={nepaliTextStyle()}>
            {copy.loading}
          </Text>
        ) : ingress.rows.length === 0 ? (
          <Text className={gocharClasses.ingressStatus} style={nepaliTextStyle()}>
            {copy.ingressEmpty}
          </Text>
        ) : (
          ingress.rows.map((row) => (
            <View key={row.key} className={cn("flex-row", gocharClasses.ingressRow)} style={{ minHeight: INGRESS_EVENT_ROW_HEIGHT }}>
              <View className="w-11 shrink-0 overflow-hidden rounded-lg border border-border">
                <View className="bg-secondary px-1 py-0.5">
                  <Text numberOfLines={1} className="text-center text-xs font-bold text-secondary-foreground" style={nepaliTextStyle()}>
                    {row.chip.month}
                  </Text>
                </View>
                <Text className="py-0.5 text-center font-num text-sm font-bold text-foreground" style={nepaliTextStyle()}>
                  {row.chip.day}
                </Text>
              </View>

              <GrahaPlanetIcon graha={row.graha} size={22} />

              <View className={gocharClasses.ingressBody}>
                <Text className={gocharClasses.ingressName} style={nepaliTextStyle()}>
                  {row.name}
                </Text>
                <Text className={gocharClasses.ingressDetail} style={nepaliTextStyle()}>
                  {row.detail}
                </Text>
              </View>

              <Text className={gocharClasses.ingressRel} style={nepaliTextStyle()}>
                {row.relative}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function NavBtn({ icon, label, onPress }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className={cn(gocharClasses.navButton, "active:bg-muted")}>
      <Ionicons name={icon} size={16} color={colors.foreground} />
    </Pressable>
  );
}
