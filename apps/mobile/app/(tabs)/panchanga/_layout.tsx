import { Stack } from "expo-router";
import { useRailPageAnimation } from "@/components/panchanga/PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";

/**
 * Shell sidebar is provided by `PanchangaTabsShell` in `(tabs)/_layout.tsx`. The tab holds only the
 * daily page: every other panchanga page is in the root stack (app/panchanga), so it opens over
 * whatever it was opened from and a swipe back shows that page.
 */
export default function PanchangaLayout() {
  const colors = useThemeColors();
  const fade = useRailPageAnimation();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Opaque: a transparent screen lets the page being left show through
        // (overlapping) until the new one has painted its content.
        contentStyle: { backgroundColor: colors.background, flex: 1 },
        ...(fade ?? {}),
      }}
    />
  );
}
