import { useId } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { useLocale } from "@vedic-patro/i18n/react";
import { tmCardCap, tmCardPadLg, tmDiagramSvg } from "@vedic-patro/design-tokens/classes/learn-classes";
import {
  PIPELINE_ARROWS,
  PIPELINE_BOXES,
  PIPELINE_GRAHAS,
  PIPELINE_GROUPS,
  PIPELINE_H,
  PIPELINE_W,
  type PipelineAccent,
} from "@vedic-patro/domain/learn/server-pipeline";
import type { ServerPipelineDiagramProps } from "../contract";

function boxFill(accent?: PipelineAccent) {
  if (accent === "amber") return "color-mix(in srgb, var(--tm-amber) 14%, var(--tm-card))";
  if (accent === "gold") return "color-mix(in srgb, var(--tm-gold) 12%, var(--tm-card))";
  return "color-mix(in srgb, var(--tm-teal) 10%, var(--tm-card))";
}

function boxStroke(accent?: PipelineAccent) {
  if (accent === "amber") return "var(--tm-amber)";
  if (accent === "gold") return "var(--tm-gold)";
  return "var(--tm-teal)";
}

export function ServerPipelineDiagram({ earthSrc, grahaSrc }: ServerPipelineDiagramProps) {
  const { t } = useLocale();
  const caption = t("learn.study.pipeline.caption");
  const markerId = `pipe-arrow-${useId().replace(/:/g, "")}`;

  return (
    <figure className={tmCardPadLg}>
      <svg viewBox={`0 0 ${PIPELINE_W} ${PIPELINE_H}`} className={cn(tmDiagramSvg, "max-h-[min(520px,75vh)]")} role="img" aria-label={caption}>
        <defs>
          <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--tm-ink-faint)" />
          </marker>
        </defs>
        <image href={earthSrc} x="24" y="36" width="48" height="48" opacity={0.92} />
        <text x="80" y="58" className="fill-[var(--tm-ink-dim)] text-xs">
          {t("learn.study.pipeline.api_name")}
        </text>
        <text x="80" y="74" className="fill-[var(--tm-teal)] text-xs font-semibold">
          {t("learn.study.pipeline.api_transport")}
        </text>
        {PIPELINE_GROUPS.map((group) => (
          <text key={group.labelKey} x={group.x} y={group.y} className="fill-[var(--tm-amber)] text-diagram-sm font-bold uppercase tracking-wide">
            {t(group.labelKey)}
          </text>
        ))}
        {PIPELINE_BOXES.map((box) => {
          const lines = t(box.labelKey).split("\n");
          return (
            <g key={box.id}>
              <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={10} fill={boxFill(box.accent)} stroke={boxStroke(box.accent)} strokeWidth={1.2} opacity={0.95} />
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={box.x + box.w / 2}
                  y={box.y + box.h / 2 + (i - (lines.length - 1) / 2) * 13}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-[var(--tm-ink)] text-xs font-semibold"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
        <g transform="translate(520, 268)">
          {PIPELINE_GRAHAS.map((key, i) =>
            grahaSrc?.[key] ? (
              <image key={key} href={grahaSrc[key]} x={(i % 4) * 52} y={Math.floor(i / 4) * 52} width={40} height={40} opacity={0.9} />
            ) : null,
          )}
          <text x={0} y={118} className="fill-[var(--tm-ink-faint)] text-diagram-xs">
            {t("learn.study.pipeline.grahas_note")}
          </text>
        </g>
        {PIPELINE_ARROWS.map((d) => (
          <path key={d} d={d} fill="none" stroke="var(--tm-ink-faint)" strokeWidth={1.4} markerEnd={`url(#${markerId})`} opacity={0.85} />
        ))}
      </svg>
      <figcaption className={tmCardCap}>{caption}</figcaption>
    </figure>
  );
}
