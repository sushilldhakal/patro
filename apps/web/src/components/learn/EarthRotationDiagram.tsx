import { EarthGlobeImage } from "./EarthGlobeImage";
import { useTranslation } from "react-i18next";
import { ssRotArrowHead, ssRotAxis, ssRotCurve, ssRotDir, ssRotGlow, ssRotLabel, ssRotPole } from "@/lib/diagram-classes";
import { ssRotSvg } from "@/lib/learn-classes";
import { useLocale } from "@/i18n/locale";

const W = 640;
const H = 220;
const cx = W / 2;
const cy = H / 2 + 8;
const r = 124;

export function EarthRotationDiagram() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const fmt = (n: number) => digits(n);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={ssRotSvg} aria-hidden>
      <defs>
        <marker id="ss-rot-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" className={ssRotArrowHead} />
        </marker>
      </defs>

      <text x={72} y={cy - 4} className={ssRotDir} textAnchor="middle">
        {t("learn.west")}
      </text>
      <text x={W - 72} y={cy - 4} className={ssRotDir} textAnchor="middle">
        {t("learn.east")}
      </text>

      <line x1={100} y1={cy} x2={W - 100} y2={cy} className={ssRotAxis} />

      <EarthGlobeImage cx={cx} cy={cy} r={r} glow glowClassName={ssRotGlow} glowPad={10} />
      <line x1={cx} y1={cy - r - 6} x2={cx} y2={cy + r + 6} className={ssRotPole} />
      <path
        d={`M ${cx - 38} ${cy + 44} A 46 46 0 1 1 ${cx + 38} ${cy + 44}`}
        className={ssRotCurve}
        fill="none"
        markerEnd="url(#ss-rot-arrow)"
      />
      <text x={cx} y={cy + 72} className={ssRotLabel} textAnchor="middle">
        {t("learn.west_east")} · ~{fmt(24)} {t("learn.hours")}
      </text>
    </svg>
  );
}
