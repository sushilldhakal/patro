import { useCallback, useState } from "react";
import { Pressable, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { GrahaStatusMarksSvg } from "@/components/graha/GrahaStatusMarksSvg";
import { Text } from "@/components/ui/Text";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { useD1Chart, type D1DrishtiPanel } from "@vedic-patro/features/kundali";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import { BhavaDetailDialog } from "@/components/kundali/BhavaDetailDialog";

type Props = {
  houses: BhavaHouse[];
};

/**
 * Under plain `tsc` this project's `moduleSuffixes` (".web" first) resolves
 * react-native-svg's *web* type declarations even for this native-only file,
 * and those describe `onPress` with a broken, un-satisfiable intersection
 * type. There's no typecheck script in this repo's CI today; casting here is
 * the narrow, contained workaround rather than fighting the wrong platform's
 * types or touching the project-wide tsconfig.
 */
function svgOnPress(handler: (() => void) | undefined): any {
  return handler;
}

/** Small filled triangle at (x2,y2), pointing away from (x1,y1) — a manual
 * arrowhead since react-native-svg's <Marker>/<Defs> hit the same type-only
 * resolution problem as onPress above, with no existing usage in this
 * codebase to mirror. */
function arrowHeadPoints(x1: number, y1: number, x2: number, y2: number, size = 6): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  const p1x = x2 - size * Math.cos(angle - spread);
  const p1y = y2 - size * Math.sin(angle - spread);
  const p2x = x2 - size * Math.cos(angle + spread);
  const p2y = y2 - size * Math.sin(angle + spread);
  return `${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`;
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

function DrishtiPanel({ panel, onClose }: { panel: D1DrishtiPanel; onClose: () => void }) {
  const { lang } = useLocale();
  const small = lang === "en" ? undefined : nepaliTextStyle(12);

  return (
    <View className="mt-3 w-full gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm flex-1 font-semibold text-foreground" style={small}>
          {panel.title}
        </Text>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={panel.closeLabel}
          className="h-7 w-7 items-center justify-center rounded-full bg-muted/60"
        >
          <Text className="text-sm text-muted-foreground">✕</Text>
        </Pressable>
      </View>
      <View
        className={cn(
          "rounded-lg border p-3",
          panel.isMalefic ? "border-destructive/20 bg-destructive/10" : "border-emerald-500/20 bg-emerald-500/10",
        )}
      >
        <View className="mb-1.5 flex-row items-center justify-between gap-2">
          <Text className="text-sm font-semibold text-foreground">{panel.effectLabel}</Text>
          <View
            className={cn(
              "rounded-full border px-2 py-0.5",
              panel.isMalefic ? "border-destructive/30 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/15",
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                panel.isMalefic ? "text-destructive" : "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {panel.badge}
            </Text>
          </View>
        </View>
        <Text className="text-sm leading-relaxed" style={small}>
          {panel.summary}
        </Text>
      </View>
    </View>
  );
}

export function D1Chart({ houses }: Props) {
  const { isTablet } = useBreakpoint();
  const colors = useThemeColors();
  const chart = useD1Chart(houses);
  const { cells, togglePlanet, setOpenHouse } = chart;
  const [chartSize, setChartSize] = useState(0);

  /* One tap handler for the whole चक्र: a graha glyph under the finger opens
     its aspect panel, anywhere else in a house opens that house's detail
     sheet. SVG-level onPress is unreliable on iOS for transparent shapes. */
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

  /* On a wide column (iPad) the viewBox is scaled up, and the text with it —
     the rashi labels and graha glyphs ballooned. Past phone width, hold the
     rendered size of the text instead of letting it grow with the chart. */
  const wide = chartSize > 380;
  const houseLabelSize = wide ? (13 * 300) / chartSize : 15;
  const glyphCap = wide ? (15 * 300) / chartSize : Infinity;

  /* Square, and the full width of the column. `height={280}` against a
     viewBox 300 units square letterboxed the चक्र: `meet` scales by the
     smaller ratio, so on a ~340 px phone column the whole chart — glyphs
     included — was drawn at 0.93, and a crowded house's already-small text
     shrank again on the way to the screen. An `aspectRatio` box lets it use
     the width it has. */
  return (
    <View className="w-full items-center">
    <Pressable
      onPress={onChartPress}
      onLayout={(e) => setChartSize(e.nativeEvent.layout.width)}
      accessibilityRole="button"
      style={{ width: isTablet ? "90%" : "100%", aspectRatio: 1 }}
    >
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 300 300" accessibilityLabel={chart.ariaLabel}>
        <Rect x={0} y={0} width={300} height={300} rx={4} fill={colors.card} stroke={colors.border} strokeWidth={1.5} />
        <Line x1={0} y1={0} x2={300} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
        <Line x1={300} y1={0} x2={0} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
        <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={colors.border} strokeWidth={1.25} opacity={0.8} />

        {cells.map((cell) => (
          <G key={cell.house}>
            {/* Leaf-level touch target for the whole house. Deliberately
                not relying on G-level press bubbling or stopPropagation —
                both are flaky on react-native-svg. Planets render on top
                with their own onPress and win the touch at their exact
                pixels via normal topmost-shape hit testing. */}
            <Polygon
              points={cell.svgPoints}
              fill="transparent"
              onPress={svgOnPress(cell.hasData ? () => setOpenHouse(cell.house) : undefined)}
            />
            {cell.isLagna ? (
              <Polygon points={cell.svgPoints} fill={colors.secondary} opacity={0.15} />
            ) : null}
            {cell.isAspected ? (
              <Polygon points={cell.svgPoints} fill={colors.secondary} opacity={0.08} />
            ) : null}
            {cell.label ? (
              <SvgText
                x={cell.cx}
                y={cell.labelY}
                fill={cell.isLagna ? colors.secondary : colors.mutedForeground}
                fontSize={houseLabelSize}
                fontWeight="600"
                textAnchor="middle"
                onPress={svgOnPress(() => setOpenHouse(cell.house))}
              >
                {cell.label}
              </SvgText>
            ) : null}
            {cell.planets.map((planet) => {
              const onPlanetPress = planet.isClickable ? () => togglePlanet(planet.key, cell.house) : undefined;
              return (
                <G key={planet.key}>
                  {/* Generous invisible touch target sized to the glyph —
                      a leaf shape so it wins the touch over the house
                      polygon underneath via z-order, no propagation needed. */}
                  <Circle
                    cx={planet.x}
                    cy={planet.haloY}
                    r={planet.fontSize * 0.9}
                    fill={planet.isSelected ? colors.secondary : "transparent"}
                    opacity={planet.isSelected ? 0.2 : 1}
                    onPress={svgOnPress(onPlanetPress)}
                  />
                  <SvgText
                    x={planet.x}
                    y={planet.y}
                    fill={planet.isSelected ? colors.secondary : colors.foreground}
                    fontSize={Math.min(planet.fontSize, glyphCap)}
                    fontWeight={planet.isSelected ? "700" : "400"}
                    textAnchor="middle"
                    onPress={svgOnPress(onPlanetPress)}
                  >
                    {planet.abbr}
                  </SvgText>
                  <GrahaStatusMarksSvg
                    planetKey={planet.key}
                    isRetrograde={planet.isRetrograde}
                    isCombust={planet.isCombust}
                    x={planet.markX}
                    y={planet.markY}
                    size={planet.markSize}
                    vakriColor={colors.secondary}
                    astaColor={colors.danger}
                  />
                </G>
              );
            })}
          </G>
        ))}

        {chart.arrows.map((a) => (
          <G key={a.key}>
            <Line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={colors.secondary} strokeWidth={1.5} opacity={0.85} />
            <Polygon points={arrowHeadPoints(a.x1, a.y1, a.x2, a.y2)} fill={colors.secondary} opacity={0.85} />
          </G>
        ))}
      </Svg>
    </Pressable>
      {chart.drishti ? <DrishtiPanel panel={chart.drishti} onClose={chart.clearSelected} /> : null}
      <BhavaDetailDialog
        houses={houses}
        houseNumber={chart.openHouse}
        reference={chart.reference}
        onClose={chart.closeHouse}
      />
    </View>
  );
}
