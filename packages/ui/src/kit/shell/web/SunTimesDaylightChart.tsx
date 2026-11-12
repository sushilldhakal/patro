import { useCallback, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { sunTimesClasses as sun } from "@vedic-patro/design-tokens/classes/sun-times-classes";
import { nearestDaylightPoint, type SunDaylightChartView } from "@vedic-patro/features/sun-times";
import { Box, Text } from "@vedic-patro/ui";
import type { SunTimesDaylightChartProps } from "../contract";

function ChartSvg({
  chart,
  active,
  onHover,
}: {
  chart: SunDaylightChartView;
  active: ReturnType<typeof nearestDaylightPoint>;
  onHover: (x: number | null) => void;
}) {
  const onMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * chart.width;
      onHover(x);
    },
    [chart.width, onHover],
  );

  return (
    <svg
      viewBox={`0 0 ${chart.width} ${chart.height}`}
      className="h-auto w-full touch-pan-y"
      role="img"
      aria-label={chart.aria}
      onPointerMove={onMove}
      onPointerLeave={() => onHover(null)}
    >
      {/* Daylight band between sunrise and sunset */}
      <path d={chart.bandPath} className="fill-accent/15 dark:fill-accent/20" />
      <path d={chart.risePath} className="fill-none stroke-accent" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <path d={chart.setPath} className="fill-none stroke-destructive/90" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />

      {/* Clock-time ticks */}
      {chart.yTicks.map((tick) => (
        <g key={`y-${tick.y}`}>
          <line x1={chart.plot.x} y1={tick.y} x2={chart.plot.x + chart.plot.w} y2={tick.y} className="stroke-border/60" strokeWidth={1} strokeDasharray="3 4" />
          <text x={chart.plot.x - 8} y={tick.y + 3} textAnchor="end" className="fill-muted-foreground text-diagram-xs font-num">
            {tick.label}
          </text>
        </g>
      ))}

      {/* Day-length strip */}
      <path d={chart.lengthAreaPath} className="fill-primary/10 dark:fill-primary/15" />
      <path d={chart.lengthPath} className="fill-none stroke-primary" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      {chart.lengthTicks.map((tick) => (
        <g key={`l-${tick.y}`}>
          <line
            x1={chart.lengthPlot.x}
            y1={tick.y}
            x2={chart.lengthPlot.x + chart.lengthPlot.w}
            y2={tick.y}
            className="stroke-border/50"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <text x={chart.lengthPlot.x - 8} y={tick.y + 3} textAnchor="end" className="fill-muted-foreground text-diagram-xs font-num">
            {tick.label}
          </text>
        </g>
      ))}

      {/* Month ticks */}
      {chart.xTicks.map((tick) => (
        <g key={`x-${tick.x}-${tick.label}`}>
          <line x1={tick.x} y1={chart.plot.y} x2={tick.x} y2={chart.lengthPlot.y + chart.lengthPlot.h} className="stroke-border/40" strokeWidth={1} />
          <text x={tick.x} y={chart.height - 8} textAnchor="middle" className="fill-muted-foreground text-diagram-xs">
            {tick.label}
          </text>
        </g>
      ))}

      {/* Season hinges: उत्तरायण / दक्षिणायन / वसन्त / हेमन्त */}
      {chart.markers.map((m) => (
        <g key={m.kind}>
          <line
            x1={m.x}
            y1={chart.plot.y}
            x2={m.x}
            y2={chart.lengthPlot.y + chart.lengthPlot.h}
            className={
              m.kind === "uttarayana" || m.kind === "dakshinayana"
                ? "stroke-foreground/55"
                : "stroke-muted-foreground/50"
            }
            strokeWidth={1.2}
            strokeDasharray={m.kind === "uttarayana" || m.kind === "dakshinayana" ? "5 3" : "2 3"}
          />
          <circle
            cx={m.x}
            cy={m.y}
            r={m.kind === "uttarayana" || m.kind === "dakshinayana" ? 4 : 3.4}
            className={
              m.kind === "uttarayana"
                ? "fill-accent stroke-background"
                : m.kind === "dakshinayana"
                  ? "fill-destructive stroke-background"
                  : "fill-primary stroke-background"
            }
            strokeWidth={1.25}
          >
            <title>{`${m.label} · ${m.dayLabel} · ${m.dayLengthLabel}\n${m.hint}`}</title>
          </circle>
          <text
            x={m.x}
            y={m.labelY}
            textAnchor="middle"
            className={
              m.kind === "uttarayana"
                ? "fill-accent text-diagram-xs font-bold"
                : m.kind === "dakshinayana"
                  ? "fill-destructive text-diagram-xs font-bold"
                  : "fill-primary text-diagram-xs font-semibold"
            }
          >
            {m.short}
          </text>
        </g>
      ))}

      {/* Today marker */}
      {chart.todayIndex != null && chart.points[chart.todayIndex] ? (
        <line
          x1={chart.points[chart.todayIndex]!.x}
          y1={chart.plot.y}
          x2={chart.points[chart.todayIndex]!.x}
          y2={chart.lengthPlot.y + chart.lengthPlot.h}
          className="stroke-foreground/50"
          strokeWidth={1.25}
          strokeDasharray="4 3"
        />
      ) : null}

      {/* Scrub crosshair */}
      {active ? (
        <g>
          <line
            x1={active.x}
            y1={chart.plot.y}
            x2={active.x}
            y2={chart.lengthPlot.y + chart.lengthPlot.h}
            className="stroke-foreground/70"
            strokeWidth={1.25}
          />
          <circle cx={active.x} cy={active.riseY} r={3.2} className="fill-accent" />
          <circle cx={active.x} cy={active.setY} r={3.2} className="fill-destructive" />
          <circle cx={active.x} cy={active.lengthY} r={3} className="fill-primary" />
        </g>
      ) : null}
    </svg>
  );
}

/** Year sunrise/sunset band + day-length strip from `page.daylightChart`. */
export function SunTimesDaylightChart({ chart, className }: SunTimesDaylightChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const active = useMemo(() => (chart && hoverX != null ? nearestDaylightPoint(chart, hoverX) : null), [chart, hoverX]);

  if (!chart) return null;

  return (
    <Box className={cn(sun.chartCard, sun.chartClip, className)}>
      <Box className={cn("flex flex-col", sun.chartHead)}>
        <Text className={sun.chartTitle}>{chart.title}</Text>
        <Text className={sun.chartSub}>{chart.subtitle}</Text>
      </Box>

      <Box className={sun.chartSvgWrap}>
        <ChartSvg chart={chart} active={active} onHover={setHoverX} />
      </Box>

      <Box className={cn("flex", sun.chartLegend)}>
        <Box className={cn("flex", sun.chartLegendItem)}>
          <Box className={cn(sun.chartLegendSwatch, "bg-accent")} />
          <Text className={sun.chartLegendLabel}>{chart.riseLegend}</Text>
        </Box>
        <Box className={cn("flex", sun.chartLegendItem)}>
          <Box className={cn(sun.chartLegendSwatch, "bg-destructive/90")} />
          <Text className={sun.chartLegendLabel}>{chart.setLegend}</Text>
        </Box>
        <Box className={cn("flex", sun.chartLegendItem)}>
          <Box className={cn(sun.chartLegendSwatch, "bg-primary")} />
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

      <Box className={cn("flex", sun.chartStats)}>
        <Box className={cn("flex flex-col", sun.chartStat)}>
          <Text className={sun.chartStatLabel}>{chart.longestLabel}</Text>
          <Text className={sun.chartStatValue}>{chart.longest.dayLengthLabel}</Text>
          <Text className={sun.chartStatMeta}>
            {chart.longest.dayLabel} · ↑ {chart.longest.sunriseLabel} ↓ {chart.longest.sunsetLabel}
          </Text>
        </Box>
        <Box className={cn("flex flex-col", sun.chartStat)}>
          <Text className={sun.chartStatLabel}>{chart.shortestLabel}</Text>
          <Text className={sun.chartStatValue}>{chart.shortest.dayLengthLabel}</Text>
          <Text className={sun.chartStatMeta}>
            {chart.shortest.dayLabel} · ↑ {chart.shortest.sunriseLabel} ↓ {chart.shortest.sunsetLabel}
          </Text>
        </Box>
        <Box className={cn("flex flex-col", sun.chartStat)}>
          <Text className={sun.chartStatLabel}>{chart.spanLegend}</Text>
          <Text className={sun.chartStatValue}>{chart.spanLabel}</Text>
        </Box>
      </Box>

      {chart.markers.length > 0 ? (
        <Box className={cn("flex flex-col", sun.chartMarkers)}>
          <Text className={sun.chartMarkersTitle}>{chart.markersLegend}</Text>
          <Box className={cn("flex", sun.chartMarkersRow)}>
            {chart.markers.map((m) => (
              <Box key={m.kind} className={cn("flex flex-col", sun.chartMarkerItem)}>
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
