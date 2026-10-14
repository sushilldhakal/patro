import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { useD1Chart, type D1DrishtiPanel } from "@vedic-patro/features/kundali";
import { GrahaStatusMarksSvg } from "@/components/graha/GrahaStatusMarksSvg";
import { BhavaDetailDialog } from "@/components/kundali/BhavaDetailDialog";

type Props = {
  houses: BhavaHouse[];
};

function DrishtiPanel({ panel, onClose }: { panel: D1DrishtiPanel; onClose: () => void }) {
  const badgeCls = panel.isMalefic
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

  return (
    <div className="mt-3 w-full max-w-[340px] mx-auto space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{panel.title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={panel.closeLabel}
          className="text-sm shrink-0 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{panel.effectLabel}</span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-semibold leading-none ${badgeCls}`}>
            {panel.badge}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{panel.summary}</p>
      </div>
    </div>
  );
}

export function D1Chart({ houses }: Props) {
  const chart = useD1Chart(houses);

  return (
    <div className="flex w-full flex-col items-center">
      <svg
        viewBox="0 0 300 300"
        className="mx-auto h-auto w-full max-w-[340px]"
        role="img"
        aria-label={chart.ariaLabel}
      >
        <defs>
          <marker id="d1DrishtiArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L6,3 L0,6 Z" className="fill-secondary" />
          </marker>
        </defs>
        <rect x="0" y="0" width="300" height="300" className="fill-background/60 stroke-border" strokeWidth="1.5" rx="4" />
        <line x1="0" y1="0" x2="300" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <line x1="300" y1="0" x2="0" y2="300" className="stroke-border/80" strokeWidth="1.25" />
        <polygon points="150,0 300,150 150,300 0,150" className="fill-none stroke-border/80" strokeWidth="1.25" />

        {chart.cells.map((cell) => (
          <g
            key={cell.house}
            onClick={cell.hasData ? () => chart.setOpenHouse(cell.house) : undefined}
            className={cell.hasData ? "cursor-pointer" : undefined}
          >
            <polygon points={cell.svgPoints} fill="transparent" style={{ pointerEvents: "all" }} />
            {cell.isLagna ? (
              <polygon
                points={cell.svgPoints}
                className="fill-secondary/15 dark:fill-secondary/25"
                style={{ pointerEvents: "none" }}
              />
            ) : null}
            {cell.isAspected ? (
              <polygon points={cell.svgPoints} className="fill-secondary/10" style={{ pointerEvents: "none" }} />
            ) : null}
            {cell.label ? (
              <text
                x={cell.cx}
                y={cell.labelY}
                textAnchor="middle"
                className={cell.isLagna ? "text-sm fill-secondary font-semibold" : "text-sm fill-muted-foreground font-semibold"}
              >
                {cell.label}
              </text>
            ) : null}
            {cell.planets.map((planet) => (
              <g
                key={planet.key}
                onClick={
                  planet.isClickable
                    ? (e) => {
                        e.stopPropagation();
                        chart.togglePlanet(planet.key, cell.house);
                      }
                    : undefined
                }
                className={planet.isClickable ? "cursor-pointer" : undefined}
              >
                {planet.isSelected ? (
                  <circle cx={planet.x} cy={planet.haloY} r={planet.fontSize * 0.85} className="fill-secondary/20" />
                ) : null}
                <text
                  x={planet.x}
                  y={planet.y}
                  textAnchor="middle"
                  style={{ fontSize: `${planet.fontSize}px` }}
                  className={planet.isSelected ? "fill-secondary font-semibold" : "fill-foreground"}
                >
                  {planet.abbr}
                </text>
                <GrahaStatusMarksSvg
                  planetKey={planet.key}
                  isRetrograde={planet.isRetrograde}
                  isCombust={planet.isCombust}
                  x={planet.markX}
                  y={planet.markY}
                  size={planet.markSize}
                />
              </g>
            ))}
          </g>
        ))}

        {chart.arrows.map((a) => (
          <line
            key={a.key}
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            className="stroke-secondary"
            strokeWidth="1.5"
            opacity="0.85"
            markerEnd="url(#d1DrishtiArrow)"
          />
        ))}
      </svg>
      {chart.drishti ? <DrishtiPanel panel={chart.drishti} onClose={chart.clearSelected} /> : null}
      <BhavaDetailDialog
        houses={houses}
        houseNumber={chart.openHouse}
        reference={chart.reference}
        onClose={chart.closeHouse}
      />
    </div>
  );
}
