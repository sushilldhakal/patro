import { useEffect, useRef, type ComponentRef } from "react";
import { Pressable, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@vedic-patro/ui";
import { haptics } from "@vedic-patro/ui/motion";
import type { TimeWheelProps } from "../contract";
import { wheelColumns, type WheelColumn } from "../wheel-items";

/** One row of the wheel, and how many show (the chosen one in the middle band). */
const ROW = 36;
const VISIBLE = 5;

/**
 * Apple's time wheel under a time row: hour, minute and am / pm columns that scroll and snap,
 * the chosen row in a grey band; a tap on a row picks it too.
 */
export function TimeWheel({ value, onChange }: TimeWheelProps) {
  const { lang, digits } = useLocale();
  return (
    <View className="relative flex-row py-1" style={{ height: ROW * VISIBLE + 8 }}>
      <View pointerEvents="none" className="absolute inset-x-0 rounded-xl bg-background" style={{ top: 4 + ROW * 2, height: ROW }} />
      {wheelColumns(value, onChange, lang === "en", (s) => digits(s)).map((col) => (
        <Column key={col.id} col={col} />
      ))}
    </View>
  );
}

function Column({ col }: { col: WheelColumn }) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = Math.max(0, col.items.findIndex((i) => i.value === col.value));

  // Keep the chosen row in the band when the value changes from outside (a pick, the other columns).
  useEffect(() => {
    ref.current?.scrollTo({ y: index * ROW, animated: false });
  }, [index]);

  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(col.items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ROW)));
    if (i !== index) {
      haptics.tick();
      col.pick(col.items[i]!.value);
    }
  };

  return (
    <ScrollView
      ref={ref}
      accessibilityLabel={col.id}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW}
      decelerationRate="fast"
      nestedScrollEnabled
      onMomentumScrollEnd={settle}
      onScrollEndDrag={(e) => {
        // A drag that stops without momentum still settles.
        if (Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) settle(e);
      }}
      contentOffset={{ x: 0, y: index * ROW }}
      contentContainerStyle={{ paddingVertical: ROW * 2 }}
      style={{ flex: 1 }}
    >
      {col.items.map((item, i) => (
        <Pressable
          key={item.value}
          onPress={() => col.pick(item.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: i === index }}
          className="items-center justify-center"
          style={{ height: ROW }}
        >
          <Text className={cn("font-num", i === index ? "text-title text-foreground" : "text-body text-muted-foreground")}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
