import { useMemo } from "react";
import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/panchanga/D1Chart";
import { useLocale } from "@/lib/i18n";
import { buildPanchangaD1Houses } from "@vedic-patro/domain/panchanga-sunrise-d1";
import { getPlanetsAnchorLabel } from "@vedic-patro/domain/panchanga-format";

import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";

type Props = {
  p: PanchangaDay;
};

export function SunriseD1ChartPanel({ p }: Props) {
  const { t } = useLocale();
  const houses = useMemo(() => buildPanchangaD1Houses(p), [p]);
  const anchor = getPlanetsAnchorLabel(p);

  if (!houses) return null;

  return (
    <View className={panchangaPageClasses.aside.card}>
      <Text className={panchangaPageClasses.aside.eyebrow}>
        {t("panchanga.d1_chart")}
      </Text>
      <Text className={panchangaPageClasses.aside.anchor}>{anchor}</Text>
      <View className={panchangaPageClasses.aside.body}>
        <D1Chart houses={houses} />
      </View>
    </View>
  );
}
