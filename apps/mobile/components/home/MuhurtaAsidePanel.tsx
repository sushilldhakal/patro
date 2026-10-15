import { useRouter } from "expo-router";
import type { PanchangaDay } from "@/lib/api";
import { Ionicons } from "@/components/icons/Ionicons";
import { elementHref } from "@/lib/element-routes";
import { useThemeColors } from "@/lib/theme-context";
import { MuhurtaAsidePanel as View } from "@vedic-patro/ui/kit/shell";

/** Hint icon and the full-table route stay here. The panel is `@vedic-patro/ui/kit/shell`. */
export function MuhurtaAsidePanel({ p }: { p: PanchangaDay }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <View
      p={p}
      hintIcon={<Ionicons name="information-circle-outline" size={13} color={colors.foreground} />}
      onOpenTable={(id) => router.push(elementHref(id) as never)}
    />
  );
}
