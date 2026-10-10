/**
 * Quick-switch row between sibling sections of one group (the four बल cards
 * today). Mirrors web's KundaliSubTabs: jump straight to a sibling from
 * inside the card, without going back to the section nav first.
 */

import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";

export function KundaliSubTabs<T extends string>({
  items,
  activeId,
  onSelect,
}: {
  items: { id: T; label: string }[];
  activeId: T;
  onSelect: (id: T) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="mb-3 flex-row flex-wrap gap-1 self-start rounded-xl border border-border/70 bg-muted/20 p-1">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={active ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 } : undefined}
            className="rounded-lg px-3 py-1.5 active:opacity-80"
          >
            <Text
              className={cn("text-body", active ? "font-semibold text-foreground" : "text-muted-foreground")}
              style={nepaliTextStyle(13)}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
