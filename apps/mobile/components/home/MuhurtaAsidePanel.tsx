import { elementHref } from "@/lib/element-routes";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { PanchangaDay } from "@/lib/api";
import { useMuhurtaAside } from "@vedic-patro/features/home";
import { Ionicons } from "@/components/icons/Ionicons";
import { patroNavataraRow } from "@/lib/patro-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

/* The tile itself is the shared `patroNavataraRow`; the app wraps three to a
   line and `flex-1` stretches a short last row so no slot is left empty. The
   web edges the tile with an inset ring shadow, which native does not draw —
   a hairline border is its equivalent. */
const SLOT = "min-w-[31%] flex-1 border border-border/60";

type Props = {
  p: PanchangaDay;
};

export function MuhurtaAsidePanel({ p }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const aside = useMuhurtaAside(p);
  const { panel } = aside;

  return (
    <View className="gap-2">
      <View className="flex-row gap-1">
        {aside.tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={tab.select}
            className={cn(
              "flex-1 items-center justify-center",
              homeClasses.muhurtaSubTab,
              tab.active ? homeClasses.muhurtaSubTabActive : homeClasses.muhurtaSubTabIdle,
            )}
          >
            <Text className={cn(homeClasses.muhurtaSubTabLabel, tab.active && homeClasses.muhurtaSubTabLabelActive)} style={nepaliTextStyle()}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className={homeClasses.muhurtaHint}>
        <View className="mt-px opacity-75">
          <Ionicons name="information-circle-outline" size={13} color={colors.foreground} />
        </View>
        <Text className={cn("flex-1", homeClasses.muhurtaHintText)} style={nepaliTextStyle()}>
          {aside.hint}
        </Text>
      </View>

      {panel.empty ? (
        <Text className={homeClasses.muhurtaEmpty} style={nepaliTextStyle()}>
          {panel.empty}
        </Text>
      ) : (
        <View>
          {panel.moonRef ? (
            <Text className={homeClasses.muhurtaMoonRef} style={nepaliTextStyle()}>
              {panel.moonRef.label} <Text className={homeClasses.muhurtaMoonRefStrong}>{panel.moonRef.value}</Text>
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-1">
            {panel.slots.map((slot) => (
              <View key={slot.key} className={cn(patroNavataraRow(slot.tone), SLOT)}>
                {slot.isMoon ? <View pointerEvents="none" className="absolute inset-0 rounded-md border-[1.5px] border-accent/45" /> : null}
                <Text className={homeClasses.muhurtaSlotTitle} style={nepaliTextStyle()}>
                  {slot.title}
                </Text>
                <Text className={homeClasses.muhurtaSlotValue} style={nepaliTextStyle()}>
                  {slot.value}
                  <Text className={homeClasses.muhurtaSlotSep}> / </Text>
                  {slot.quality}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable
        onPress={() => router.push(elementHref(aside.elementId) as never)}
        accessibilityRole="link"
        className="items-center rounded-lg border border-border py-2.5 active:opacity-80"
      >
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle()}>
          {aside.viewFullTable}
        </Text>
      </Pressable>
    </View>
  );
}
