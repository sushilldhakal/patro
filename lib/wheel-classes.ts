import { cn } from "./utils";

export const wheelHead =
  "pointer-events-none absolute top-4 left-4 right-32 z-20";

export const wheelHeadEyebrow =
  "text-body font-semibold uppercase tracking-[0.16em] text-[var(--w-ink-faint)]";

export const wheelHeadTitle =
  "text-title mt-1.5 font-bold text-[var(--w-ink)] max-[720px]: [&_.yr]:font-num [&_.yr]:text-[var(--w-accent)]";

export const wheelHeadSub =
  "text-body mt-1.5 font-num text-[var(--w-ink-dim)]";

export const wheelDock =
  "absolute bottom-[18px] left-1/2 z-[22] flex w-max max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-3.5 rounded-full border border-[var(--w-surface-border)] bg-[color-mix(in_srgb,var(--w-surface)_94%,#112c2a)] px-4 py-2.5 text-[var(--w-ink)] shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-md max-[720px]:gap-2 max-[720px]:px-2.5 max-[720px]:py-1.5 max-[480px]:gap-1.5 max-[480px]:px-2 max-[480px]:py-1";

export const wheelDockGrp =
  "flex items-center gap-2 max-[720px]:gap-1.5 max-[480px]:gap-1";

export const wheelDockTimeGrp = cn(wheelDockGrp, "min-w-0");

export const wheelDockSep =
  "h-[26px] w-px shrink-0 bg-[var(--w-surface-border)] max-[720px]:h-5 max-[480px]:h-4";

export const wheelIconBtn =
  "text-body grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--w-surface-border)] bg-transparent text-[var(--w-ink)] transition-colors hover:border-[var(--w-accent)] max-[720px]:h-7 max-[720px]:w-7 max-[720px]: max-[480px]:h-6 max-[480px]:w-6 max-[480px]:";

/** Native: use inline styles — `transition-*` / `animate-*` trigger Reanimated strict-mode warnings. */
export const wheelIconBtnNative =
  "text-body grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--w-surface-border)] bg-transparent text-[var(--w-ink)]";

export const wheelDockLabel =
  "text-body whitespace-nowrap text-[var(--w-ink-dim)] max-[720px]:hidden";

export const wheelDockVal =
  "text-body min-w-[58px] shrink-0 text-center font-num font-semibold tabular-nums text-[var(--w-ink)] max-[720px]:min-w-[44px] max-[720px]: max-[480px]:min-w-[38px] max-[480px]:";

/** Inline editable field inside the dock (jump-to-day / jump-to-time). */
export const wheelDockEditInput =
  "text-body rounded-md border border-[var(--w-accent)] bg-[color-mix(in_srgb,var(--w-surface)_92%,#112c2a)] px-1.5 py-0.5 text-center font-num font-semibold tabular-nums text-[var(--w-ink)] outline-none [color-scheme:dark] max-[720px]: max-[480px]:";

export const wheelDockTodayBtn =
  "text-body h-[30px] shrink-0 cursor-pointer rounded-full border-none bg-[var(--w-accent)] px-4 font-bold text-[#1a1205] active:translate-y-px max-[720px]:h-7 max-[720px]:px-2.5 max-[720px]: max-[480px]:h-6 max-[480px]:px-2 max-[480px]:";

export const wheelLegend =
  "pointer-events-none absolute bottom-[18px] left-4 z-20 flex flex-col gap-1.5 max-[720px]:hidden";

export const wheelLegendRow =
  "text-body flex items-center gap-1.5 text-[var(--w-ink-dim)]";

export const wheelLegendDot = "h-2 w-2 shrink-0 rounded-full";

export function wheelTip(show: boolean) {
  return cn(
    "pointer-events-none absolute z-30 min-w-[150px] max-w-[230px] -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-lg border border-[color-mix(in_srgb,var(--w-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--w-surface)_96%,#112c2a)] px-2.5 py-2 text-[var(--w-ink)] shadow-[0_8px_24px_rgba(0,0,0,0.55)] backdrop-blur-sm transition-opacity duration-150",
    show ? "opacity-100" : "opacity-0",
  );
}

export const wheelTipKind =
  "text-body font-semibold uppercase tracking-[0.12em] text-[var(--w-accent)]";

export const wheelTipTitle =
  "text-body mt-0.5 font-bold text-[var(--w-ink)]";

export const wheelTipRow =
  "text-body mt-1 flex justify-between gap-3 text-[var(--w-ink-dim)] [&_b]:font-semibold [&_b]:text-[var(--w-ink)]";

export const wheelTipSym =
  "text-body mt-1 font-normal text-[var(--w-ink-dim)]";

export function wheelPanel(open: boolean) {
  return cn(
    "absolute top-4 right-4 bottom-4 z-[25] flex w-80 max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-xl border border-[var(--w-surface-border)] bg-[color-mix(in_srgb,var(--w-surface)_96%,#112c2a)] text-[var(--w-ink)] shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-md transition-[transform,opacity] duration-[250ms] ease-out max-[720px]:top-auto max-[720px]:h-[52%] max-[720px]:w-[calc(100%-32px)]",
    open ? "translate-x-0 opacity-100" : "translate-x-[calc(100%+24px)] opacity-0 pointer-events-none",
  );
}

export const wheelPanelHead =
  "flex items-start gap-3 border-b border-[var(--w-surface-border)] px-[18px] pb-3.5 pt-[18px]";

export const wheelPanelIco =
  "grid h-14 w-14 shrink-0 place-items-center text-[var(--w-ink)] [&_svg]:h-full [&_svg]:w-full [&_.ax]:stroke-[var(--w-accent)] [&_.ax-f]:fill-[var(--w-accent)] [&_.ax-f]:stroke-none [&_.fx]:fill-current [&_.fx]:stroke-none";

export const wheelPanelGlyph =
  "text-display w-14 shrink-0 text-center text-[var(--w-ink)]";

export const wheelPanelKind =
  "text-body font-semibold uppercase tracking-[0.14em] text-[var(--w-accent)]";

export const wheelPanelTitle =
  "text-display m-0 mt-0.5 font-bold text-[var(--w-ink)]";

export const wheelPanelSub =
  "text-body mt-1 font-num text-[var(--w-ink-dim)]";

export const wheelPanelClose =
  "text-body ml-auto grid h-[30px] w-[30px] shrink-0 cursor-pointer place-items-center rounded-lg border border-[var(--w-surface-border)] bg-transparent text-[var(--w-ink-dim)] hover:border-[var(--w-accent)] hover:text-[var(--w-ink)]";

export const wheelPanelBody = "overflow-y-auto px-[18px] py-3.5 pb-5";

export const wheelDl = "flex flex-col";

export const wheelDlRow =
  "flex justify-between gap-3.5 border-b border-[var(--pn-ring-soft)] py-2.5 last:border-b-0";

export const wheelDlK =
  "text-body text-[var(--w-ink-dim)]";

export const wheelDlV =
  "text-body whitespace-nowrap text-right font-semibold text-[var(--w-ink)]";

export const wheelDlVMono = cn(wheelDlV, "font-num tabular-nums");

export const wheelPanelCons =
  "mt-3.5 flex items-center gap-3.5 rounded-lg bg-black/22 p-3.5";

export const wheelPanelConsTxt =
  "text-body w-full font-num leading-normal text-[var(--w-ink-dim)] [&_b]:mb-0.5 [&_b]:block [&_b]: [&_b]:font-semibold [&_b]:text-[var(--w-ink)]";

/* ── Wheel stage / SVG shell (`.pn-wheel` vars stay on parent) ── */

const wheelStageStars =
  "before:bg-[radial-gradient(1.2px_1.2px_at_18%_22%,rgba(233,243,241,0.5),transparent),radial-gradient(1px_1px_at_72%_16%,rgba(233,243,241,0.4),transparent),radial-gradient(1.4px_1.4px_at_84%_64%,rgba(233,243,241,0.45),transparent),radial-gradient(1px_1px_at_30%_78%,rgba(233,243,241,0.35),transparent),radial-gradient(1.2px_1.2px_at_58%_88%,rgba(233,243,241,0.4),transparent),radial-gradient(1px_1px_at_8%_56%,rgba(233,243,241,0.3),transparent),radial-gradient(1.1px_1.1px_at_92%_38%,rgba(233,243,241,0.4),transparent)]";

export const wheelStage = cn(
  "relative mx-auto min-h-0 w-full max-w-[1400px] overflow-hidden",
  "h-[min(calc(100dvh-env(safe-area-inset-top,0px)-64px-20px),960px)]",
  "max-[720px]:h-[min(calc(100dvh-env(safe-area-inset-top,0px)-64px-20px),640px)]",
  "bg-[radial-gradient(circle_at_50%_47%,var(--w-sky-0)_0%,var(--w-sky-1)_42%,var(--w-sky-2)_78%)]",
  "before:pointer-events-none before:absolute before:inset-0 before:opacity-70 before:content-['']",
  wheelStageStars,
);

export const wheelStageExpanded = cn(
  "relative mx-auto h-[calc(100dvh-20px)] min-h-0 max-h-[calc(100dvh-20px)] w-full max-w-none overflow-hidden",
  "bg-[radial-gradient(circle_at_50%_47%,var(--w-sky-0)_0%,var(--w-sky-1)_42%,var(--w-sky-2)_78%)]",
  "before:pointer-events-none before:absolute before:inset-0 before:opacity-70 before:content-['']",
  wheelStageStars,
);

export const wheelExpandedShell =
  "fixed inset-0 z-[120] max-w-none overflow-hidden rounded-none border-0 shadow-none";

export const wheelSvgWrap =
  "absolute inset-0 z-[1] grid touch-none place-items-center";

export function wheelSvg(dragging?: boolean) {
  return cn(
    "block h-full max-h-full w-full cursor-grab",
    dragging && "cursor-grabbing",
  );
}

/** Range input in wheel dock — pair with `.wheel-scrub` for thumb pseudo-elements. */
export const wheelScrub =
  "wheel-scrub h-2 w-[168px] shrink cursor-pointer touch-pan-x select-none [-webkit-tap-highlight-color:transparent] max-[720px]:w-[88px] max-[480px]:w-[72px] max-[480px]:h-1.5";

/** Active rewind/forward button — tinted when that direction is playing. */
export const wheelYearScrubBtnActive =
  "border-[var(--w-accent)] text-[var(--w-accent)] bg-[color-mix(in_srgb,var(--w-accent)_18%,transparent)]";

/** Current playback-speed badge (e.g. 8×) shown while autoplaying. */
export const wheelYearScrubSpeed =
  "text-body shrink-0 font-num font-bold tabular-nums text-[var(--w-accent)] tracking-tight max-[480px]:";
