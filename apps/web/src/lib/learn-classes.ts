import { cn } from "./utils";

/** Theme tokens + dark starfield (::before). Pair with tmPageShell. */
export const tmPageShell =
  "tm-page relative overflow-hidden text-[var(--tm-ink)] font-sans bg-card shadow-sm dark:bg-transparent dark:shadow-none";

export const tmWrap =
  "relative z-[1] mx-auto max-w-[1400px] px-4 py-8 space-y-8 sm:px-6";

export const tmHero = "py-12 pb-5 text-center";

export const tmHeroEyebrow =
  "text-xs font-semibold uppercase tracking-[0.18em] text-[var(--tm-gold)]";

export const tmHeroTitle =
  "mt-3.5 text-[clamp(28px,4vw,44px)] font-bold leading-tight tracking-tight [&_b]:font-bold [&_b]:text-[var(--tm-teal)]";

export const tmHeroSub =
  "mx-auto mt-[18px] max-w-[660px] text-pretty text-base leading-relaxed text-[var(--tm-ink-dim)]";

export const tmSection = "mt-14";

export const tmSecHead =
  "mb-2 flex flex-wrap items-baseline gap-3.5 max-[720px]:flex-col max-[720px]:gap-0.5";

export const tmSecKicker =
  "shrink-0 font-num text-sm font-bold tracking-wide text-[var(--tm-amber)]";

export const tmSecTitle =
  "m-0 text-[clamp(22px,3vw,30px)] font-bold leading-tight";

export const tmSecEn =
  "text-sm text-base uppercase tracking-[0.1em] text-[var(--tm-ink-faint)]";

export const tmLede =
  "mt-3 max-w-[760px] text-pretty text-base leading-relaxed text-[var(--tm-ink-dim)] [&_b]:font-semibold [&_b]:text-[var(--tm-ink)] [&_.hl]:font-semibold [&_.hl]:text-[var(--tm-teal)] [&_.hl-amber]:font-semibold [&_.hl-amber]:text-[var(--tm-amber)]";

const tmCardBase =
  "rounded-[14px] border border-[var(--tm-border)] bg-[var(--tm-card)] shadow-xs dark:shadow-[0_18px_50px_rgba(0,0,0,0.4)] dark:backdrop-blur-sm";

export const tmCard = cn(tmCardBase, "mt-5 p-5");

export const tmCardPadLg = cn(tmCardBase, "mt-5 p-3 pb-5");

export const tmCardCap =
  "mt-2 text-center text-sm text-base leading-relaxed text-[var(--tm-ink-faint)]";

export const tmFormula = "mt-5 flex flex-wrap gap-4";

export const tmFcard = cn(
  tmCardBase,
  "min-w-[220px] flex-1 p-5 dark:shadow-none",
  "[&_.big]:font-num [&_.big]:text-xl [&_.big]:font-bold [&_.big]:leading-none [&_.big]:text-[var(--tm-teal)]",
  "[&_.big_.u]:text-base [&_.big_.u]:text-[var(--tm-ink-dim)]",
  "[&_.lbl]:mt-2.5 [&_.lbl]:text-sm [&_.lbl]:font-semibold [&_.lbl]:text-[var(--tm-ink)]",
  "[&_.desc]:mt-1 [&_.desc]:text-sm [&_.desc]:leading-relaxed [&_.desc]:text-[var(--tm-ink-dim)]",
);

export const tmKeys =
  "mt-5 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5";

export const tmKey = cn(
  tmCardBase,
  "border-l-[3px] border-l-[var(--tm-amber)] p-4 px-[18px] dark:shadow-none",
  "[&_h4]:m-0 [&_h4]:mb-1.5 [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-[var(--tm-ink)]",
  "[&_p]:m-0 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-[var(--tm-ink-dim)]",
);

export const tmNote =
  "mx-auto mt-8 max-w-[720px] text-center text-sm leading-relaxed text-[var(--tm-ink-faint)]";

/* ── Data-driven article blocks (see lib/learn/article-render.tsx) ── */

/** Body paragraph — `tmLede` without its leading emphasis on first-line size. */
export const tmPara =
  "mt-4 max-w-[760px] text-pretty text-base leading-relaxed text-[var(--tm-ink-dim)]";

/** Inline emphasis spans produced by the article inline-markup parser. */
export const tmInkStrong = "font-semibold text-[var(--tm-ink)]";
export const tmInkTeal = "font-semibold text-[var(--tm-teal)]";
export const tmInkAmber = "font-semibold text-[var(--tm-amber)]";
export const tmInkNum =
  "font-num tabular-nums text-[0.95em] text-[var(--tm-ink)]";

export const tmFigure = cn(
  "mt-5 overflow-x-auto rounded-[14px] border border-[var(--tm-border)] bg-[var(--tm-card)] p-4 shadow-xs [-webkit-overflow-scrolling:touch]",
  "dark:shadow-[0_18px_50px_rgba(0,0,0,0.4)]",
);

/**
 * ASCII figures need a genuinely fixed-width font for their box-drawing rules
 * to line up — `font-num` is tabular-numeral, not monospace, and lets the
 * vertical bars wander. The stack leads with fonts that actually carry the
 * box-drawing block so those glyphs are not substituted from a proportional
 * fallback (which would break the alignment again).
 */
export const tmFigurePre =
  "m-0 whitespace-pre text-xs leading-[1.7] text-[var(--tm-ink-dim)] [font-family:'DejaVu_Sans_Mono','Liberation_Mono','Menlo','Consolas',ui-monospace,monospace] sm:text-sm";

/**
 * Worked calculation: the rule in an amber-ruled band, an optional symbol
 * glossary, then the numeric example aligned in two columns.
 *
 * Everything here is proportional type rather than a `<pre>` — an equation
 * only needs its *columns* to line up, which a grid does far better than
 * hand-counted spaces, and it lets the Nepali sit at its real size instead of
 * being squeezed into a monospace cell.
 */
export const tmCalc = cn(
  "mt-5 overflow-x-auto rounded-[14px] border border-[var(--tm-border)] bg-[var(--tm-card)] p-4 shadow-xs",
  "border-l-[3px] border-l-[var(--tm-amber)] [-webkit-overflow-scrolling:touch]",
  "dark:shadow-[0_18px_50px_rgba(0,0,0,0.4)]",
);

export const tmCalcRule =
  "space-y-1.5 font-num text-[0.95rem] leading-relaxed text-[var(--tm-ink)]";

export const tmCalcWhere = cn(
  "mt-3.5 grid gap-x-3 gap-y-1 border-t border-[var(--tm-border)] pt-3 text-[0.8rem]",
  "[&>div]:flex [&>div]:gap-2.5",
  "[&_dt]:min-w-[2.2rem] [&_dt]:shrink-0 [&_dt]:font-num [&_dt]:font-semibold [&_dt]:text-[var(--tm-amber)]",
  "[&_dd]:m-0 [&_dd]:text-[var(--tm-ink-dim)]",
);

export const tmCalcEg = cn(
  "mt-3.5 border-t border-[var(--tm-border)] pt-3 text-[0.82rem]",
  "[&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:py-[0.15rem]",
  "[&>div>span:first-child]:text-[var(--tm-ink-dim)]",
  "[&>div>span:last-child]:font-num [&>div>span:last-child]:tabular-nums [&>div>span:last-child]:text-[var(--tm-ink)]",
);

export const tmCalcResult =
  "mt-3 rounded-[9px] bg-[var(--tm-amber)]/10 px-3 py-2 text-[0.85rem] font-semibold text-[var(--tm-ink)]";

/**
 * Merged-page furniture: a jump list at the top, then one block per chapter.
 *
 * A long page needs both — the list so a reader can see the whole shape and
 * skip, and a ruled heading per chapter so the scroll never feels like one
 * undifferentiated wall.
 */
export const tmChapterNav = cn(
  "mb-10 rounded-[14px] border border-[var(--tm-border)] bg-[var(--tm-card)] px-5 py-4",
  "[&_ol]:m-0 [&_ol]:grid [&_ol]:list-none [&_ol]:gap-x-6 [&_ol]:gap-y-1.5 [&_ol]:p-0 sm:[&_ol]:grid-cols-2",
  "[&_a]:flex [&_a]:items-baseline [&_a]:gap-2 [&_a]:text-[0.92rem] [&_a]:text-[var(--tm-ink-dim)] [&_a]:no-underline",
  "[&_a:hover]:text-[var(--tm-ink)]",
  "[&_a>span]:font-num [&_a>span]:text-[0.78rem] [&_a>span]:font-semibold [&_a>span]:text-[var(--tm-amber)]",
);

export const tmChapterNavLabel =
  "mb-2.5 block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--tm-ink-dim)] opacity-70";

export const tmChapter = "scroll-mt-24 border-t border-[var(--tm-border)] pt-9 first-of-type:border-t-0 first-of-type:pt-0";

export const tmChapterTitle =
  "mb-1 text-[1.45rem] font-bold leading-tight tracking-tight text-[var(--tm-ink)] sm:text-[1.7rem]";

export const tmList =
  "mt-4 max-w-[760px] space-y-2 pl-1 text-base leading-relaxed text-[var(--tm-ink-dim)]";

export const tmListItem = "flex gap-2.5";

export const tmListMarker =
  "mt-[0.15em] shrink-0 font-num text-sm font-semibold text-[var(--tm-amber)]";

/** "See also" strip at the foot of an article. */
export const tmSeeAlso =
  "mt-12 grid gap-2.5 border-t border-[var(--tm-border)] pt-6 sm:grid-cols-2";

export const tmSeeAlsoItem =
  "group flex items-center gap-2.5 rounded-xl border border-[var(--tm-border)] bg-[var(--tm-card)] px-4 py-3 text-sm font-semibold text-[var(--tm-ink)] transition-colors hover:border-[var(--tm-teal)]";

export const motSliderRow = "flex w-full flex-col gap-1.5";

export const motSliderLabel =
  "text-sm font-semibold tracking-wide text-[var(--tm-ink-faint)]";

export const ssPhasesHeading =
  "m-0 mb-4 text-center text-base font-bold text-[var(--tm-ink)]";

export const ssPhasesList =
  "m-0 flex list-none flex-wrap justify-center gap-x-3 gap-y-[18px] p-0";

export const ssPhaseItem =
  "flex w-[108px] flex-col items-center gap-1.5 text-center";

export const ssPhaseMoon = "block h-[72px] w-[72px]";

export const ssPhaseNe =
  "text-sm font-bold leading-tight text-[var(--tm-ink)]";

export const ssPhaseEn =
  "text-sm text-base tracking-wide text-[var(--tm-ink-faint)]";

export const tmAmLegend =
  "mt-4 flex flex-wrap justify-center gap-[22px] [&_span]:inline-flex [&_span]:items-center [&_span]:gap-2 [&_span]:text-sm [&_span]:text-base [&_span]:text-[var(--tm-ink-dim)]";

export const tmLegAdhik =
  "inline-block h-4 w-4 rounded border-[1.6px] border-[var(--tm-amber)] bg-[color-mix(in_srgb,var(--tm-amber)_28%,transparent)]";

export const learnRefWrap =
  "mt-5 overflow-x-auto rounded-[14px] border border-[var(--tm-border)] bg-[var(--tm-card)] shadow-xs [-webkit-overflow-scrolling:touch]";

export const learnRefTable = cn(
  "w-full min-w-[520px] border-collapse text-sm leading-snug",
  "[&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[var(--tm-border)] [&_th]:bg-[color-mix(in_srgb,var(--tm-card)_92%,var(--tm-teal))] [&_th]:px-3 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[var(--tm-ink-faint)]",
  "[&_td]:border-b [&_td]:border-[color-mix(in_srgb,var(--tm-border)_70%,transparent)] [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-[var(--tm-ink-dim)]",
  "[&_tbody_tr:hover_td]:bg-[color-mix(in_srgb,var(--tm-teal)_4%,transparent)]",
  "[&_tbody_tr:last-child_td]:border-b-0",
);

export const learnRefCaption =
  "border-b border-[var(--tm-border)] px-4 pb-2.5 pt-3.5 text-left text-sm font-semibold text-[var(--tm-ink-dim)] [caption-side:top]";

export const learnRefHighlightRow =
  "[&_td]:bg-[color-mix(in_srgb,var(--tm-amber)_8%,transparent)] [&_td]:text-base [&_td]:text-[var(--tm-ink)]";

export const learnRefSym = "mr-1 text-base opacity-90";

export const learnRefDeg =
  "whitespace-nowrap text-xs text-[var(--tm-amber)]";

export const learnRefPada =
  "whitespace-nowrap text-sm text-base text-[var(--tm-teal)]";

export const learnRefSymNe = "max-w-[120px] text-sm";

export const learnRefNote = "mt-3 text-left";

export const learnHero =
  "rounded-3xl border border-border bg-gradient-to-br from-[color-mix(in_srgb,var(--card)_92%,var(--secondary)_8%)] to-card px-6 py-8 sm:px-10 sm:py-10";

export const learnStatPill =
  "inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--secondary)_25%,transparent)] bg-[color-mix(in_srgb,var(--secondary)_8%,var(--card))] px-4 py-2.5 text-sm font-semibold tracking-wide text-foreground";

/* ── Interactive diagram controls (elongation / eclipse sliders) ── */

export const edControls = "flex flex-col items-stretch gap-3.5 px-3.5 pb-1.5";

export const edReadout =
  "grid w-full grid-cols-2 items-start gap-x-[18px] gap-y-2.5 max-[720px]:gap-4 min-[560px]:grid-cols-4";

export const edRo = "flex min-w-0 flex-col gap-0.5";

export const edRoK =
  "text-sm font-semibold uppercase tracking-[0.12em] text-[var(--tm-ink-faint)]";

export function edRoV(opts?: { mono?: boolean; amber?: boolean }) {
  return cn(
    "min-h-[2.5em] text-lg font-bold leading-tight text-[var(--tm-ink)] [overflow-wrap:anywhere]",
    opts?.mono && "font-num tabular-nums text-[var(--tm-teal)]",
    opts?.amber && "text-[var(--tm-amber)]",
  );
}

export const edScrubWrap =
  "flex w-full shrink-0 items-center gap-3 box-border";

export const edPlayBtn =
  "grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--tm-border)] bg-[color-mix(in_srgb,var(--tm-teal)_16%,transparent)] text-base text-[var(--tm-ink)] hover:border-[var(--tm-teal)] hover:bg-[color-mix(in_srgb,var(--tm-teal)_26%,transparent)]";

export const edPresets = "flex w-full flex-wrap gap-1.5";

export function edPreset(active?: boolean) {
  return cn(
    "h-[30px] cursor-pointer rounded-full border border-[var(--tm-border)] bg-transparent px-3 text-sm font-semibold text-[var(--tm-ink-dim)] hover:border-[var(--tm-teal)] hover:text-[var(--tm-ink)]",
    active &&
      "border-transparent bg-primary font-bold text-primary-foreground dark:bg-[var(--tm-gold)] dark:text-[#1a1500]",
  );
}

/** Interactive study diagram SVG shell (replaces `.ed-svg` + size variants). */
export const edSvgBase =
  "block h-auto w-full touch-none overflow-visible";

export function edSvg(
  variant?: "tithi" | "mot" | "sol" | "ecl" | "sem" | "ho",
  grab?: boolean,
) {
  return cn(
    edSvgBase,
    variant === "tithi" && "min-h-[520px] max-h-[min(920px,88vh)]",
    variant === "mot" && "min-h-[360px] max-h-[min(700px,82vh)]",
    variant === "sol" && "min-h-[320px] max-h-[min(620px,78vh)]",
    variant === "ecl" && "min-h-[320px] max-h-[min(640px,78vh)] rounded-[18px]",
    variant === "sem" && "min-h-[300px]",
    variant === "ho" && "min-h-[280px]",
    grab && "cursor-grab active:cursor-grabbing",
  );
}

export const tmDiagramSvg = "block h-auto w-full";

export const ssRotSvg = "mx-auto block h-auto w-full max-w-[640px]";

export const tmCal = "mt-[18px] flex flex-wrap items-stretch gap-2";

export const tmCalCell =
  "min-w-[116px] flex-1 rounded-xl border border-[var(--tm-border)] bg-[color-mix(in_srgb,var(--tm-teal)_8%,transparent)] px-3.5 py-3";

export function tmCalCellDup(dup?: boolean) {
  return cn(
    tmCalCell,
    dup && "border-[var(--tm-amber)] bg-[color-mix(in_srgb,var(--tm-amber)_16%,transparent)]",
  );
}

export const tmCalGate =
  "font-num text-xs font-semibold text-[var(--tm-ink-faint)]";

export const tmCalTithi =
  "mt-0.5 text-lg font-bold text-[var(--tm-ink)]";

export const tmCalNo =
  "mt-0.5 text-sm text-base text-[var(--tm-ink-dim)]";

export const tmCalGap =
  "flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--tm-amber)] p-2 text-center opacity-90 [&_em]:text-sm [&_em]:font-semibold [&_em]:uppercase [&_em]:tracking-widest [&_em]:text-[var(--tm-ink-faint)] [&_em]:not-italic [&_span]:text-sm [&_span]:font-semibold [&_span]:text-[var(--tm-amber)]";

export const nakshatraIcon =
  "block shrink-0 text-foreground [&_.ax]:stroke-secondary dark:[&_.ax]:stroke-[var(--brand-yellow)] [&_.ax-f]:fill-secondary dark:[&_.ax-f]:fill-[var(--brand-yellow)] [&_.ax-f]:stroke-none [&_.fx]:fill-current [&_.fx]:stroke-none";
