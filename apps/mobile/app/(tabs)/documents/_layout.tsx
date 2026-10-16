import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme-context";

export default function DocumentsLayout() {
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
