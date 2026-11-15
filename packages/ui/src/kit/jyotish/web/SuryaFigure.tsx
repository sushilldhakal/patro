import { brand } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { figureInfo, suryaFigure, SURYA_FIGURE_BOX, type Shape, type Tone } from "@vedic-patro/drawing/learn/surya-figures";
import { useLocale } from "@vedic-patro/i18n/react";
import type { SuryaFigureProps } from "../contract";

const TONE: Record<Tone, string> = {
  ink: "var(--foreground)",
  muted: "var(--muted-foreground)",
  faint: "color-mix(in srgb, var(--foreground) 22%, transparent)",
  sun: brand.gold,
  moon: brand.offWhite,
  earth: "var(--primary)",
  accent: brand.saffron,
  shadow: "color-mix(in srgb, var(--foreground) 70%, var(--card))",
  planet: brand.verified,
};

function ShapeView({ s }: { s: Shape }) {
  if (s.k === "text") {
    return (
      <text x={s.x} y={s.y} textAnchor={s.anchor ?? "middle"} fontSize={s.size ?? 11} fontWeight={s.bold ? 600 : 400} fill={TONE[s.tone]}>
        {s.text}
      </text>
    );
  }
  const style = {
    fill: s.fill ? TONE[s.fill] : "none",
    stroke: s.stroke ? TONE[s.stroke] : "none",
    strokeWidth: s.w ?? 1,
    strokeDasharray: s.dash,
    opacity: s.opacity,
  };
  if (s.k === "circle") return <circle cx={s.x} cy={s.y} r={Math.max(0, s.r)} {...style} />;
  if (s.k === "line") return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...style} />;
  return <path d={s.d} {...style} />;
}

/** A Surya Siddhanta diagram: shapes and live numbers from @vedic-patro/drawing, same as the app. */
export function SuryaFigure({ figureKey, phase, controls, registerRef }: SuryaFigureProps) {
  const { lang } = useLocale();
  const language = lang === "en" ? "en" : "ne";
  const info = figureInfo(figureKey, language);
  const frame = suryaFigure(figureKey, phase, language);
  return (
    <figure ref={registerRef as ((node: HTMLElement | null) => void) | undefined} className={documentsClasses.figure}>
      <figcaption className={documentsClasses.figureTitle}>{info.title}</figcaption>
      <svg viewBox={`0 0 ${SURYA_FIGURE_BOX.width} ${SURYA_FIGURE_BOX.height}`} className="h-auto w-full max-w-xl" role="img" aria-label={info.caption}>
        {frame.shapes.map((s, i) => (
          <ShapeView key={i} s={s} />
        ))}
      </svg>
      <div className={documentsClasses.figureReadout} style={{ fontVariantNumeric: "tabular-nums" }}>
        {frame.readout.map((line, i) => (line ? <p key={i}>{line}</p> : null))}
      </div>
      <div className={`${documentsClasses.figureControls} flex`}>{controls}</div>
      <p className={documentsClasses.figureCaption}>{info.caption}</p>
    </figure>
  );
}
