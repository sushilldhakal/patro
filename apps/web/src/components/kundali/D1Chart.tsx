import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { cn } from "@vedic-patro/domain/utils";
import { useD1Chart, type D1DrishtiPanel } from "@vedic-patro/features/kundali";
import { GrahaStatusMarksSvg } from "@/components/graha/GrahaStatusBadges";
import { BhavaDetailDialog } from "@/components/kundali/BhavaDetailDialog";

interface Props {
  houses: BhavaHouse[];
  /** Max rendered width in px (default 340). The share-image card draws it larger. */
  size?: number;
}

function DrishtiPanel({ panel, onClose }: { panel: D1DrishtiPanel; onClose: () => void }) {
  const badgeCls = panel.isMalefic
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";

  return (
    <div className="mt-3 w-full max-w-[340px] mx-auto space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className={kundaliDetailClasses.prose.heading}>{panel.title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={panel.closeLabel}
          className="shrink-0 text-muted-foreground hover:text-foreground text-sm leading-none"
        >
          ✕
        </button>
      </div>
      <div className={kundaliDetailClasses.parts.aspectCard}>
        <div className={cn("flex", kundaliDetailClasses.parts.aspectHead)}>
          <span className={kundaliDetailClasses.prose.heading}>{panel.effectLabel}</span>
          <span
            className={cn(
              "inline-flex leading-none",
              kundaliDetailClasses.parts.statusBadge,
              badgeCls,
            )}
          >
            {panel.badge}
          </span>
        </div>
        <p className={kundaliDetailClasses.prose.body}>{panel.summary}</p>
      </div>
    </div>
  );
}

const onActivate = (fn: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    e.stopPropagation();
    fn();
  }
};

export function D1Chart({ houses, size }: Props) {
  const chart = useD1Chart(houses);

  return (
    <div className="w-full">
      <svg
        viewBox="0 0 300 300"
        className="w-full h-auto max-w-[340px] mx-auto"
        style={size ? { maxWidth: size } : undefined}
        role="img"
        aria-label={chart.ariaLabel}
      >
        <defs>
          <marker
            id="d1DrishtiArrow"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L6,3 L0,6 Z" className="fill-secondary" />
          </marker>
        </defs>
        <rect
          x="0"
          y="0"
          width="300"
          height="300"
          className="fill-background/60 dark:fill-background/40 stroke-border"
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

        {chart.cells.map((cell) => {
          const open = () => chart.setOpenHouse(cell.house);
          return (
            <g
              key={cell.house}
              onClick={cell.hasData ? open : undefined}
              onKeyDown={cell.hasData ? onActivate(open) : undefined}
              role={cell.hasData ? "button" : undefined}
              tabIndex={cell.hasData ? 0 : undefined}
              aria-label={cell.ariaLabel ?? undefined}
              className={cell.hasData ? "cursor-pointer outline-none" : undefined}
            >
              <polygon points={cell.svgPoints} fill="transparent" style={{ pointerEvents: "all" }} />
              {cell.isLagna && (
                <polygon
                  points={cell.svgPoints}
                  className="fill-secondary/15 dark:fill-secondary/25"
                  style={{ pointerEvents: "none" }}
                />
              )}
              {cell.isAspected && (
                <polygon points={cell.svgPoints} className="fill-secondary/10" style={{ pointerEvents: "none" }} />
              )}
              {cell.label && (
                <text
                  x={cell.cx}
                  y={cell.labelY}
                  textAnchor="middle"
                  className={cn(
                    "text-sm font-semibold",
                    cell.isLagna ? "fill-secondary" : "fill-muted-foreground"
                  )}
                >
                  {cell.label}
                </text>
              )}
              {cell.planets.map((planet) => {
                const toggle = () => chart.togglePlanet(planet.key, cell.house);
                return (
                  <g
                    key={planet.key}
                    onClick={
                      planet.isClickable
                        ? (e) => {
                            e.stopPropagation();
                            toggle();
                          }
                        : undefined
                    }
                    onKeyDown={planet.isClickable ? onActivate(toggle) : undefined}
                    role={planet.isClickable ? "button" : undefined}
                    tabIndex={planet.isClickable ? 0 : undefined}
                    className={planet.isClickable ? "cursor-pointer outline-none" : undefined}
                  >
                    {planet.isSelected && (
                      <circle
                        cx={planet.x}
                        cy={planet.haloY}
                        r={planet.fontSize * 0.85}
                        className="fill-secondary/20"
                      />
                    )}
                    <text
                      x={planet.x}
                      y={planet.y}
                      textAnchor="middle"
                      style={{ fontSize: `${planet.fontSize}px` }}
                      className={cn("text-base", planet.isSelected ? "fill-secondary font-semibold" : "fill-foreground")}
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
                );
              })}
            </g>
          );
        })}

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

      {chart.drishti && <DrishtiPanel panel={chart.drishti} onClose={chart.clearSelected} />}

      <BhavaDetailDialog
        houses={houses}
        houseNumber={chart.openHouse}
        reference={chart.reference}
        onClose={chart.closeHouse}
      />
    </div>
  );
}
