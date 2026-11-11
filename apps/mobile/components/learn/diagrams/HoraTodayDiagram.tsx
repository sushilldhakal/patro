import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useTodayPanchanga } from "@/lib/learn/hora-live";
import { HoraRing } from "@/components/learn/studies/HoraRingFigure";

/**
 * Today's hora wheel for the Hora chapter — the website's `HoraLiveDiagram`:
 * today's panchanga for the chosen place, drawn as the week-long hora ring.
 */
export function HoraTodayDiagram() {
  const { t } = useLocale();
  const { p, timezone } = useTodayPanchanga();
  if (!p) {
    return (
      <View className="my-4 min-h-[200px] items-center justify-center rounded-2xl border border-border bg-card">
        <Text className="text-sm text-muted-foreground">{t("rashifal.profile.loading")}</Text>
      </View>
    );
  }
  return <HoraRing p={p} isToday timezone={timezone} />;
}
