import { Stack } from "expo-router";
import { useRailPageAnimation } from "@/components/panchanga/PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";
import { crossTabBackListeners } from "@/lib/cross-tab-back";

export default function KundaliLayout() {
  const colors = useThemeColors();
  const fade = useRailPageAnimation();
  return (
    <Stack
      screenListeners={crossTabBackListeners("/kundali")}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        ...(fade ?? {}),
      }}
    />
  );
}
