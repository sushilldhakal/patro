import { useState } from "react";
import { View, type GestureResponderEvent } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";

export type ChartSeries = { label: string; color: string; values: number[] };

const PAD_TOP = 12;
const PAD_BOTTOM = 8;
/** The price labels' column on the right, so they never sit on the line. */
const GUTTER = 64;

/**
 * A price line chart for the forex and gold/silver pages, on react-native-svg (no native module
 * beyond the app's own). One line per series over the same days, a soft fill under the first, three
 * gridlines with their values, and a crosshair while a finger is on it showing that day's values.
 */
export function RateChart({
  labels,
  series,
  format,
  height = 200,
}: {
  /** One label per point (the day), oldest first. */
  labels: string[];
  series: ChartSeries[];
  format: (v: number) => string;
  height?: number;
}) {
  const colors = useThemeColors();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const n = labels.length;
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  if (n === 0 || all.length === 0) return null;

  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo || Math.max(1, Math.abs(hi) * 0.01);
  const min = lo - span * 0.12;
  const max = hi + span * 0.12;
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const plotW = Math.max(1, width - GUTTER);
  const x = (i: number) => (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * plotH;
  const path = (values: number[]) =>
    values
      .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");
  const grid = [hi, (hi + lo) / 2, lo];

  const pick = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    const i =
      n === 1
        ? 0
        : Math.round(
            (Math.min(e.nativeEvent.locationX, plotW) / plotW) * (n - 1),
          );
    setActive(Math.max(0, Math.min(n - 1, i)));
  };
  const shown = active ?? n - 1;
  const first = series[0]!;

  return (
    <View className="gap-2">
      <View className="min-h-11 flex-row flex-wrap items-end gap-x-4">
        <Text className="text-xs text-muted-foreground">{labels[shown]}</Text>
        {series.map((s) => (
          <View key={s.label} className="flex-row items-center gap-1.5">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <Text className="text-xs text-muted-foreground">{s.label}</Text>
            <Text className="text-base font-bold tabular-nums text-foreground">
              {format(s.values[shown]!)}
            </Text>
          </View>
        ))}
      </View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
        accessibilityLabel={series
          .map((s) => `${s.label} ${format(s.values[n - 1]!)}`)
          .join(", ")}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="rate-fill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={first.color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={first.color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {grid.map((g, i) => (
              <Line
                key={i}
                x1={0}
                x2={plotW}
                y1={y(g)}
                y2={y(g)}
                stroke={colors.border}
                strokeDasharray="4 6"
                strokeWidth={1}
              />
            ))}
            {n > 1 ? (
              <Path
                d={`${path(first.values)} L${x(n - 1)},${height - PAD_BOTTOM} L${x(0)},${height - PAD_BOTTOM} Z`}
                fill="url(#rate-fill)"
              />
            ) : null}
            {series.map((s) =>
              n > 1 ? (
                <Path
                  key={s.label}
                  d={path(s.values)}
                  stroke={s.color}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null,
            )}
            {active !== null ? (
              <Line
                x1={x(active)}
                x2={x(active)}
                y1={PAD_TOP}
                y2={height - PAD_BOTTOM}
                stroke={colors.mutedForeground}
                strokeWidth={1}
              />
            ) : null}
            {series.map((s) => (
              <Circle
                key={s.label}
                cx={x(shown)}
                cy={y(s.values[shown]!)}
                r={5}
                fill={s.color}
                stroke={colors.card}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}
        {width > 0
          ? grid.map((g, i) => (
              <Text
                key={i}
                className="absolute text-xs tabular-nums text-muted-foreground"
                style={{ top: y(g) - 9, left: plotW + 6, width: GUTTER - 6 }}
                numberOfLines={1}
              >
                {format(g)}
              </Text>
            ))
          : null}
      </View>
      <View
        className="flex-row justify-between"
        style={{ paddingRight: GUTTER }}
      >
        <Text className="text-xs text-muted-foreground">{labels[0]}</Text>
        {n > 1 ? (
          <Text className="text-xs text-muted-foreground">{labels[n - 1]}</Text>
        ) : null}
      </View>
    </View>
  );
}
