import { View } from "react-native";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { PressCard } from "@/components/ui/PressCard";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { useAakashGocharEntryCard } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/design-tokens/cn";

/** Entry card to the 3D sky — sits directly under the calendar (and today's card) like on the web. */
export function AakashGocharEntryCard() {
  const router = useRouter();
  const colors = useThemeColors();
  const card = useAakashGocharEntryCard();
  return (
    <PressCard
      onPress={() => router.push("/aakash-gochar")}
      className={cn(homeClasses.aakashCard)}
      label={card.label}
      zoomToScreen
    >
      <AppNavIcon name="orbit" size={20} color={colors.secondary} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-medium text-foreground" style={nepaliTextStyle()}>
          {card.label}
        </Text>
      </View>
      <Text className="shrink-0 text-xs text-muted-foreground" style={nepaliTextStyle()}>
        {card.tag}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </PressCard>
  );
}
