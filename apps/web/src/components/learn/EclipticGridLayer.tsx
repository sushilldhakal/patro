import { useMemo } from "react";
import { semeclipticGrid, semGridNakLabelCur, semGridNakLine, semGridNakSegVariant, semGridRashiLabelCur, semGridRashiLine, semGridRashiSegVariant } from "@/lib/diagram-classes";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { getWheelRashis } from "@/lib/wheel-data";
import {
  NAKSHATRA_SPAN_DEG,
  SEM,
  SEM_GRID,
  nakshatraIndexFromLon,
  pol,
  rashiIndexFromLon,
} from "./sun-earth-moon-math";

function semArc(L0: number, L1: number, r0: number, r1: number): string {
  const [x1, y1] = pol(SEM.cx, SEM.cy, r1, L0);
  const [x2, y2] = pol(SEM.cx, SEM.cy, r1, L1);
  const [x3, y3] = pol(SEM.cx, SEM.cy, r0, L1);
  const [x4, y4] = pol(SEM.cx, SEM.cy, r0, L0);
  const large = L1 - L0 > 180 ? 1 : 0;
  return `M${x1},${y1} A${r1},${r1} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r0},${r0} 0 ${large} 0 ${x4},${y4} Z`;
}

function radialLine(deg: number, r0: number, r1: number) {
  const [x0, y0] = pol(SEM.cx, SEM.cy, r0, deg);
  const [x1, y1] = pol(SEM.cx, SEM.cy, r1, deg);
  return { x0, y0, x1, y1 };
}

interface Props {
  sunLon: number;
}

export function EclipticGridLayer({ sunLon }: Props) {
  const curRashi = rashiIndexFromLon(sunLon);
  const curNak = nakshatraIndexFromLon(sunLon);

  const grid = useMemo(() => {
    const rashiArcs: React.ReactNode[] = [];
    const nakArcs: React.ReactNode[] = [];
    const rashiLines: React.ReactNode[] = [];
    const nakLines: React.ReactNode[] = [];

    for (let i = 0; i < 12; i++) {
      const L0 = i * 30;
      const L1 = (i + 1) * 30;
      rashiArcs.push(
        <path
          key={`ra-${i}`}
          d={semArc(L0, L1, SEM_GRID.rashiIn, SEM_GRID.rashiOut)}
          className={semGridRashiSegVariant({ alt: i % 2 === 1 })}
        />,
      );
    }

    for (let i = 0; i <= 12; i++) {
      const deg = i * 30;
      const { x0, y0, x1, y1 } = radialLine(deg, SEM.sunR + 8, SEM_GRID.lineOut);
      rashiLines.push(
        <line key={`rg-${i}`} x1={x0} y1={y0} x2={x1} y2={y1} className={semGridRashiLine} />,
      );
    }

    for (let i = 0; i < 27; i++) {
      const L0 = i * NAKSHATRA_SPAN_DEG;
      const L1 = (i + 1) * NAKSHATRA_SPAN_DEG;
      nakArcs.push(
        <path
          key={`na-${i}`}
          d={semArc(L0, L1, SEM_GRID.nakIn, SEM_GRID.nakOut)}
          className={semGridNakSegVariant({ alt: i % 2 === 1 })}
        />,
      );
    }

    for (let i = 0; i <= 27; i++) {
      const deg = i * NAKSHATRA_SPAN_DEG;
      const { x0, y0, x1, y1 } = radialLine(deg, SEM_GRID.rashiOut, SEM_GRID.lineOut);
      nakLines.push(
        <line key={`ng-${i}`} x1={x0} y1={y0} x2={x1} y2={y1} className={semGridNakLine} />,
      );
    }

    return { rashiArcs, nakArcs, rashiLines, nakLines };
  }, []);

  const rashis = getWheelRashis();
  const rashiLabels = Array.from({ length: 12 }, (_, i) => {
    const Lm = i * 30 + 15;
    const [lx, ly] = pol(SEM.cx, SEM.cy, SEM_GRID.rashiLabelR, Lm);
    const r = rashis[i]!;
    return (
      <text
        key={`rl-${i}`}
        x={lx}
        y={ly}
        className={semGridRashiLabelCur(i === curRashi)}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {r.ne}
      </text>
    );
  });

  const nakLabels = Array.from({ length: 27 }, (_, i) => {
    const L0 = i * NAKSHATRA_SPAN_DEG;
    const Lm = L0 + NAKSHATRA_SPAN_DEG / 2;
    const [lx, ly] = pol(SEM.cx, SEM.cy, SEM_GRID.nakLabelR, Lm);
    return (
      <text
        key={`nl-${i}`}
        x={lx}
        y={ly}
        className={semGridNakLabelCur(i === curNak)}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {NAKSHATRA_ICONS[i]!.ne}
      </text>
    );
  });

  return (
    <g className={semeclipticGrid} aria-hidden>
      {grid.rashiArcs}
      {grid.nakArcs}
      {grid.rashiLines}
      {grid.nakLines}
      <path
        d={semArc(curRashi * 30, (curRashi + 1) * 30, SEM_GRID.rashiIn, SEM_GRID.rashiOut)}
        className={semGridRashiSegVariant({ cur: true })}
      />
      <path
        d={semArc(
          curNak * NAKSHATRA_SPAN_DEG,
          (curNak + 1) * NAKSHATRA_SPAN_DEG,
          SEM_GRID.nakIn,
          SEM_GRID.nakOut,
        )}
        className={semGridNakSegVariant({ cur: true })}
      />
      {rashiLabels}
      {nakLabels}
    </g>
  );
}
