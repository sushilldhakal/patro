import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { Text } from "@vedic-patro/ui";
import { illustration, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { eotEarly, eotLate } from "@vedic-patro/design-tokens/classes/learn/diagram-colors";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { EOT_H, EOT_W, formatDuration, layoutEotGraph } from "@vedic-patro/domain/learn/eot-graph";
import { useLocale } from "@vedic-patro/i18n/react";
import type { EotGraphProps } from "../contract";

const NOW = illustration.sky53;
const GRID = illustration.sky29;

export function EotGraph({ eccentricity, tilt, dayOfYear, daysPerYear }: EotGraphProps) {
  const { t, lang, digits } = useLocale();
  const model = useMemo(
    () => layoutEotGraph(eccentricity, tilt, dayOfYear, daysPerYear, lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE),
    [eccentricity, tilt, dayOfYear, daysPerYear, lang],
  );
  const legend = [
    { color: NOW, label: t("panchanga.day_cycle.now") },
    { color: eotLate, label: t("learn.study.eot.sundial_late") },
    { color: eotEarly, label: t("learn.study.eot.sundial_early") },
  ];

  return (
    <View className="w-full">
      <View className="mb-1.5 flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {legend.map((item) => (
          <View key={item.label} className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-md" style={{ backgroundColor: item.color }} />
            <Text className="text-caption text-white/80">{item.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ width: "100%", aspectRatio: EOT_W / EOT_H }}>
        <Svg viewBox={`0 0 ${EOT_W} ${EOT_H}`} width="100%" height="100%" accessibilityRole="image" accessibilityLabel={t("learn.study.eot.aria")}>
          {model.ticks.map((tick) => (
            <G key={tick.sec}>
              <Line x1={tick.x} x2={tick.x} y1={model.plotT} y2={model.plotB} stroke={GRID} strokeOpacity={tick.zero ? 0.85 : 0.45} strokeWidth={tick.zero ? 1 : 0.6} />
              <SvgText x={tick.x} y={EOT_H - 8} textAnchor="middle" fontSize={15} fill={wheel.ink} fillOpacity={0.55}>
                {formatDuration(tick.sec, digits)}
              </SvgText>
            </G>
          ))}
          {model.months.map((month) => (
            <G key={month.key}>
              <Line
                x1={model.plotL}
                x2={model.plotR}
                y1={month.y}
                y2={month.y}
                stroke={GRID}
                strokeOpacity={month.edge ? 0.7 : 0.45}
                strokeWidth={month.strong ? 1 : 0.6}
              />
              <SvgText
                x={model.plotL - 6}
                y={month.y + 3}
                textAnchor="end"
                fontSize={15}
                fill={wheel.ink}
                fillOpacity={month.active ? 0.95 : 0.5}
                fontWeight={month.active ? "700" : "400"}
              >
                {month.name}
              </SvgText>
            </G>
          ))}
          <Path d={model.latePath} fill={eotLate} />
          <Path d={model.earlyPath} fill={eotEarly} />
          <Line x1={model.plotL} x2={model.plotR} y1={model.markerY} y2={model.markerY} stroke={withAlpha(neutral.white, 0.4)} strokeWidth={1} />
          <Circle cx={model.markerX} cy={model.markerY} r={5} fill={NOW} />
        </Svg>
      </View>
      <Text className="mt-1.5 text-caption text-white/50">{t("learn.study.eot.caption")}</Text>
    </View>
  );
}
