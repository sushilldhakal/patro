import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme-context";

export default function KundaliLayout() {
  const colors = useThemeColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
