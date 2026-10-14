import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { useSunriseD1Chart } from "@vedic-patro/features/panchanga";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

type Props = {
  p: PanchangaDay;
};

export function SunriseD1ChartPanel({ p }: Props) {
  const chart = useSunriseD1Chart(p);
  if (!chart) return null;

  return (
    <View className={panchangaPageClasses.aside.card}>
      <Text className={panchangaPageClasses.aside.eyebrow}>{chart.title}</Text>
      <Text className={panchangaPageClasses.aside.anchor}>{chart.anchor}</Text>
      <View className={panchangaPageClasses.aside.body}>
        <D1Chart houses={chart.houses} />
      </View>
    </View>
  );
}
