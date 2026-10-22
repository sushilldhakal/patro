import { Stack } from "expo-router";
import { useRailPageAnimation } from "@/components/panchanga/PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";

export default function KundaliLayout() {
  const colors = useThemeColors();
  const fade = useRailPageAnimation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        ...(fade ?? {}),
      }}
    />
  );
}
