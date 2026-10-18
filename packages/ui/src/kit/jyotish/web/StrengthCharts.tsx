import type { ReactNode } from "react";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses as k } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { clampPct, type StrengthBand } from "@vedic-patro/domain/jyotish/kundali/bhava-bala-chart";
import { useBhavaBalaChart, useShadbalaChart, type BhavaBalaTone, type ShadbalaMeterRow } from "@vedic-patro/features/kundali";
import { columnStack } from "../column-stack";
import type { BhavaBalaChartProps, ShadbalaChartProps } from "../contract";
import { iconCheck, iconChevronLeft, iconChevronRight, iconX } from "../icons";

const SUB_COLOR = { sthana: "var(--brand-saffron)", kala: "var(--brand-blue)" } as const;

const TONE_BAR: Record<BhavaBalaTone, string> = {
  primary: k.bhavaChart.barPrimary,
  secondary: k.bhavaChart.barSecondary,
  accent: k.bhavaChart.barAccent,
};

const BAND_SWATCH: Record<StrengthBand, string> = {
  strong: k.bhavaChart.barPrimary,
  average: "bg-muted-foreground",
  weak: "bg-destructive",
};

function scoreFillClass(band: StrengthBand): string {
  if (band === "strong") return "fill-primary";
  if (band === "weak") return "fill-destructive";
  return "fill-muted-foreground";
}

function scoreTextClass(band: StrengthBand): string {
  if (band === "strong") return k.bhavaChart.scoreStrong;
  if (band === "weak") return k.bhavaChart.scoreWeak;
  return k.bhavaChart.scoreAvg;
}

function ColorMeter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <Box className={k.shadbalaChart.meter}>
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="block h-full w-full">
        <rect x="0" y="0" width={width} height="8" fill={color} />
      </svg>
    </Box>
  );
}

function ClassMeter({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <Box className={k.bhavaChart.meter}>
      <Box className={cn(k.bhavaChart.meterFill, className)} widthPercent={clampPct(Math.abs(value), max)} />
    </Box>
  );
}

type ShadbalaView = ReturnType<typeof useShadbalaChart>;
type Column = ShadbalaView["columns"][number];

export function ShadbalaChart({ planets, selectedKey, onSelect, yuddha, scale, onScaleChange, renderGraha }: ShadbalaChartProps) {
  const chart = useShadbalaChart({ planets, selectedKey, yuddha, scale });
  return (
    <Box className={cn(k.shadbalaChart.root, "flex flex-col")}>
      <Box className={cn(k.shadbalaChart.headRow, "flex flex-col sm:flex-row sm:items-start sm:justify-between")}>
        <Box>
          <Text as="h3" className={k.shadbalaChart.title}>{chart.title}</Text>
          <Text as="p" className={k.shadbalaChart.hint}>{chart.hint}</Text>
        </Box>
        <Box className={k.shadbalaChart.scaleBar}>
          {chart.scales.map((item) => (
            <Pressable
              key={item.id}
              role="tab"
              selected={item.active}
              onPress={() => onScaleChange(item.id)}
              className={cn(k.shadbalaChart.scaleTab, item.active && k.shadbalaChart.scaleActive)}
              webClassName="transition-colors"
            >
              <Text
                className={cn(k.shadbalaChart.scaleText, item.active ? k.shadbalaChart.scaleActiveText : k.shadbalaChart.scaleIdleText)}
                webClassName={item.active ? undefined : "hover:text-foreground"}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </Box>
      </Box>

      <Box className={k.shadbalaChart.panel}>
        <Box className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[3rem_minmax(0,1fr)]">
          <Box className="relative mt-6 h-64">
            {chart.ticks.map((tick) => (
              <span
                key={tick.key}
                className={cn(k.shadbalaChart.axisLabel, "absolute right-0 -translate-y-1/2")}
                style={{ bottom: `${tick.pct}%` }}
              >
                {tick.label}
              </span>
            ))}
          </Box>
          <Box>
            <Box className="relative mt-6 h-64">
              {chart.ticks.map((tick) => (
                <span key={`grid-${tick.key}`} className="pointer-events-none absolute inset-x-0 border-t border-border/60" style={{ bottom: `${tick.pct}%` }} />
              ))}
              <Box className="relative z-[1] grid h-full grid-cols-7 gap-1.5 sm:gap-3">
                {chart.columns.map((column) => (
                  <PlanetColumn key={column.key} chart={chart} column={column} onSelect={() => onSelect(column.key)} />
                ))}
              </Box>
            </Box>
            <Box className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-3">
              {chart.columns.map((column) => (
                <Pressable key={column.key} onPress={() => onSelect(column.key)} className="flex min-w-0 flex-col items-center gap-0.5">
                  {renderGraha({ graha: column.key, size: 18 })}
                  <Text numberOfLines={1} className={k.shadbalaChart.barLabel}>{column.name}</Text>
                </Pressable>
              ))}
            </Box>
          </Box>
        </Box>

        <Box className={cn(k.shadbalaChart.legend, k.shadbalaChart.legendText)}>
          {chart.legend.map((bala) => (
            <Box key={bala.key} className={k.shadbalaChart.legendItem}>
              <svg viewBox="0 0 10 10" className={k.shadbalaChart.legendDot} aria-hidden>
                <rect width="10" height="10" fill={bala.color} />
              </svg>
              <Text className={k.shadbalaChart.legendText}>{bala.label}</Text>
            </Box>
          ))}
          <Box className={k.shadbalaChart.legendItem}>
            <span className="w-4 border-t border-dashed border-accent" aria-hidden />
            <Text className={k.shadbalaChart.legendText}>{chart.requiredLabel}</Text>
          </Box>
        </Box>
      </Box>

      <Box>
        <Text as="p" className={k.shadbalaChart.pickLabel}>{chart.pickLabel}</Text>
        <Box className={k.shadbalaChart.pickRow}>
          {chart.columns.map((column) => (
            <Pressable
              key={column.key}
              role="tab"
              selected={column.selected}
              onPress={() => onSelect(column.key)}
              className={cn(k.shadbalaChart.pickChip, column.selected ? k.shadbalaChart.pickActive : k.shadbalaChart.pickIdle)}
              webClassName="transition-colors"
            >
              {renderGraha({ graha: column.key, size: 16 })}
              <Text className={cn(k.shadbalaChart.pickChipText, column.selected ? k.shadbalaChart.pickActiveText : k.shadbalaChart.pickIdleText)} webClassName={column.selected ? undefined : "hover:text-foreground"}>
                {column.name}
              </Text>
            </Pressable>
          ))}
        </Box>
      </Box>

      {chart.inspector ? <PlanetInspector inspector={chart.inspector} renderGraha={renderGraha} /> : null}
    </Box>
  );
}

function PlanetColumn({ chart, column, onSelect }: { chart: ShadbalaView; column: Column; onSelect: () => void }) {
  const rects = columnStack(column.segments);
  return (
    <Pressable onPress={onSelect} selected={column.selected} label={`${column.name}, ${column.value}`} className="relative h-full min-w-0">
      <Box className={cn("pointer-events-none absolute inset-x-[12%] inset-y-0", column.selected && "rounded-sm ring-2 ring-primary")} />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-[12%] right-[12%]"
        style={{ height: `${column.columnPct}%` }}
      >
        {rects.map((rect) => (
          <rect key={rect.key} x="0" y={rect.y} width="100" height={Math.max(rect.height, 0)} fill={rect.color} />
        ))}
      </svg>
      <span
        className="absolute inset-x-0 flex -translate-y-full items-end justify-center gap-0.5 pb-0.5 font-mono text-xs font-semibold tabular-nums text-foreground"
        style={{ bottom: `${column.columnPct}%` }}
      >
        <span className="max-w-full truncate">{column.value}</span>
        <Icon node={column.meets ? iconCheck : iconX} size={12} tone={column.meets ? "primary" : "destructive"} label={column.meets ? chart.meetsLabel : chart.belowLabel} />
      </span>
      {column.requiredPct != null ? (
        <span className="absolute inset-x-[-18%] border-t border-dashed border-accent" style={{ bottom: `${column.requiredPct}%` }} aria-hidden />
      ) : null}
    </Pressable>
  );
}

function PlanetInspector({ inspector, renderGraha }: { inspector: NonNullable<ShadbalaView["inspector"]>; renderGraha: ShadbalaChartProps["renderGraha"] }) {
  return (
    <Box className={cn(k.shadbalaChart.inspector, "flex flex-col")}>
      <Box className={k.shadbalaChart.inspectorHead}>
        <Text as="p" className={cn(k.shadbalaChart.inspectorTitleRow, k.shadbalaChart.inspectorTitle)}>
          {renderGraha({ graha: inspector.key, size: 22 })}
          {inspector.name}
        </Text>
        <Text as="p" className={cn(k.shadbalaChart.inspectorValue, inspector.meets ? k.shadbalaChart.inspectorMeets : k.shadbalaChart.inspectorBelow)}>
          {inspector.value}
        </Text>
      </Box>
      <Box className={k.shadbalaChart.breakdown}>
        {inspector.breakdown.map((bala) => (
          <Box key={bala.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.25rem] items-center gap-2">
            <Text numberOfLines={1} className={k.shadbalaChart.breakdownLabel}>{bala.label}</Text>
            <ColorMeter value={bala.value} max={inspector.breakdownMax} color={bala.color} />
            <Text className={k.shadbalaChart.breakdownValue}>{bala.display}</Text>
          </Box>
        ))}
      </Box>
      {inspector.subs ? (
        <Box className="grid gap-4 sm:grid-cols-2">
          {inspector.subs.map((sub) => (
            <SubBalaList key={sub.key} title={sub.title} rows={sub.rows} max={sub.max} color={SUB_COLOR[sub.key]} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function SubBalaList({ title, rows, max, color }: { title: string; rows: ShadbalaMeterRow[]; max: number; color: string }) {
  return (
    <Box>
      <Text as="p" className={k.shadbalaChart.subTitle}>{title}</Text>
      <Box className={k.shadbalaChart.subRows}>
        {rows.map((row) => (
          <Box key={row.key} className="grid grid-cols-[7rem_minmax(0,1fr)_3.75rem] items-center gap-2">
            <Text numberOfLines={1} className={k.shadbalaChart.subLabel}>{row.label}</Text>
            <ColorMeter value={row.value} max={max} color={color} />
            <Text className={k.shadbalaChart.subValue}>{row.display}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

type BhavaView = ReturnType<typeof useBhavaBalaChart>;

export function BhavaBalaChart(props: BhavaBalaChartProps) {
  const chart = useBhavaBalaChart(props);
  return (
    <Box className={cn(k.bhavaChart.root, "flex flex-col")}>
      <Box>
        <Text as="h3" className={k.bhavaChart.title}>{chart.title}</Text>
        <Text as="p" className={k.prose.mutedMt1}>{chart.hint}</Text>
      </Box>
      <Box className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <BhavaDiamond chart={chart} />
        <HouseInspector inspector={chart.inspector} renderGraha={props.renderGraha} />
      </Box>
      <Box className={cn(k.bhavaChart.legend, k.bhavaChart.legendText)}>
        {chart.legend.map((item) => (
          <Box key={item.band} className={k.bhavaChart.swatch}>
            <span className={cn(k.bhavaChart.swatchDot, BAND_SWATCH[item.band])} aria-hidden />
            <Text className={k.bhavaChart.legendText}>{item.label}</Text>
          </Box>
        ))}
      </Box>
      <Text as="p" className={k.prose.muted}>{chart.legendNote}</Text>
    </Box>
  );
}

function BhavaDiamond({ chart }: { chart: BhavaView }) {
  return (
    <Box className={k.bhavaChart.panel}>
      <svg viewBox="0 0 300 300" className="mx-auto h-auto w-full max-w-[420px]" role="img" aria-label={chart.chartLabel}>
        <rect x="0" y="0" width="300" height="300" className="fill-background stroke-border" strokeWidth="1.5" rx="4" />
        <line x1="0" y1="0" x2="300" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <line x1="300" y1="0" x2="0" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <polygon points="150,0 300,150 150,300 0,150" className="fill-none stroke-border/80" strokeWidth="1.25" />
        {chart.cells.map((cell) => (
          <g
            key={cell.house}
            role="button"
            tabIndex={0}
            aria-pressed={cell.selected}
            aria-label={cell.label}
            className="cursor-pointer outline-none"
            onClick={cell.select}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                cell.select();
              }
            }}
          >
            <polygon points={cell.points} className={cell.selected ? "fill-primary/20" : "fill-transparent"} style={{ pointerEvents: "all" }} />
            {cell.selected ? <polygon points={cell.points} className="fill-none stroke-primary" strokeWidth="1.6" style={{ pointerEvents: "none" }} /> : null}
            <text x={cell.numberPos.x} y={cell.numberPos.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-diagram-xs font-semibold" style={{ pointerEvents: "none" }}>
              {cell.number}
            </text>
            <text x={cell.center.x} y={cell.center.y + 3} textAnchor="middle" className={cn("text-base font-bold tabular-nums", scoreFillClass(cell.band))} style={{ pointerEvents: "none" }}>
              {cell.score}
            </text>
          </g>
        ))}
      </svg>
    </Box>
  );
}

function HouseInspector({ inspector: h, renderGraha }: { inspector: BhavaView["inspector"]; renderGraha: BhavaBalaChartProps["renderGraha"] }) {
  return (
    <Box className={cn(k.bhavaChart.inspector, "flex flex-col")}>
      <Box className={k.bhavaChart.inspectorHead}>
        <Text as="p" className={k.bhavaChart.houseTitle}>
          <Text className={cn(k.bhavaChart.houseNum, k.bhavaChart.houseNumText, "mr-2")}>{h.number}</Text>
          {h.rashiName}
          {h.classical ? <Text className={k.bhavaChart.classical}>· {h.classical}</Text> : null}
        </Text>
        <Box className={k.bhavaChart.navRow}>
          <Pressable label={h.prevLabel} onPress={h.prev} className="inline-flex size-8 items-center justify-center rounded-md border border-border">
            <Icon node={iconChevronLeft} size={16} />
          </Pressable>
          <Pressable label={h.nextLabel} onPress={h.next} className="inline-flex size-8 items-center justify-center rounded-md border border-border">
            <Icon node={iconChevronRight} size={16} />
          </Pressable>
        </Box>
      </Box>
      <Box className={cn(k.bhavaChart.metaRow, k.bhavaChart.metaText)}>
        <Text className={cn(k.bhavaChart.metaText, "inline-flex items-center gap-1.5")}>
          {h.ruledBy}
          {renderGraha({ graha: h.lordKey, size: 18 })}
          <Text className={k.prose.strong}>{h.lordName}</Text>
        </Text>
        {h.classes ? (
          <>
            <Text className={k.bhavaChart.metaText}>·</Text>
            <Text className={k.bhavaChart.metaText}>{h.classes}</Text>
          </>
        ) : null}
        <Text className={k.bhavaChart.metaText}>·</Text>
        <Text className={k.bhavaChart.metaText}>{h.rank}</Text>
        <StrengthBadge badge={h.badge} />
      </Box>
      <Box>
        <Box className={k.bhavaChart.scoreHead}>
          <Text as="p" className={k.prose.heading}>{h.scoreTitle}</Text>
          <Text as="p" className={cn(k.bhavaChart.score, scoreTextClass(h.band))}>{h.score}</Text>
        </Box>
        <Box className={k.bhavaChart.tileMeter}>
          <ClassMeter value={h.totalPinda} max={h.totalScale} className={k.bhavaChart.barPrimary} />
        </Box>
      </Box>
      <Box className="grid grid-cols-3 gap-2">
        {h.tiles.map((tile) => (
          <Box key={tile.key} className={k.bhavaChart.tile}>
            <Text as="p" className={k.bhavaChart.tileLabel}>{tile.label}</Text>
            <Text as="p" className={k.bhavaChart.tileValue}>{tile.display}</Text>
            <Box className={k.bhavaChart.tileMeter}>
              <ClassMeter value={tile.value} max={tile.max} className={TONE_BAR[tile.tone]} />
            </Box>
          </Box>
        ))}
      </Box>
      <Box className="grid gap-4 sm:grid-cols-2">
        <Box>
          <Text as="p" className={k.bhavaChart.groupLabel}>{h.signifiesLabel}</Text>
          <Box className={k.bhavaChart.chips}>
            {h.signifies.length > 0 ? h.signifies.map((item) => <Chip key={item}>{item}</Chip>) : <Text as="p" className={k.prose.muted}>—</Text>}
          </Box>
        </Box>
        <Box>
          <Text as="p" className={k.bhavaChart.groupLabel}>{h.occupantsLabel}</Text>
          {h.occupants.length > 0 ? (
            <Box className={k.bhavaChart.chips}>
              {h.occupants.map((planet) => (
                <Chip key={planet.key}>
                  {renderGraha({ graha: planet.key, size: 16 })}
                  {planet.name}
                </Chip>
              ))}
            </Box>
          ) : (
            <Text as="p" className={k.prose.muted}>{h.noOccupants}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function StrengthBadge({ badge }: { badge: BhavaView["inspector"]["badge"] }) {
  const box = badge.tone === "good" ? k.bhavaChart.badgeGood : badge.tone === "weak" ? k.bhavaChart.badgeWeak : k.bhavaChart.badgeAvg;
  const text = badge.tone === "good" ? k.bhavaChart.badgeGoodText : badge.tone === "weak" ? k.bhavaChart.badgeWeakText : k.bhavaChart.badgeAvgText;
  return (
    <Text className={cn(k.bhavaChart.badge, k.bhavaChart.badgeText, box, text)}>{badge.label}</Text>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <Text className={cn(k.bhavaChart.chip, k.bhavaChart.chipText)}>{children}</Text>;
}
