import { Pressable } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useHeaderHasBack } from "@/lib/header-back";

export function DocumentBackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const colors = useThemeColors();
  const headerHasBack = useHeaderHasBack();
  // A phone has the top bar's back key: one back key, not two.
  if (headerHasBack) return null;
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(href as never))}
      accessibilityRole="button"
      hitSlop={8}
      className={cn(documentsClasses.backLink, "flex-row self-start")}
    >
      <Ionicons name="arrow-back" size={16} color={colors.foreground} />
      <Text className={cn(documentsClasses.backLinkText, "text-foreground")}>{label}</Text>
    </Pressable>
  );
}
