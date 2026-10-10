import { useMemo } from "react";
import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { useLocale } from "@/lib/i18n";
import { buildPanchangaD1Houses } from "@/lib/panchanga-sunrise-d1";
import { getPlanetsAnchorLabel } from "@/lib/panchanga-format";

type Props = {
  p: PanchangaDay;
};

export function SunriseD1ChartPanel({ p }: Props) {
  const { pick } = useLocale();
  const houses = useMemo(() => buildPanchangaD1Houses(p), [p]);
  const anchor = getPlanetsAnchorLabel(p);

  if (!houses) return null;

  return (
    <View className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <Text className="text-caption font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {pick("D1 चक्र", "D1 chart")}
      </Text>
      <Text className="text-body mt-1 text-muted-foreground">{anchor}</Text>
      <View className="mt-2">
        <D1Chart houses={houses} />
      </View>
    </View>
  );
}
