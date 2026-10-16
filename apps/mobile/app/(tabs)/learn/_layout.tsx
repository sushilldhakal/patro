import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme-context";

export default function LearnLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.background },
      }}
    />
  );
}
