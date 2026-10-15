import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import { useAyanamshaSelector } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Props = {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
};

export function AyanamshaSelector(props: Props) {
  const sel = useAyanamshaSelector(props);

  return (
    <View className={cn(kundaliDetailClasses.ayanamsha.card, "mb-4 overflow-hidden border border-border")}>
      <View className={cn(kundaliDetailClasses.ayanamsha.header, "bg-secondary/10")}>
        <Text
          className={kundaliDetailClasses.ayanamsha.heading}
          style={nepaliTextStyle(12)}
        >
          {sel.heading}
        </Text>
      </View>
      <View className={kundaliDetailClasses.ayanamsha.body}>
        <View className={kundaliDetailClasses.ayanamsha.chips}>
          {sel.chips.map((m) => (
            <Pressable
              key={m.id}
              onPress={m.select}
              accessibilityHint={m.title}
              className={cn(
                kundaliDetailClasses.ayanamsha.chip,
                "active:opacity-80",
                m.active ? kundaliDetailClasses.ayanamsha.chipActive : kundaliDetailClasses.ayanamsha.chipIdle,
              )}
            >
              <Text
                style={nepaliTextStyle(13)}
                className={cn(
                  kundaliDetailClasses.ayanamsha.chipText,
                  m.active ? kundaliDetailClasses.ayanamsha.chipActiveText : kundaliDetailClasses.ayanamsha.chipIdleText,
                )}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className={kundaliDetailClasses.ayanamsha.note} style={nepaliTextStyle(13)}>
          {sel.note}
        </Text>
      </View>
    </View>
  );
}
