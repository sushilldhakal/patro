import { Check, X } from "lucide-react";
import type { ShadbalaPlanet, YuddhaData } from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { useShadbalaChart, type ShadbalaMeterRow } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import type { ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
export { type ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";

type Chart = ReturnType<typeof useShadbalaChart>;

const SUB_COLOR = { sthana: "var(--brand-saffron)", kala: "var(--brand-blue)" } as const;

function Meter({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <div className={kundaliDetailClasses.shadbalaChart.meter}>
      <div className={kundaliDetailClasses.shadbalaChart.meterFill} style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

export function ShadbalaChart({
  planets,
  selectedKey,
  onSelect,
  yuddha,
  scale,
  onScaleChange,
}: {
  planets: ShadbalaPlanet[];
  selectedKey: string;
  onSelect: (key: string) => void;
  yuddha?: YuddhaData;
  scale: ShadbalaScale;
  onScaleChange: (scale: ShadbalaScale) => void;
}) {
  const chart = useShadbalaChart({ planets, selectedKey, yuddha, scale });

  return (
    <div className="space-y-4">
      <div className={cn(kundaliDetailClasses.shadbalaChart.headRow, "flex flex-col sm:flex-row sm:items-start sm:justify-between")}>
        <div>
          <h3 className={kundaliDetailClasses.shadbalaChart.title}>{chart.title}</h3>
          <p className={kundaliDetailClasses.shadbalaChart.hint}>{chart.hint}</p>
        </div>
        <div className={cn(kundaliDetailClasses.shadbalaChart.scaleBar, "flex")}>
          {chart.scales.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onScaleChange(item.id)}
              aria-pressed={item.active}
              className={cn(
                kundaliDetailClasses.shadbalaChart.scaleTab,
                kundaliDetailClasses.shadbalaChart.scaleText,
                "transition-colors",
                item.active
                  ? cn(kundaliDetailClasses.shadbalaChart.scaleActive, kundaliDetailClasses.shadbalaChart.scaleActiveText)
                  : cn(kundaliDetailClasses.shadbalaChart.scaleIdleText, "hover:text-foreground"),
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={kundaliDetailClasses.shadbalaChart.panel}>
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[3rem_minmax(0,1fr)]">
          <div className="relative mt-6 h-64">
            {chart.ticks.map((tick) => (
              <span
                key={tick.key}
                className={cn(kundaliDetailClasses.shadbalaChart.axisLabel, "absolute right-0 -translate-y-1/2")}
                style={{ bottom: `${tick.pct}%` }}
              >
                {tick.label}
              </span>
            ))}
          </div>
          <div>
            <div className="relative mt-6 h-64">
              {chart.ticks.map((tick) => (
                <div
                  key={`grid-${tick.key}`}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ bottom: `${tick.pct}%` }}
                />
              ))}
              <div className="relative z-[1] grid h-full grid-cols-7 gap-1.5 sm:gap-3">
                {chart.columns.map((column) => (
                  <PlanetColumn key={column.key} chart={chart} column={column} onSelect={() => onSelect(column.key)} />
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-3">
              {chart.columns.map((column) => (
                <button
                  key={column.key}
                  type="button"
                  onClick={() => onSelect(column.key)}
                  className="flex min-w-0 flex-col items-center gap-0.5 outline-none"
                >
                  <GrahaPlanetIcon graha={column.key as GrahaKey} size={18} />
                  <span className={cn(kundaliDetailClasses.shadbalaChart.barLabel, "max-w-full truncate")}>
                    {column.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(kundaliDetailClasses.shadbalaChart.legend, kundaliDetailClasses.shadbalaChart.legendText, "flex")}>
          {chart.legend.map((bala) => (
            <span key={bala.key} className={cn(kundaliDetailClasses.shadbalaChart.legendItem, "inline-flex")}>
              <span className={kundaliDetailClasses.shadbalaChart.legendDot} style={{ backgroundColor: bala.color }} aria-hidden />
              {bala.label}
            </span>
          ))}
          <span className={cn(kundaliDetailClasses.shadbalaChart.legendItem, "inline-flex")}>
            <span className="w-4 border-t border-dashed border-accent" aria-hidden />
            {chart.requiredLabel}
          </span>
        </div>
      </div>

      <div>
        <p className={kundaliDetailClasses.shadbalaChart.pickLabel}>{chart.pickLabel}</p>
        <div className={cn(kundaliDetailClasses.shadbalaChart.pickRow, "flex")}>
          {chart.columns.map((column) => (
            <button
              key={column.key}
              type="button"
              onClick={() => onSelect(column.key)}
              aria-pressed={column.selected}
              className={cn(
                kundaliDetailClasses.shadbalaChart.pickChip,
                kundaliDetailClasses.shadbalaChart.pickChipText,
                "inline-flex transition-colors",
                column.selected
                  ? cn(kundaliDetailClasses.shadbalaChart.pickActive, kundaliDetailClasses.shadbalaChart.pickActiveText)
                  : cn(kundaliDetailClasses.shadbalaChart.pickIdle, kundaliDetailClasses.shadbalaChart.pickIdleText, "hover:text-foreground"),
              )}
            >
              <GrahaPlanetIcon graha={column.key as GrahaKey} size={16} />
              {column.name}
            </button>
          ))}
        </div>
      </div>

      {chart.inspector && <PlanetInspector inspector={chart.inspector} />}
    </div>
  );
}

function PlanetColumn({
  chart,
  column,
  onSelect,
}: {
  chart: Chart;
  column: Chart["columns"][number];
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={column.selected}
      aria-label={`${column.name}, ${column.value}`}
      className="relative h-full min-w-0 outline-none"
    >
      <div className={cn("absolute inset-x-[12%] inset-y-0", column.selected && "rounded-sm ring-2 ring-primary")}>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col-reverse overflow-hidden rounded-sm"
          style={{ height: `${column.columnPct}%` }}
        >
          {column.segments.map((segment) => (
            <div key={segment.key} style={{ height: `${segment.pct}%`, backgroundColor: segment.color }} />
          ))}
        </div>
        <div
          className="absolute inset-x-0 flex -translate-y-full items-end justify-center gap-0.5 pb-0.5 font-mono text-xs font-semibold tabular-nums text-foreground"
          style={{ bottom: `${column.columnPct}%` }}
        >
          <span className="max-w-full truncate">{column.value}</span>
          {column.meets ? (
            <Check className="size-3 shrink-0 text-primary" aria-label={chart.meetsLabel} />
          ) : (
            <X className="size-3 shrink-0 text-destructive" aria-label={chart.belowLabel} />
          )}
        </div>
        {column.requiredPct != null && (
          <div
            className="absolute inset-x-[-18%] border-t border-dashed border-accent"
            style={{ bottom: `${column.requiredPct}%` }}
            aria-hidden
          />
        )}
      </div>
    </button>
  );
}

function PlanetInspector({ inspector }: { inspector: NonNullable<Chart["inspector"]> }) {
  return (
    <div className={cn(kundaliDetailClasses.shadbalaChart.inspector, "space-y-3")}>
      <div className={cn(kundaliDetailClasses.shadbalaChart.inspectorHead, "flex")}>
        <p className={cn(kundaliDetailClasses.shadbalaChart.inspectorTitleRow, kundaliDetailClasses.shadbalaChart.inspectorTitle, "inline-flex")}>
          <GrahaPlanetIcon graha={inspector.key as GrahaKey} size={22} />
          {inspector.name}
        </p>
        <p className={cn(kundaliDetailClasses.shadbalaChart.inspectorValue, inspector.meets ? kundaliDetailClasses.shadbalaChart.inspectorMeets : kundaliDetailClasses.shadbalaChart.inspectorBelow)}>
          {inspector.value}
        </p>
      </div>

      <div className="space-y-2">
        {inspector.breakdown.map((bala) => (
          <div key={bala.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_4.25rem] items-center gap-2">
            <span className={cn(kundaliDetailClasses.shadbalaChart.breakdownLabel, "truncate")}>{bala.label}</span>
            <Meter value={bala.value} max={inspector.breakdownMax} color={bala.color} />
            <span className={kundaliDetailClasses.shadbalaChart.breakdownValue}>{bala.display}</span>
          </div>
        ))}
      </div>

      {inspector.subs && (
        <div className="grid gap-4 sm:grid-cols-2">
          {inspector.subs.map((sub) => (
            <SubBalaList key={sub.key} title={sub.title} rows={sub.rows} max={sub.max} color={SUB_COLOR[sub.key]} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubBalaList({
  title,
  rows,
  max,
  color,
}: {
  title: string;
  rows: ShadbalaMeterRow[];
  max: number;
  color: string;
}) {
  return (
    <div>
      <p className={kundaliDetailClasses.shadbalaChart.subTitle}>{title}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[7rem_minmax(0,1fr)_3.75rem] items-center gap-2">
            <span className={cn(kundaliDetailClasses.shadbalaChart.subLabel, "truncate")}>{row.label}</span>
            <Meter value={row.value} max={max} color={color} />
            <span className={kundaliDetailClasses.shadbalaChart.subValue}>{row.display}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
