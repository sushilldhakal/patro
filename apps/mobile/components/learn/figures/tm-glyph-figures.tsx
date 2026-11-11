import Svg, { Circle, G, Line } from "react-native-svg";
import { useSvgClass } from "@/components/learn/study/study-ink";
export function TmSun({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  const sc = useSvgClass();
  const rays = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2;
    return (
      <Line
        key={k}
        x1={x + (r + 1.5) * Math.cos(a)}
        y1={y + (r + 1.5) * Math.sin(a)}
        x2={x + (r + 5) * Math.cos(a)}
        y2={y + (r + 5) * Math.sin(a)}
        {...sc(tmSunray)}
      />
    );
  });
  return (
    <G>
      {rays}
      <Circle cx={x} cy={y} r={r} {...sc(tmSundot)} />
    </G>
  );
}

export function TmNewMoon({ x, y, r = 9 }: { x: number; y: number; r?: number }) {
  const sc = useSvgClass();
  return (
    <G>
      <Circle cx={x} cy={y} r={r} {...sc(tmNewmoon)} />
      <Circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={illustration.teal41}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    </G>
  );
}

export function TmLegendDot({ kind }: { kind: "sun" | "moon" }) {
  return (
    <Svg viewBox="0 0 24 24" width={16} height={16}>
      {kind === "sun" ? <TmSun x={12} y={12} r={6} /> : <TmNewMoon x={12} y={12} r={6} />}
    </Svg>
  );
}
import { tmNewmoon, tmSundot, tmSunray } from "@vedic-patro/design-tokens/classes/diagram-classes";

import { illustration } from "@vedic-patro/design-tokens";