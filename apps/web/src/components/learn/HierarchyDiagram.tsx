/**
 * सबै कसरी जोडिन्छ — the hierarchy, drawn.
 *
 * Three motions, three streams, one date. Earth's rotation gives the day and
 * the vaara; the Sun's path through the zodiac gives rashi, sankranti and the
 * solar month; the Moon's angle from the Sun gives tithi, paksha and the lunar
 * month. The two *māna* are the middle two streams named, and everything
 * converges on the panchanga and, from there, on a single Bikram Sambat date.
 *
 * SVG rather than a 3D scene: this is a flow, not a place. Nothing here has a
 * position in the sky, and what the reader needs is legible bilingual type and
 * a structure that survives being 360px wide.
 *
 * Two layouts from one model. The three-column tree is what the section is
 * about — parallel streams converging — but at phone width three columns of
 * Devanagari are unreadable, so a narrow screen gets the same nodes stacked,
 * colour-coded so the three streams stay distinguishable. Which one shows is a
 * CSS decision, so there is no measurement and no layout flash.
 */

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { tmCardCap, tmCardPadLg } from "@/lib/learn-classes";
import { cn } from "@/lib/utils";

type Accent = "teal" | "amber" | "sky";

/**
 * The tree is built at module scope, where no hook can run, so every node
 * carries its catalogue key and the translation happens at the render site.
 */
type Branch = {
  id: string;
  accent: Accent;
  source: string;
  /** What the motion actually is, under the body's name. */
  driver: string;
  /** The chain this motion produces, in order. */
  steps: string[];
  /** Edge annotations, one per step — the rule that produces it. */
  rules: (string | null)[];
  /** The measurement system this stream is called, where it has a name. */
  mana: string | null;
};

const BRANCHES: Branch[] = [
  {
    id: "earth",
    accent: "teal",
    source: "grahas.earth",
    driver: "learn.diagrams.hierarchy_driver_earth",
    steps: ["learn.playground.day", "learn.diagrams.hierarchy_step_vaara"],
    rules: ["learn.diagrams.hierarchy_rule_one_turn", null],
    mana: null,
  },
  {
    id: "sun",
    accent: "amber",
    source: "grahas.sun",
    driver: "learn.diagrams.hierarchy_driver_sun",
    steps: [
      "learn.diagrams.hierarchy_step_rashi",
      "learn.diagrams.hierarchy_step_sankranti",
      "learn.diagrams.hierarchy_step_solar_month",
    ],
    rules: [
      "learn.diagrams.hierarchy_rule_rashi_span",
      "learn.diagrams.hierarchy_rule_boundary",
      null,
    ],
    mana: "learn.diagrams.hierarchy_mana_solar",
  },
  {
    id: "moon",
    accent: "sky",
    source: "grahas.moon",
    driver: "learn.diagrams.hierarchy_driver_moon",
    steps: ["tithi", "learn.diagrams.hierarchy_step_paksha", "learn.diagrams.hierarchy_step_lunar_month"],
    rules: [
      "learn.diagrams.hierarchy_rule_tithi_span",
      "learn.diagrams.hierarchy_rule_paksha_count",
      "learn.diagrams.hierarchy_rule_month_count",
    ],
    mana: "learn.diagrams.hierarchy_mana_lunar",
  },
];

const TOP = "learn.diagrams.hierarchy_top";
const CONVERGE = "learn.diagrams.hierarchy_converge";
const RESULT = "learn.diagrams.hierarchy_result";
const RESULT_SUB = "learn.diagrams.hierarchy_result_fields";

function accentVar(accent: Accent): string {
  /* Only three accents exist as tokens; the Moon borrows the app's cool blue
     so its stream reads apart from the Sun's warm one in both themes. */
  return accent === "amber"
    ? "var(--tm-amber)"
    : accent === "teal"
      ? "var(--tm-teal)"
      : "#5aa9e6";
}

/* ── shared node ──────────────────────────────────────────────────────── */

function Node({
  x,
  y,
  w,
  h,
  accent,
  title,
  sub,
  strong,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  accent?: Accent;
  title: string;
  sub?: string;
  /** The three nodes the whole diagram builds toward. */
  strong?: boolean;
}) {
  const color = accent ? accentVar(accent) : "var(--tm-gold)";
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={11}
        fill={`color-mix(in srgb, ${color} ${strong ? 16 : 9}%, var(--tm-card))`}
        stroke={color}
        strokeWidth={strong ? 1.7 : 1.15}
        opacity={0.98}
      />
      <text
        x={x + w / 2}
        y={y + (sub ? h / 2 - 8 : h / 2)}
        textAnchor="middle"
        dominantBaseline="middle"
        className={cn(
          "fill-[var(--tm-ink)] font-bold",
          strong ? "text-[15px]" : "text-[13.5px]",
        )}
      >
        {title}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-[var(--tm-ink-faint)] text-[10.5px]"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

/** A vertical connector with the rule that drives it written alongside. */
function Down({
  x,
  from,
  to,
  color,
  rule,
  ruleSide = 1,
}: {
  x: number;
  from: number;
  to: number;
  color: string;
  rule?: string;
  /** 1 puts the caption to the right of the line, −1 to the left. */
  ruleSide?: number;
}) {
  return (
    <g>
      <path
        d={`M${x},${from} L${x},${to}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.65}
        markerEnd="url(#hier-arrow)"
      />
      {rule && (
        <text
          x={x + 7 * ruleSide}
          y={(from + to) / 2}
          textAnchor={ruleSide > 0 ? "start" : "end"}
          dominantBaseline="middle"
          className="fill-[var(--tm-ink-faint)] text-[9.5px] font-semibold"
        >
          {rule}
        </text>
      )}
    </g>
  );
}

function ArrowDefs() {
  return (
    <defs>
      <marker id="hier-arrow" markerWidth="7" markerHeight="7" refX="5.6" refY="3.5" orient="auto">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" opacity={0.75} />
      </marker>
    </defs>
  );
}

/* ── wide: three streams, side by side, converging ────────────────────── */

const W = { colW: 214, gap: 24, nodeH: 46, srcH: 54 };

function WideLayout() {
  const { t } = useTranslation();
  const cols = BRANCHES.length;
  const width = cols * W.colW + (cols - 1) * W.gap + 32;
  const xs = BRANCHES.map((_, i) => 16 + i * (W.colW + W.gap) + W.colW / 2);
  const mid = width / 2;

  /* Row bands. The Earth stream is one step shorter than the other two, so it
     simply runs its connector past the empty band rather than being padded
     with a node that would claim something exists there. */
  const yTop = 14;
  const ySrc = 104;
  const yStep = [196, 274, 352];
  const yMana = 440;
  const yConverge = 522;
  const yResult = 608;
  const height = yResult + 62 + 14;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full text-[var(--tm-ink-faint)]"
      role="img"
      aria-label={t("learn.diagrams.hierarchy_wide_aria")}
    >
      <ArrowDefs />

      <Node
        x={mid - 110}
        y={yTop}
        w={220}
        h={W.nodeH}
        title={t(TOP)}
        strong
      />

      {/* The fan from one motion into three streams. */}
      <path
        d={`M${mid},${yTop + W.nodeH} L${mid},${ySrc - 26} M${xs[0]},${ySrc - 26} L${xs[2]!},${ySrc - 26}`}
        fill="none"
        stroke="var(--tm-ink-faint)"
        strokeWidth={1.4}
        opacity={0.55}
      />

      {BRANCHES.map((b, i) => {
        const x = xs[i]!;
        const color = accentVar(b.accent);
        const lastY = yStep[b.steps.length - 1]! + W.nodeH;
        return (
          <g key={b.id} style={{ color }}>
            <Down x={x} from={ySrc - 26} to={ySrc} color={color} />
            <Node
              x={x - W.colW / 2}
              y={ySrc}
              w={W.colW}
              h={W.srcH}
              accent={b.accent}
              title={t(b.source)}
              sub={t(b.driver)}
              strong
            />
            <Down x={x} from={ySrc + W.srcH} to={yStep[0]!} color={color} rule={b.rules[0] ? t(b.rules[0]) : undefined} />
            {b.steps.map((s, k) => (
              <g key={k}>
                <Node
                  x={x - W.colW / 2}
                  y={yStep[k]!}
                  w={W.colW}
                  h={W.nodeH}
                  accent={b.accent}
                  title={t(s)}
                />
                {k < b.steps.length - 1 && (
                  <Down
                    x={x}
                    from={yStep[k]! + W.nodeH}
                    to={yStep[k + 1]!}
                    color={color}
                    rule={b.rules[k + 1] ? t(b.rules[k + 1]!) : undefined}
                  />
                )}
              </g>
            ))}

            {b.mana ? (
              <>
                <Down x={x} from={lastY} to={yMana} color={color} />
                <Node
                  x={x - W.colW / 2}
                  y={yMana}
                  w={W.colW}
                  h={W.nodeH}
                  accent={b.accent}
                  title={t(b.mana)}
                  strong
                />
                <path
                  d={`M${x},${yMana + W.nodeH} L${x},${yConverge - 26}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.65}
                />
              </>
            ) : (
              <path
                d={`M${x},${lastY} L${x},${yConverge - 26}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.65}
                strokeDasharray="4 4"
              />
            )}
          </g>
        );
      })}

      {/* Three streams gathered into one. */}
      <path
        d={`M${xs[0]},${yConverge - 26} L${xs[2]!},${yConverge - 26}`}
        fill="none"
        stroke="var(--tm-ink-faint)"
        strokeWidth={1.4}
        opacity={0.55}
      />
      <g style={{ color: "var(--tm-gold)" }}>
        <Down x={mid} from={yConverge - 26} to={yConverge} color="var(--tm-gold)" />
      </g>
      <Node x={mid - 118} y={yConverge} w={236} h={W.nodeH} title={t(CONVERGE)} strong />
      <g style={{ color: "var(--tm-gold)" }}>
        <Down x={mid} from={yConverge + W.nodeH} to={yResult} color="var(--tm-gold)" />
      </g>
      <Node
        x={mid - 150}
        y={yResult}
        w={300}
        h={62}
        title={t(RESULT)}
        sub={t(RESULT_SUB)}
        strong
      />
    </svg>
  );
}

/* ── narrow: the same nodes, stacked ──────────────────────────────────── */

function StackedLayout() {
  const { t } = useTranslation();
  const width = 340;
  const nodeW = 250;
  const x = width / 2;
  const nodeH = 42;
  const srcH = 50;
  const gapArrow = 26;

  /* Laid out by walking down and accumulating, so adding a step to any branch
     never means re-deriving a table of constants by hand. */
  const rows = useMemo(() => {
    const out: {
      kind: "node";
      y: number;
      h: number;
      title: string;
      sub?: string;
      accent?: Accent;
      strong?: boolean;
      ruleAbove?: string;
      color: string;
    }[] = [];
    let y = 12;
    const push = (
      h: number,
      title: string,
      color: string,
      opts: { sub?: string; accent?: Accent; strong?: boolean; ruleAbove?: string } = {},
    ) => {
      out.push({ kind: "node", y, h, title, color, ...opts });
      y += h + gapArrow;
    };

    push(nodeH, t(TOP), "var(--tm-gold)", { strong: true });
    for (const b of BRANCHES) {
      const color = accentVar(b.accent);
      push(srcH, t(b.source), color, {
        sub: t(b.driver),
        accent: b.accent,
        strong: true,
      });
      b.steps.forEach((s, k) => {
        push(nodeH, t(s), color, {
          accent: b.accent,
          ruleAbove: b.rules[k] ? t(b.rules[k]!) : undefined,
        });
      });
      if (b.mana) {
        push(nodeH, t(b.mana), color, { accent: b.accent, strong: true });
      }
    }
    push(nodeH, t(CONVERGE), "var(--tm-gold)", { strong: true });
    push(56, t(RESULT), "var(--tm-gold)", { sub: t(RESULT_SUB), strong: true });
    return { out, height: y - gapArrow + 12 };
  }, [t]);

  return (
    <svg
      viewBox={`0 0 ${width} ${rows.height}`}
      className="block h-auto w-full text-[var(--tm-ink-faint)]"
      role="img"
      aria-label={t("learn.diagrams.hierarchy_stacked_aria")}
    >
      <ArrowDefs />
      {rows.out.map((r, i) => {
        const prev = rows.out[i - 1];
        return (
          <g key={i} style={{ color: r.color }}>
            {prev && (
              <Down
                x={x}
                from={prev.y + prev.h}
                to={r.y}
                color={r.color}
                rule={r.ruleAbove}
              />
            )}
            <Node
              x={x - nodeW / 2}
              y={r.y}
              w={nodeW}
              h={r.h}
              accent={r.accent}
              title={r.title}
              sub={r.sub}
              strong={r.strong}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function HierarchyDiagram() {
  const { t } = useTranslation();

  return (
    <figure className={tmCardPadLg}>
      <div className="hidden min-[720px]:block">
        <WideLayout />
      </div>
      <div className="min-[720px]:hidden">
        <StackedLayout />
      </div>
      <figcaption className={tmCardCap}>
        {t("learn.diagrams.hierarchy_caption")}
      </figcaption>
    </figure>
  );
}

export default HierarchyDiagram;
