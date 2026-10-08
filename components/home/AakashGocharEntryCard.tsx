import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

/** Entry card to the 3D sky — sits directly under the calendar (and today's card) like on the web. */
export function AakashGocharEntryCard() {
  const router = useRouter();
  const colors = useThemeColors();
  const { pick } = useLocale();
  return (
    <Pressable
      onPress={() => router.push("/aakash-gochar")}
      className="flex-row items-center gap-2.5 rounded-xl border border-secondary/40 bg-secondary/10 px-3 py-2.5 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={pick("३D आकाश गोचर", "3D Aakash Gochar")}
    >
      <Ionicons name="planet-outline" size={20} color={colors.secondary} />
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-foreground" style={nepaliTextStyle(14)}>
          {pick("३D आकाश गोचर", "3D Aakash Gochar")}
        </Text>
      </View>
      <Text className="text-xs text-muted-foreground" style={nepaliTextStyle(11)}>
        {pick("भूकेन्द्रित", "Geocentric")}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}
