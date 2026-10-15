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

function svgPress(handler: (() => void) | undefined): any {
  return handler;
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
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const edge = size ?? 340;
  return (
    <Box className="w-full">
      <Svg width={edge} height={edge} viewBox="0 0 300 300" accessibilityLabel={chart.ariaLabel}>
        <Rect x={0} y={0} width={300} height={300} rx={4} fill={roles.background} fillOpacity={0.6} stroke={roles.border} strokeWidth={1.5} />
        <Line x1={0} y1={0} x2={300} y2={300} stroke={roles.border} strokeOpacity={0.8} strokeWidth={1.25} />
        <Line x1={300} y1={0} x2={0} y2={300} stroke={roles.border} strokeOpacity={0.8} strokeWidth={1.25} />
        <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={roles.border} strokeOpacity={0.8} strokeWidth={1.25} />
        {chart.cells.map((cell) => (
          <G key={cell.house} onPress={cell.hasData ? svgPress(() => chart.setOpenHouse(cell.house)) : undefined}>
            <Polygon points={cell.svgPoints} fill="transparent" />
            {cell.isLagna ? <Polygon points={cell.svgPoints} fill={roles.secondary} fillOpacity={0.15} /> : null}
            {cell.isAspected ? <Polygon points={cell.svgPoints} fill={roles.secondary} fillOpacity={0.1} /> : null}
            {cell.label ? (
              <SvgText x={cell.cx} y={cell.labelY} textAnchor="middle" fill={cell.isLagna ? roles.secondary : roles.mutedForeground} fontSize={14} fontWeight="600">
                {cell.label}
              </SvgText>
            ) : null}
            {cell.planets.map((planet) => (
              <G
                key={planet.key}
                onPress={planet.isClickable ? svgPress(() => chart.togglePlanet(planet.key, cell.house)) : undefined}
              >
                {planet.isSelected ? <Circle cx={planet.x} cy={planet.haloY} r={planet.fontSize * 0.85} fill={roles.secondary} fillOpacity={0.2} /> : null}
                <SvgText x={planet.x} y={planet.y} textAnchor="middle" fill={planet.isSelected ? roles.secondary : roles.foreground} fontSize={planet.fontSize} fontWeight={planet.isSelected ? "600" : "400"}>
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
            ))}
          </G>
        ))}
        {chart.arrows.map((arrow) => (
          <G key={arrow.key}>
            <Line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} stroke={roles.secondary} strokeWidth={1.5} strokeOpacity={0.85} />
            <Polygon points={arrowHead(arrow.x1, arrow.y1, arrow.x2, arrow.y2)} fill={roles.secondary} />
          </G>
        ))}
      </Svg>
      {chart.drishti ? <DrishtiPanel panel={chart.drishti} onClose={chart.clearSelected} /> : null}
      <BhavaDetailDialog houses={houses} houseNumber={chart.openHouse} reference={chart.reference} onClose={chart.closeHouse} />
    </Box>
  );
}
