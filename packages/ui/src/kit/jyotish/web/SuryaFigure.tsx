import { brand } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { figureInfo, figureView, suryaFigure, type KeyItem, type MathPart, type Shape, type Step, type Tone } from "@vedic-patro/drawing/learn/surya-figures";
import { useLocale } from "@vedic-patro/i18n/react";
import type { SuryaFigureProps } from "../contract";

const TONE: Record<Tone, string> = {
  ink: "var(--foreground)",
  muted: "var(--muted-foreground)",
  faint: "color-mix(in srgb, var(--foreground) 22%, transparent)",
  sun: brand.gold,
  moon: brand.offWhite,
  earth: "var(--surya-earth)",
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

function Swatch({ item }: { item: KeyItem }) {
  const c = TONE[item.tone];
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" className="shrink-0">
      {item.as === "line" ? (
        <line x1="1" y1="6" x2="17" y2="6" stroke={c} strokeWidth="3" strokeLinecap="round" />
      ) : item.as === "ring" ? (
        <circle cx="9" cy="6" r="4.5" fill="none" stroke={c} strokeWidth="1.6" />
      ) : (
        <circle cx="9" cy="6" r="5" fill={c} stroke="var(--muted-foreground)" strokeWidth="1.2" />
      )}
    </svg>
  );
}

/** What each mark and initial in the drawing stands for. */
function FigureKeyList({ items }: { items: KeyItem[] }) {
  return (
    <ul className={`${documentsClasses.figureKey} flex`}>
      {items.map((item, i) => (
        <li key={i} className={`${documentsClasses.figureKeyItem} flex`}>
          <Swatch item={item} />
          {item.mark ? <span className={documentsClasses.figureKeyMark} style={{ color: TONE[item.tone === "moon" ? "ink" : item.tone] }}>{item.mark}</span> : null}
          <span className={documentsClasses.figureKeyText}>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

function Part({ part }: { part: MathPart }) {
  if (typeof part === "string") return <span className="whitespace-pre-wrap">{part}</span>;
  return (
    <span className={documentsClasses.figureFracWeb}>
      <span className={documentsClasses.figureFracNum}>{part.n}</span>
      <span className={documentsClasses.figureFracDen}>{part.d}</span>
    </span>
  );
}

/** The worked arithmetic: each step a sentence, then its equation with stacked fractions. */
export function MathSteps({ steps, title }: { steps: Step[]; title: string }) {
  return (
    <details open className={documentsClasses.figureMath}>
      <summary className={`${documentsClasses.figureMathTitle} cursor-pointer`}>{title}</summary>
      <ol>
        {steps.map((step, i) => (
          <li key={i} className={`${documentsClasses.figureMathStep} flex`}>
            <span className={documentsClasses.figureMathNumber}>{i + 1}.</span>
            <div className={documentsClasses.figureMathBody}>
              <p className={documentsClasses.figureMathSay}>{step.say}</p>
              <div className={`${documentsClasses.figureMathEq} flex`} style={{ fontVariantNumeric: "tabular-nums" }}>
                {step.eq.map((part, j) => (
                  <Part key={j} part={part} />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** A Surya Siddhanta diagram: shapes and live numbers from @vedic-patro/drawing, same as the app. */
export function SuryaFigure({ figureKey, phase, controls, registerRef }: SuryaFigureProps) {
  const { lang, t } = useLocale();
  const language = lang === "en" ? "en" : "ne";
  const info = figureInfo(figureKey, language);
  const frame = suryaFigure(figureKey, phase, language);
  const view = figureView(figureKey, language);
  return (
    <figure ref={registerRef as ((node: HTMLElement | null) => void) | undefined} className={documentsClasses.figure}>
      <figcaption className={documentsClasses.figureTitle}>{info.title}</figcaption>
      <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="h-auto w-full max-w-xl" style={{ maxHeight: "28rem" }} role="img" aria-label={info.caption}>
        {frame.shapes.map((s, i) => (
          <ShapeView key={i} s={s} />
        ))}
      </svg>
      {frame.key?.length ? <FigureKeyList items={frame.key} /> : null}
      <div className={documentsClasses.figureReadout} style={{ fontVariantNumeric: "tabular-nums" }}>
        {frame.readout.map((line, i) => (line ? <p key={i}>{line}</p> : null))}
      </div>
      <div className={`${documentsClasses.figureControls} flex`}>{controls}</div>
      <p className={documentsClasses.figureCaption}>{info.caption}</p>
      {frame.steps?.length ? <MathSteps steps={frame.steps} title={t("documents.figure_math")} /> : null}
    </figure>
  );
}
