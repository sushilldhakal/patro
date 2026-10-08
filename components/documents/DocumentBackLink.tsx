import { Pressable } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";

export function DocumentBackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(href as never))}
      accessibilityRole="button"
      hitSlop={8}
      className="mb-3 flex-row items-center gap-1.5 self-start py-1"
    >
      <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </Pressable>
  );
}
