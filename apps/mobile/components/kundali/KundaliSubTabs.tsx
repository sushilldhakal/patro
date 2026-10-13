/**
 * Quick-switch row between sibling sections of one group (the four बल cards
 * today). Mirrors web's KundaliSubTabs: jump straight to a sibling from
 * inside the card, without going back to the section nav first.
 */

import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

export function KundaliSubTabs<T extends string>({
  items,
  activeId,
  onSelect,
}: {
  items: { id: T; label: string }[];
  activeId: T;
  onSelect: (id: T) => void;
}) {
  return (
    <View className={cn(kundaliDetailClasses.subTabs.root, "self-start")}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            className={cn(
              kundaliDetailClasses.subTabs.tab,
              "border active:opacity-80",
              active ? cn(kundaliDetailClasses.subTabs.tabActive, "border-border/60") : "border-transparent",
            )}
          >
            <Text
              className={cn(kundaliDetailClasses.subTabs.tabText, kundaliDetailClasses.subTabs.tabActiveText)}
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
