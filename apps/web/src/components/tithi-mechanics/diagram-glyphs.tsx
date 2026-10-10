export function TmSun({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  const rays = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return (
      <line
        key={k}
        x1={x + (r + 1.5) * Math.cos(a)}
        y1={y + (r + 1.5) * Math.sin(a)}
        x2={x + (r + 5) * Math.cos(a)}
        y2={y + (r + 5) * Math.sin(a)}
        className={tmSunray}
      />
    );
  });
  return (
    <g>
      {rays}
      <circle cx={x} cy={y} r={r} className={tmSundot} />
    </g>
  );
}

export function TmNewMoon({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} className={tmNewmoon} />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#5b6f76"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    </g>
  );
}

export function TmLegendDot({ kind }: { kind: "sun" | "moon" }) {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} style={{ verticalAlign: "middle" }}>
      {kind === "sun" ? <TmSun x={12} y={12} r={6} /> : <TmNewMoon x={12} y={12} r={6} />}
    </svg>
  );
}
import { tmNewmoon, tmSundot, tmSunray } from "@/lib/diagram-classes";
