import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme-context";

/** Shell sidebar is provided by `PanchangaTabsShell` in `(tabs)/_layout.tsx`. */
export default function PanchangaLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Opaque: a transparent screen lets the page being left show through
        // (overlapping) until the new one has painted its content.
        contentStyle: { backgroundColor: colors.background, flex: 1 },
      }}
    />
  );
}
