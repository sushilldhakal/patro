import { Stack } from "expo-router";
import { useRailPageAnimation } from "@/components/panchanga/PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";
import { crossTabBackListeners } from "@/lib/cross-tab-back";

export default function LearnLayout() {
  const colors = useThemeColors();
  const fade = useRailPageAnimation();
  return (
    <Stack
      screenListeners={crossTabBackListeners("/learn")}
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.background },
        ...(fade ?? {}),
      }}
    />
  );
}
