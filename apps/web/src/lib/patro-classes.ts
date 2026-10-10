import { cn } from "./utils";

/** Tabular monospace numerals (replaces legacy `.mono`). */
export const patroMono = "font-num tabular-nums";

/** Teal/yellow accent link used in aside panels and section headers. */
export const patroAsideLink =
  "shrink-0 text-xs text-base text-secondary no-underline whitespace-nowrap hover:underline";

export const patroEmpty =
  "m-0 py-5 text-center text-sm text-base";

export function patroAsideTab(active: boolean) {
  return cn(
    "relative min-h-9 min-w-0 flex-1 cursor-pointer rounded-none border-0 bg-transparent px-1.5 py-2.5 text-xs font-semibold leading-snug text-balance shadow-none transition-colors",
    "after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
    active
      ? "bg-tab-active/70 font-bold text-foreground after:bg-secondary dark:bg-primary/10 dark:after:bg-primary"
      : "text-muted-foreground after:bg-transparent hover:bg-tab-hover hover:text-foreground",
  );
}

export function patroMiniSubTab(active: boolean) {
  return cn(
    "min-w-0 cursor-pointer rounded-md border bg-surface-inset px-1 py-1.5 text-sm font-semibold leading-tight transition-colors",
    active
      ? "border-secondary/30 bg-tab-active font-bold text-foreground"
      : "border-transparent hover:bg-tab-hover hover:text-foreground",
  );
}

export function patroSaitCat(active: boolean) {
  return cn(
    "shrink-0 cursor-pointer whitespace-nowrap rounded-md border bg-surface-inset px-2.5 py-1.5 text-sm leading-tight font-semibold transition-colors",
    active
      ? "border-secondary/30 bg-tab-active font-bold text-foreground"
      : "border-transparent hover:bg-tab-hover hover:text-foreground",
  );
}

/** Below md: inset from viewport edges (max 768px rail); md+: span the parent column. */
export const patroMdRail =
  "mx-auto box-border w-full max-md:max-w-[min(768px,calc(100%-2rem))] md:max-w-none";

/** Compact date/time drawer trigger — content-sized, capped so toolbar fits beside it. */
export const patroMobilePickerBtn =
  "inline-flex h-[30px] w-max max-w-[min(100%,calc(10.5rem+5px))] shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 text-sm text-base text-foreground";

/** Prev/next step buttons flanking the mobile date picker — matches its chip. */
export const patroMobileStepBtn =
  "flex h-[25px] w-[25px] md:h-[30px] md:w-[30px] shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

export const patroMonthNavShell =
  "inline-flex w-max max-w-full shrink-0 flex-nowrap items-center gap-0.5 max-md:gap-0.5 sm:gap-1.5";

export const patroMonthNavDivider =
  "flex items-center gap-1 border-l border-border pl-1.5 sm:gap-1.5 sm:pl-2";

export const patroMonthSelect =
  "h-8 min-w-0 max-w-[9.5rem] cursor-pointer rounded-lg border border-border bg-card px-2.5 text-sm text-base text-foreground sm:max-w-none";

export const patroMonthYearSelect =
  "h-8 w-[5.25rem] cursor-pointer rounded-lg border border-border bg-card px-2.5 text-sm text-base text-foreground";

export const patroMonthNavBtn =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

export const patroMonthTodayBtn =
  "h-8 cursor-pointer rounded-lg border-none bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-xs transition-[filter,transform] hover:brightness-105 active:translate-y-px sm:px-4 sm:text-sm";

export const patroMonthChipShell =
  "flex w-[2.5rem] shrink-0 flex-col overflow-hidden rounded-[8px] border border-border bg-card shadow-sm sm:w-[3.25rem] sm:rounded-[10px]";

export const patroMonthChipButton =
  "cursor-pointer transition-[filter,transform,box-shadow] hover:brightness-[1.03] hover:shadow-md active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const patroMonthChipHead =
  "truncate bg-secondary px-0.5 text-center text-[14px] font-bold leading-[20px] tracking-wide text-secondary-foreground flex h-[26px] items-center justify-center sm:px-1";

export const patroMonthChipDay =
  "flex h-[32px] items-center justify-center bg-card text-sm font-bold leading-none text-foreground sm:text-base";

/**
 * Day-span "body" of the month chip — used where there is no day numeral.
 * Names the month's own length (१-३२ for a 32-day Saun) instead of the abstract
 * dot grid it replaced, which read as a decorative icon rather than data.
 */
export const patroMonthChipSpan =
  "flex h-[32px] items-center justify-center bg-card px-0.5 font-num text-xs line-height-[1.2] font-bold leading-snug tracking-tight tabular-nums text-foreground sm:text-xs";

export const patroMonthRangeNav =
  "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-1 py-1 shadow-xs sm:gap-2";

export const patroMonthRangeLabel =
  "min-w-0 px-1 text-sm text-base leading-snug text-foreground sm:text-sm";

export const patroMonthRangeRow =
  "inline-flex max-w-full items-center gap-0.5 sm:gap-1";

export const patroMonthRangeCompactLabel =
  "min-w-0 whitespace-nowrap text-sm text-base leading-none sm:text-xs";

export const patroMonthRangeCompactTrigger =
  "cursor-pointer rounded px-0.5 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const patroMonthRangeCompactBtn =
  "flex h-5 w-5 max-md:h-5 max-md:w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-card transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40";

export function patroSegBtn(active: boolean) {
  return cn(
    "h-[26px] cursor-pointer rounded-[calc(var(--radius-lg)-2px)] border-none px-3 text-xs font-semibold transition-colors",
    active
      ? "bg-secondary text-secondary-foreground"
      : "bg-transparent",
  );
}

export function patroFestRow(opts: { today?: boolean; past?: boolean }) {
  return cn(
    "grid min-h-10 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border/60 px-2.5 py-2 last:border-b-0",
    opts.today && "bg-fest-today",
    opts.past && "opacity-55",
  );
}

type Tone = "best" | "good" | "neutral" | "bad" | "worst";

const NAVATARA_TONE_BG: Record<Tone, string> = {
  best: "bg-tone-best",
  good: "bg-tone-good",
  neutral: "bg-tone-neutral",
  bad: "bg-tone-bad",
  worst: "bg-tone-worst",
};

export function patroNavataraToneBg(tone: Tone): string {
  return NAVATARA_TONE_BG[tone] ?? "bg-surface-inset";
}

export function patroNavataraRow(tone: Tone, current?: boolean) {
  return cn(
    "flex min-w-0 flex-col items-center gap-0.5 rounded-md p-1.5 text-center",
    NAVATARA_TONE_BG[tone] ?? "bg-surface-inset",
    current && "shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--accent)_45%,transparent)]",
  );
}

export function patroSlotRow(tone: "good" | "bad" | "neutral", nightStart?: boolean) {
  return cn(
    "flex min-w-0 flex-row items-start justify-between gap-1.5 rounded-md p-1.5 text-xs",
    tone === "good" && "bg-slot-good",
    tone === "bad" && "bg-slot-bad",
    tone === "neutral" && "bg-slot-neutral",
    nightStart && "shadow-[inset_0_2px_0_color-mix(in_srgb,var(--border)_80%,transparent)]",
  );
}

/** Element table rows: auspicious / inauspicious / neutral background. */
export function patroGoodBadTone(good: boolean, bad: boolean): string {
  if (bad) return "bg-danger/10 text-danger";
  if (good) return "bg-success/12 text-success-foreground dark:text-success";
  return "bg-foreground/4 text-foreground";
}

export function patroSlotBadge(tone: "good" | "bad" | "neutral") {
  return cn(
    "shrink-0 rounded-full px-1.5 py-0.5 text-sm font-bold leading-none whitespace-nowrap",
    tone === "good" && "bg-badge-good text-secondary",
    tone === "bad" && "bg-badge-bad text-danger",
    tone === "neutral" && "bg-badge-neutral",
  );
}

export const patroSelect =
  "h-8 cursor-pointer rounded-[var(--radius-lg)] border border-border bg-card px-2.5 text-sm text-base text-foreground";

export const patroNoteBox =
  "mb-4 rounded-xl border border-border bg-secondary/8 p-3 text-sm leading-relaxed";

export const patroErrorBox =
  "rounded-lg border border-danger/30 bg-error-surface px-3 py-2.5 text-sm text-base text-danger";

export const patroSkel =
  "block h-7 w-4/5 mx-auto rounded animate-pulse bg-foreground/5";

export const patroAyanaNorth =
  "mb-0.5 inline-block text-xs font-extrabold leading-none text-accent dark:text-accent";

export const patroAyanaSouth =
  "mb-0.5 inline-block text-xs font-extrabold leading-none text-danger opacity-95";

export const patroDataTableWrap =
  "overflow-x-auto rounded-[14px] border border-border bg-card";

export const patroSunRise =
  "block text-sm font-semibold text-accent dark:text-accent";

export const patroSunSet =
  "block text-sm font-semibold text-danger/90";

export const patroCard =
  "overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]";

export const patroSecBand =
  "flex flex-wrap items-baseline gap-2.5 border-b border-border bg-secondary/[0.09] px-4 py-2.5 dark:bg-secondary/20";

export const patroHeroPill =
  "text-sm font-semibold leading-none whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-2.5 py-1.5 text-white";

export function patroHeroPillEv(kind: "public" | "festival") {
  return cn(
    patroHeroPill,
    kind === "public" &&
      "border-[rgba(255,120,120,0.35)] bg-[rgba(255,90,90,0.16)] text-[#ffb4b4]",
    kind === "festival" &&
      "border-[rgba(0,200,210,0.35)] bg-[rgba(0,170,180,0.18)] text-[#8fe3e8]",
  );
}

export const patroWheelShell = "overflow-hidden rounded-2xl border border-border";

/**
 * Table header row/cell styling. NOTE: these are intentionally NOT
 * `position: sticky` to the page (top offset). Every one of these tables
 * lives inside an `overflow-x-auto` wrapper (needed for horizontal scroll
 * on narrow screens), and per the CSS overflow spec, `overflow-x: auto`
 * forces `overflow-y` to compute as `auto` too — which makes that wrapper
 * the sticky positioning's scrolling ancestor instead of the page. Since
 * the wrapper never actually scrolls internally (the page scrolls, not the
 * div), a page-pinned header computed relative to it renders at the wrong
 * offset and overlaps into the table body (verified: it lands on top of
 * the first data row, hiding its text). Left-0 stickiness for frozen first
 * columns is unaffected (that axis's scrolling ancestor genuinely does
 * scroll) and is kept below.
 */
export const patroStickyHeadRow = "bg-muted hover:bg-muted";
export const patroStickyHeadCell = "bg-muted";
export const patroStickyHeadCorner = "sticky z-50 bg-muted left-0";
/** Second header row (e.g. graha sub-headers) below the first header row. */
export const patroStickySubHeadCell = "bg-muted/60";
export const patroStickySubHeadCorner = "sticky z-50 bg-muted/60 left-0";

export const GANA_PILL_CLASS: Record<string, string> = {
  "देव": "bg-emerald-500/25 text-emerald-300",
  "नर": "bg-sky-500/25 text-sky-300",
  "राक्षस": "bg-rose-500/25 text-rose-300",
};

export const GANA_SWATCH_CLASS: Record<string, string> = {
  "देव": "bg-[var(--av-gana-dev)]",
  "नर": "bg-[var(--av-gana-nar)]",
  "राक्षस": "bg-[var(--av-gana-rak)]",
};

export const patroHeroMonthOverlay =
  "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-black/82 via-black/55 to-black/40";

export const patroHeroMonthShell =
  "relative isolate overflow-hidden bg-cover bg-center bg-no-repeat";

export const patroHeroGrid = cn(
  "pointer-events-none absolute inset-0 -z-10",
  "bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]",
  "bg-size-[48px_48px]",
  "[mask-image:radial-gradient(circle_at_50%_0%,#000_30%,transparent_80%)]",
);
