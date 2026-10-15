import { useCallback, useState } from "react";
import { Pressable as RNPressable, View, type GestureResponderEvent } from "react-native";
import { useColorScheme } from "nativewind";
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { mobileRoles } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses as k } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { cn } from "@vedic-patro/domain/utils";
import { useD1Chart, type D1DrishtiPanel } from "@vedic-patro/features/kundali";
import type { D1ChartProps } from "../contract";
import { iconX } from "../icons";
import { BhavaDetailDialog } from "./BhavaDetail";

/** react-native-svg's web types (picked up through `moduleSuffixes`) describe `onPress` with an unsatisfiable type; the cast is the narrow workaround. */
function svgPress(handler: (() => void) | undefined): any {
  return handler;
}

function pointInPolygon(x: number, y: number, pts: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 6;
  const spread = Math.PI / 7;
  const p1x = x2 - size * Math.cos(angle - spread);
  const p1y = y2 - size * Math.sin(angle - spread);
  const p2x = x2 - size * Math.cos(angle + spread);
  const p2y = y2 - size * Math.sin(angle + spread);
  return `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`;
}

function DrishtiPanel({ panel, onClose }: { panel: D1DrishtiPanel; onClose: () => void }) {
  const badge = panel.isMalefic ? "border-destructive/20 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/15";
  const text = panel.isMalefic ? "text-destructive" : "text-emerald-700";
  return (
    <Box className="mx-auto mt-3 w-full max-w-[340px] gap-2">
      <Box nativeClassName="flex-row" className="items-center justify-between gap-2">
        <Text className={k.prose.heading}>{panel.title}</Text>
        <Pressable label={panel.closeLabel} onPress={onClose}>
          <Icon node={iconX} size={14} tone="muted" />
        </Pressable>
      </Box>
      <Box className={k.parts.aspectCard}>
        <Box nativeClassName="flex-row" className={k.parts.aspectHead}>
          <Text className={k.prose.heading}>{panel.effectLabel}</Text>
          <Text className={cn(k.parts.statusBadge, badge, text)}>{panel.badge}</Text>
        </Box>
        <Text className={k.prose.body}>{panel.summary}</Text>
      </Box>
    </Box>
  );
}

export function D1Chart({ houses, size, renderMarks }: D1ChartProps) {
  const chart = useD1Chart(houses);
  const { cells, togglePlanet, setOpenHouse } = chart;
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const [chartSize, setChartSize] = useState(0);

  /* One tap handler for the whole chart: a graha glyph under the finger opens
     its aspect panel, anywhere else in a house opens that house's detail sheet.
     SVG-level onPress is unreliable on iOS for transparent shapes. */
  const onChartPress = useCallback(
    (e: GestureResponderEvent) => {
      if (chartSize <= 0) return;
      const scale = 300 / chartSize;
      const x = e.nativeEvent.locationX * scale;
      const y = e.nativeEvent.locationY * scale;

      let best: { key: string; house: number; isClickable: boolean } | undefined;
      let bestD = Infinity;
      for (const cell of cells) {
        for (const planet of cell.planets) {
          const d = Math.hypot(planet.x - x, planet.haloY - y);
          if (d <= Math.max(planet.fontSize * 0.9, 12) && d < bestD) {
            best = { key: planet.key, house: cell.house, isClickable: planet.isClickable };
            bestD = d;
          }
        }
      }
      if (best?.isClickable) {
        togglePlanet(best.key, best.house);
        return;
      }
      for (const cell of cells) {
        if (cell.hasData && pointInPolygon(x, y, cell.points)) {
          setOpenHouse(cell.house);
          return;
        }
      }
    },
    [chartSize, cells, togglePlanet, setOpenHouse],
  );

  /* On a wide column (iPad) the viewBox scales up and the text with it. Past
     phone width, hold the rendered size of the text instead. */
  const wide = chartSize > 380;
  const houseLabelSize = wide ? (13 * 300) / chartSize : 14;
  const glyphCap = wide ? (15 * 300) / chartSize : Infinity;

  /* Square, and the full width of the column (or `size` when given): an
     aspectRatio box uses the width it has instead of letterboxing. */
  return (
    <View className="w-full items-center">
      <RNPressable
        onPress={onChartPress}
        onLayout={(e) => setChartSize(e.nativeEvent.layout.width)}
        accessibilityRole="button"
        style={{ width: size ?? "100%", maxWidth: 520, aspectRatio: 1 }}
      >
        <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 300 300" accessibilityLabel={chart.ariaLabel}>
          <Rect x={0} y={0} width={300} height={300} rx={4} fill={roles.background} fillOpacity={0.6} stroke={roles.border} strokeWidth={1.5} />
          <Line x1={0} y1={0} x2={300} y2={300} stroke={roles.border} strokeOpacity={0.8} strokeWidth={1.25} />
          <Line x1={300} y1={0} x2={0} y2={300} stroke={roles.border} strokeOpacity={0.8} strokeWidth={1.25} />
          <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={roles.border} strokeOpacity={0.8} strokeWidth={1.25} />
          {cells.map((cell) => (
            <G key={cell.house}>
              <Polygon points={cell.svgPoints} fill="transparent" onPress={svgPress(cell.hasData ? () => setOpenHouse(cell.house) : undefined)} />
              {cell.isLagna ? <Polygon points={cell.svgPoints} fill={roles.secondary} fillOpacity={0.15} /> : null}
              {cell.isAspected ? <Polygon points={cell.svgPoints} fill={roles.secondary} fillOpacity={0.1} /> : null}
              {cell.label ? (
                <SvgText
                  x={cell.cx}
                  y={cell.labelY}
                  textAnchor="middle"
                  fill={cell.isLagna ? roles.secondary : roles.mutedForeground}
                  fontSize={houseLabelSize}
                  fontWeight="600"
                  onPress={svgPress(() => setOpenHouse(cell.house))}
                >
                  {cell.label}
                </SvgText>
              ) : null}
              {cell.planets.map((planet) => {
                const onPlanetPress = planet.isClickable ? () => togglePlanet(planet.key, cell.house) : undefined;
                return (
                  <G key={planet.key}>
                    {/* A leaf-level touch target sized to the glyph: it wins over the house polygon by z-order. */}
                    <Circle
                      cx={planet.x}
                      cy={planet.haloY}
                      r={planet.fontSize * 0.9}
                      fill={planet.isSelected ? roles.secondary : "transparent"}
                      fillOpacity={planet.isSelected ? 0.2 : 1}
                      onPress={svgPress(onPlanetPress)}
                    />
                    <SvgText
                      x={planet.x}
                      y={planet.y}
                      textAnchor="middle"
                      fill={planet.isSelected ? roles.secondary : roles.foreground}
                      fontSize={Math.min(planet.fontSize, glyphCap)}
                      fontWeight={planet.isSelected ? "700" : "400"}
                      onPress={svgPress(onPlanetPress)}
                    >
                      {planet.abbr}
                    </SvgText>
                    {renderMarks({
                      planetKey: planet.key,
                      isRetrograde: planet.isRetrograde,
                      isCombust: planet.isCombust,
                      x: planet.markX,
                      y: planet.markY,
                      size: planet.markSize,
                    })}
                  </G>
                );
              })}
            </G>
          ))}
          {chart.arrows.map((arrow) => (
            <G key={arrow.key}>
              <Line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke={roles.secondary} strokeWidth={1.5} strokeOpacity={0.85} />
              <Polygon points={arrowHead(arrow.x1, arrow.y1, arrow.x2, arrow.y2)} fill={roles.secondary} fillOpacity={0.85} />
            </G>
          ))}
        </Svg>
      </RNPressable>
      {chart.drishti ? <DrishtiPanel panel={chart.drishti} onClose={chart.clearSelected} /> : null}
      <BhavaDetailDialog houses={houses} houseNumber={chart.openHouse} reference={chart.reference} onClose={chart.closeHouse} />
    </View>
  );
}
