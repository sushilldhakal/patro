import { View } from "react-native";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { Link } from "expo-router";
import { PressCard } from "@/components/ui/PressCard";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { useAakashGocharEntryCard } from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/design-tokens/cn";

/** Entry card to the 3D sky — sits directly under the calendar (and today's card) like on the web. */
export function AakashGocharEntryCard() {
  const colors = useThemeColors();
  const card = useAakashGocharEntryCard();
  /* iOS 18+: the native zoom transition — the sky grows out of this card, and swiping down or back
     shrinks it into the card again, interactively. Elsewhere `AppleZoom` passes straight through and
     the route pushes normally. The Link does the navigating; the card keeps its press scale. */
  return (
    <Link href="/aakash-gochar" asChild>
      <Link.AppleZoom>
    <PressCard
      className={cn(homeClasses.aakashCard)}
      label={card.label}
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
      </Link.AppleZoom>
    </Link>
  );
}
