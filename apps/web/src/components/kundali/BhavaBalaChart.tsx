import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BhavaBalaData, VargaCharts } from "@/lib/api";
import { type GrahaKey } from "@vedic-patro/domain/graha-details";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { Button } from "@/components/ui/button";
import { cn } from "@vedic-patro/domain/utils";
import { type StrengthBand, clampPct } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { useBhavaBalaChart, type BhavaBalaTone } from "@vedic-patro/features/kundali";

type Chart = ReturnType<typeof useBhavaBalaChart>;

const TONE_BAR: Record<BhavaBalaTone, string> = {
  primary: kundaliDetailClasses.bhavaChart.barPrimary,
  secondary: kundaliDetailClasses.bhavaChart.barSecondary,
  accent: kundaliDetailClasses.bhavaChart.barAccent,
};

const BAND_SWATCH: Record<StrengthBand, string> = {
  strong: kundaliDetailClasses.bhavaChart.barPrimary,
  average: "bg-muted-foreground",
  weak: "bg-destructive",
};

function scoreFillClass(band: StrengthBand): string {
  if (band === "strong") return "fill-primary";
  if (band === "weak") return "fill-destructive";
  return "fill-muted-foreground";
}

function scoreTextClass(band: StrengthBand): string {
  if (band === "strong") return kundaliDetailClasses.bhavaChart.scoreStrong;
  if (band === "weak") return kundaliDetailClasses.bhavaChart.scoreWeak;
  return kundaliDetailClasses.bhavaChart.scoreAvg;
}

function Meter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const width = clampPct(Math.abs(value), max);
  return (
    <div className={kundaliDetailClasses.bhavaChart.meter}>
      <div className={cn(kundaliDetailClasses.bhavaChart.meterFill, className)} style={{ width: `${width}%` }} />
    </div>
  );
}

function ComponentTile({ tile }: { tile: Chart["inspector"]["tiles"][number] }) {
  return (
    <div className={kundaliDetailClasses.bhavaChart.tile}>
      <p className={kundaliDetailClasses.bhavaChart.tileLabel}>{tile.label}</p>
      <p className={kundaliDetailClasses.bhavaChart.tileValue}>{tile.display}</p>
      <div className={kundaliDetailClasses.bhavaChart.tileMeter}>
        <Meter value={tile.value} max={tile.max} className={TONE_BAR[tile.tone]} />
      </div>
    </div>
  );
}

function StrengthBadge({ badge }: { badge: Chart["inspector"]["badge"] }) {
  return (
    <span
      className={cn(
        kundaliDetailClasses.bhavaChart.badge,
        kundaliDetailClasses.bhavaChart.badgeText,
        "inline-flex",
        badge.tone === "good"
          ? cn(kundaliDetailClasses.bhavaChart.badgeGood, kundaliDetailClasses.bhavaChart.badgeGoodText)
          : badge.tone === "weak"
            ? cn(kundaliDetailClasses.bhavaChart.badgeWeak, kundaliDetailClasses.bhavaChart.badgeWeakText)
            : cn(kundaliDetailClasses.bhavaChart.badgeAvg, kundaliDetailClasses.bhavaChart.badgeAvgText),
      )}
    >
      {badge.label}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className={cn(kundaliDetailClasses.bhavaChart.chip, kundaliDetailClasses.bhavaChart.chipText, "inline-flex")}>
      {children}
    </span>
  );
}

export function BhavaBalaChart(props: {
  data: BhavaBalaData;
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const chart = useBhavaBalaChart(props);

  return (
    <div className="space-y-4">
      <div>
        <h3 className={kundaliDetailClasses.bhavaChart.title}>{chart.title}</h3>
        <p className={kundaliDetailClasses.prose.mutedMt1}>{chart.hint}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
        <BhavaDiamond chart={chart} />
        <HouseInspector inspector={chart.inspector} />
      </div>

      <div className={cn(kundaliDetailClasses.bhavaChart.legend, kundaliDetailClasses.bhavaChart.legendText, "flex")}>
        {chart.legend.map((item) => (
          <LegendSwatch key={item.band} className={BAND_SWATCH[item.band]} label={item.label} />
        ))}
      </div>
      <p className={kundaliDetailClasses.prose.muted}>{chart.legendNote}</p>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className={cn(kundaliDetailClasses.bhavaChart.swatch, "inline-flex")}>
      <span className={cn(kundaliDetailClasses.bhavaChart.swatchDot, className)} aria-hidden />
      {label}
    </span>
  );
}

function BhavaDiamond({ chart }: { chart: Chart }) {
  return (
    <div className={kundaliDetailClasses.bhavaChart.panel}>
      <svg
        viewBox="0 0 300 300"
        className="mx-auto h-auto w-full max-w-[420px]"
        role="img"
        aria-label={chart.chartLabel}
      >
        <rect
          x="0"
          y="0"
          width="300"
          height="300"
          className="fill-background stroke-border"
          strokeWidth="1.5"
          rx="4"
        />
        <line x1="0" y1="0" x2="300" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <line x1="300" y1="0" x2="0" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <polygon
          points="150,0 300,150 150,300 0,150"
          className="fill-none stroke-border/80"
          strokeWidth="1.25"
        />

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
            <polygon
              points={cell.points}
              className={cn(cell.selected ? "fill-primary/20" : "fill-transparent")}
              style={{ pointerEvents: "all" }}
            />
            {cell.selected && (
              <polygon
                points={cell.points}
                className="fill-none stroke-primary"
                strokeWidth="1.6"
                style={{ pointerEvents: "none" }}
              />
            )}
            <text
              x={cell.numberPos.x}
              y={cell.numberPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-diagram-xs font-semibold"
              style={{ pointerEvents: "none" }}
            >
              {cell.number}
            </text>
            <text
              x={cell.center.x}
              y={cell.center.y + 3}
              textAnchor="middle"
              className={cn("text-base font-bold tabular-nums", scoreFillClass(cell.band))}
              style={{ pointerEvents: "none" }}
            >
              {cell.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HouseInspector({ inspector: h }: { inspector: Chart["inspector"] }) {
  return (
    <div className={cn(kundaliDetailClasses.bhavaChart.inspector, "space-y-4")}>
      <div className={cn(kundaliDetailClasses.bhavaChart.inspectorHead, "flex")}>
        <div>
          <p className={kundaliDetailClasses.bhavaChart.houseTitle}>
            <span className={cn(kundaliDetailClasses.bhavaChart.houseNum, kundaliDetailClasses.bhavaChart.houseNumText, "mr-2 inline-flex")}>
              {h.number}
            </span>
            {h.rashiName}
            {h.classical ? (
              <span className={kundaliDetailClasses.bhavaChart.classical}>· {h.classical}</span>
            ) : null}
          </p>
        </div>
        <div className={cn(kundaliDetailClasses.bhavaChart.navRow, "flex")}>
          <Button type="button" variant="outline" size="icon-sm" onClick={h.prev} aria-label={h.prevLabel}>
            <ChevronLeft />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" onClick={h.next} aria-label={h.nextLabel}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className={cn(kundaliDetailClasses.bhavaChart.metaRow, kundaliDetailClasses.bhavaChart.metaText, "flex")}>
        <span className="inline-flex items-center gap-1.5">
          {h.ruledBy}
          <GrahaPlanetIcon graha={h.lordKey} size={18} />
          <span className={kundaliDetailClasses.prose.strong}>{h.lordName}</span>
        </span>
        {h.classes ? (
          <>
            <span aria-hidden>·</span>
            <span>{h.classes}</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <span>{h.rank}</span>
        <StrengthBadge badge={h.badge} />
      </div>

      <div>
        <div className={cn(kundaliDetailClasses.bhavaChart.scoreHead, "flex")}>
          <p className={kundaliDetailClasses.prose.heading}>{h.scoreTitle}</p>
          <p className={cn(kundaliDetailClasses.bhavaChart.score, scoreTextClass(h.band))}>{h.score}</p>
        </div>
        <div className={kundaliDetailClasses.bhavaChart.tileMeter}>
          <Meter value={h.totalPinda} max={h.totalScale} className={kundaliDetailClasses.bhavaChart.barPrimary} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {h.tiles.map((tile) => (
          <ComponentTile key={tile.key} tile={tile} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={kundaliDetailClasses.bhavaChart.groupLabel}>{h.signifiesLabel}</p>
          <div className={cn(kundaliDetailClasses.bhavaChart.chips, "flex")}>
            {h.signifies.length > 0 ? (
              h.signifies.map((item) => <Chip key={item}>{item}</Chip>)
            ) : (
              <p className={kundaliDetailClasses.prose.muted}>—</p>
            )}
          </div>
        </div>
        <div>
          <p className={kundaliDetailClasses.bhavaChart.groupLabel}>{h.occupantsLabel}</p>
          {h.occupants.length > 0 ? (
            <div className={cn(kundaliDetailClasses.bhavaChart.chips, "flex")}>
              {h.occupants.map((planet) => (
                <Chip key={planet.key}>
                  <span className="inline-flex items-center gap-1.5">
                    <GrahaPlanetIcon graha={planet.key as GrahaKey} size={16} />
                    {planet.name}
                  </span>
                </Chip>
              ))}
            </div>
          ) : (
            <p className={kundaliDetailClasses.prose.muted}>{h.noOccupants}</p>
          )}
        </div>
      </div>
    </div>
  );
}
