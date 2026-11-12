import { useMemo, useState } from "react";
import { View, useWindowDimensions, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { useColorScheme } from "nativewind";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { sunTimesClasses as sun } from "@vedic-patro/design-tokens/classes/sun-times-classes";
import { nearestDaylightPoint, type SunDaylightChartView } from "@vedic-patro/features/sun-times";
import { Box, Text } from "@vedic-patro/ui";
import type { SunTimesDaylightChartProps } from "../contract";

function ChartSvg({
  chart,
  width,
  active,
  onHover,
  colors,
}: {
  chart: SunDaylightChartView;
  width: number;
  active: ReturnType<typeof nearestDaylightPoint>;
  onHover: (x: number | null) => void;
  colors: ReturnType<typeof mobileRoles>;
}) {
  const height = width * (chart.height / chart.width);
  const toChartX = (locX: number) => (locX / Math.max(1, width)) * chart.width;

  const onGrant = (e: GestureResponderEvent) => {
    onHover(toChartX(e.nativeEvent.locationX));
  };
  const onMove = (e: GestureResponderEvent) => {
    onHover(toChartX(e.nativeEvent.locationX));
  };

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      accessibilityLabel={chart.aria}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={() => onHover(null)}
      onResponderTerminate={() => onHover(null)}
    >
      <Path d={chart.bandPath} fill={colors.accent} fillOpacity={0.18} />
      <Path d={chart.risePath} stroke={colors.accent} strokeWidth={1.75} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Path d={chart.setPath} stroke={colors.danger} strokeWidth={1.75} fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {chart.yTicks.map((tick) => (
        <SvgText key={`y-${tick.y}`} x={chart.plot.x - 8} y={tick.y + 3} textAnchor="end" fill={colors.mutedForeground} fontSize={9}>
          {tick.label}
        </SvgText>
      ))}
      {chart.yTicks.map((tick) => (
        <Line
          key={`yg-${tick.y}`}
          x1={chart.plot.x}
          y1={tick.y}
          x2={chart.plot.x + chart.plot.w}
          y2={tick.y}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.7}
        />
      ))}

      <Path d={chart.lengthAreaPath} fill={colors.primary} fillOpacity={0.12} />
      <Path d={chart.lengthPath} stroke={colors.primary} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {chart.lengthTicks.map((tick) => (
        <SvgText key={`l-${tick.y}`} x={chart.lengthPlot.x - 8} y={tick.y + 3} textAnchor="end" fill={colors.mutedForeground} fontSize={8}>
          {tick.label}
        </SvgText>
      ))}

      {chart.xTicks.map((tick) => (
        <SvgText key={`x-${tick.x}-${tick.label}`} x={tick.x} y={chart.height - 8} textAnchor="middle" fill={colors.mutedForeground} fontSize={9}>
          {tick.label}
        </SvgText>
      ))}

      {chart.markers.map((m) => {
        const fill =
          m.kind === "uttarayana" ? colors.accent : m.kind === "dakshinayana" ? colors.danger : colors.primary;
        return (
          <G key={m.kind}>
            <Line
              x1={m.x}
              y1={chart.plot.y}
              x2={m.x}
              y2={chart.lengthPlot.y + chart.lengthPlot.h}
              stroke={m.kind === "uttarayana" || m.kind === "dakshinayana" ? colors.foreground : colors.mutedForeground}
              strokeWidth={1.2}
              strokeDasharray={m.kind === "uttarayana" || m.kind === "dakshinayana" ? "5 3" : "2 3"}
              opacity={0.55}
            />
            <Circle cx={m.x} cy={m.y} r={m.kind === "uttarayana" || m.kind === "dakshinayana" ? 4 : 3.4} fill={fill} stroke={colors.background} strokeWidth={1.25} />
            <SvgText x={m.x} y={m.labelY} textAnchor="middle" fill={fill} fontSize={9} fontWeight="700">
              {m.short}
            </SvgText>
          </G>
        );
      })}

      {chart.todayIndex != null && chart.points[chart.todayIndex] ? (
        <Line
          x1={chart.points[chart.todayIndex]!.x}
          y1={chart.plot.y}
          x2={chart.points[chart.todayIndex]!.x}
          y2={chart.lengthPlot.y + chart.lengthPlot.h}
          stroke={colors.foreground}
          strokeWidth={1.25}
          strokeDasharray="4 3"
          opacity={0.45}
        />
      ) : null}

      {active ? (
        <>
          <Line
            x1={active.x}
            y1={chart.plot.y}
            x2={active.x}
            y2={chart.lengthPlot.y + chart.lengthPlot.h}
            stroke={colors.foreground}
            strokeWidth={1.25}
            opacity={0.7}
          />
          <Circle cx={active.x} cy={active.riseY} r={3.2} fill={colors.accent} />
          <Circle cx={active.x} cy={active.setY} r={3.2} fill={colors.danger} />
          <Circle cx={active.x} cy={active.lengthY} r={3} fill={colors.primary} />
        </>
      ) : null}
    </Svg>
  );
}

/** Year sunrise/sunset band + day-length strip from `page.daylightChart`. */
export function SunTimesDaylightChart({ chart, className }: SunTimesDaylightChartProps) {
  const { colorScheme } = useColorScheme();
  const colors = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const { width: windowW } = useWindowDimensions();
  const [wrapW, setWrapW] = useState(0);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const active = useMemo(() => (chart && hoverX != null ? nearestDaylightPoint(chart, hoverX) : null), [chart, hoverX]);
  const chartW = wrapW > 0 ? wrapW : Math.max(280, windowW - 32);

  if (!chart) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    setWrapW((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  };

  return (
    <Box className={cn(sun.chartCard, sun.chartClip, className)}>
      <Box className={sun.chartHead}>
        <Text className={sun.chartTitle}>{chart.title}</Text>
        <Text className={sun.chartSub}>{chart.subtitle}</Text>
      </Box>

      {/* Plain View: the kit Box takes no onLayout, and the SVG needs the measured width. */}
      <View className={sun.chartSvgWrap} onLayout={onLayout}>
        <ChartSvg chart={chart} width={chartW} active={active} onHover={setHoverX} colors={colors} />
      </View>

      <Box className={cn("flex-row flex-wrap", sun.chartLegend)}>
        <Box className={cn("flex-row", sun.chartLegendItem)}>
          <View className={sun.chartLegendSwatch} style={{ backgroundColor: colors.accent }} />
          <Text className={sun.chartLegendLabel}>{chart.riseLegend}</Text>
        </Box>
        <Box className={cn("flex-row", sun.chartLegendItem)}>
          <View className={sun.chartLegendSwatch} style={{ backgroundColor: colors.danger }} />
          <Text className={sun.chartLegendLabel}>{chart.setLegend}</Text>
        </Box>
        <Box className={cn("flex-row", sun.chartLegendItem)}>
          <View className={sun.chartLegendSwatch} style={{ backgroundColor: colors.primary }} />
          <Text className={sun.chartLegendLabel}>{chart.lengthLegend}</Text>
        </Box>
      </Box>

      {active ? (
        <Box className={sun.chartScrub}>
          <Text className={sun.chartScrubDay}>{active.dayLabel}</Text>
          <Text className={sun.chartScrubMeta}>
            ↑ {active.sunriseLabel} · ↓ {active.sunsetLabel} · {chart.lengthLegend} {active.dayLengthLabel}
          </Text>
        </Box>
      ) : null}

      <Box className={cn("flex-row flex-wrap", sun.chartStats)}>
        <Box className={sun.chartStat}>
          <Text className={sun.chartStatLabel}>{chart.longestLabel}</Text>
          <Text className={sun.chartStatValue}>{chart.longest.dayLengthLabel}</Text>
          <Text className={sun.chartStatMeta}>
            {chart.longest.dayLabel} · ↑ {chart.longest.sunriseLabel} ↓ {chart.longest.sunsetLabel}
          </Text>
        </Box>
        <Box className={sun.chartStat}>
          <Text className={sun.chartStatLabel}>{chart.shortestLabel}</Text>
          <Text className={sun.chartStatValue}>{chart.shortest.dayLengthLabel}</Text>
          <Text className={sun.chartStatMeta}>
            {chart.shortest.dayLabel} · ↑ {chart.shortest.sunriseLabel} ↓ {chart.shortest.sunsetLabel}
          </Text>
        </Box>
        <Box className={sun.chartStat}>
          <Text className={sun.chartStatLabel}>{chart.spanLegend}</Text>
          <Text className={sun.chartStatValue}>{chart.spanLabel}</Text>
        </Box>
      </Box>

      {chart.markers.length > 0 ? (
        <Box className={sun.chartMarkers}>
          <Text className={sun.chartMarkersTitle}>{chart.markersLegend}</Text>
          <Box className={cn("flex-row flex-wrap", sun.chartMarkersRow)}>
            {chart.markers.map((m) => (
              <Box key={m.kind} className={sun.chartMarkerItem}>
                <Text className={sun.chartMarkerName}>
                  {m.short} · {m.label}
                </Text>
                <Text className={sun.chartMarkerMeta}>
                  {m.dayLabel} · {m.dayLengthLabel}
                </Text>
                <Text className={sun.chartMarkerMeta}>{m.hint}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
