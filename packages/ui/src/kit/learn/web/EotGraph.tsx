import { useMemo } from "react";
import { useLocale } from "@vedic-patro/i18n/react";
import { illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { eotEarly, eotLate } from "@vedic-patro/design-tokens/classes/learn/diagram-colors";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { EOT_H, EOT_W, formatDuration, layoutEotGraph } from "@vedic-patro/domain/learn/eot-graph";
import type { EotGraphProps } from "../contract";

const NOW = illustration.sky53;
const GRID = illustration.sky29;

export function EotGraph({ eccentricity, tilt, dayOfYear, daysPerYear }: EotGraphProps) {
  const { t, lang, digits } = useLocale();
  const model = useMemo(
    () => layoutEotGraph(eccentricity, tilt, dayOfYear, daysPerYear, lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE),
    [eccentricity, tilt, dayOfYear, daysPerYear, lang],
  );
  const legend = [
    { color: NOW, label: t("panchanga.day_cycle.now") },
    { color: eotLate, label: t("learn.study.eot.sundial_late") },
    { color: eotEarly, label: t("learn.study.eot.sundial_early") },
  ];

  return (
    <figure className="m-0 w-full">
      <ul className="mb-1.5 flex list-none flex-wrap items-center justify-center gap-x-3 gap-y-1 p-0 text-diagram-xs text-white/80">
        {legend.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-md" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${EOT_W} ${EOT_H}`} className="block w-full" role="img" aria-label={t("learn.study.eot.aria")}>
        {model.ticks.map((tick) => (
          <g key={tick.sec}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={model.plotT}
              y2={model.plotB}
              stroke={GRID}
              strokeOpacity={tick.zero ? 0.85 : 0.45}
              strokeWidth={tick.zero ? 1 : 0.6}
            />
            <text x={tick.x} y={EOT_H - 8} textAnchor="middle" className="fill-current font-num text-diagram-2xs tabular-nums opacity-55">
              {formatDuration(tick.sec, digits)}
            </text>
          </g>
        ))}
        {model.months.map((month) => (
          <g key={month.key}>
            <line
              x1={model.plotL}
              x2={model.plotR}
              y1={month.y}
              y2={month.y}
              stroke={GRID}
              strokeOpacity={month.edge ? 0.7 : 0.45}
              strokeWidth={month.strong ? 1 : 0.6}
            />
            <text
              x={model.plotL - 6}
              y={month.y + 3}
              textAnchor="end"
              className="fill-current text-diagram-2xs"
              style={{ opacity: month.active ? 0.95 : 0.5 }}
              fontWeight={month.active ? 700 : 400}
            >
              {month.name}
            </text>
          </g>
        ))}
        <path d={model.latePath} fill={eotLate} />
        <path d={model.earlyPath} fill={eotEarly} />
        <line x1={model.plotL} x2={model.plotR} y1={model.markerY} y2={model.markerY} stroke={withAlpha(neutral.white, 0.4)} strokeWidth={1} />
        <circle cx={model.markerX} cy={model.markerY} r={5} fill={NOW} />
      </svg>
      <figcaption className="mt-1.5 text-xs leading-snug text-white/45">{t("learn.study.eot.caption")}</figcaption>
    </figure>
  );
}
