/**
 * Rashifal page and cards. The website is the source; apps/web and apps/mobile
 * both import these strings. Layout that differs between the DOM and React
 * Native (grid vs stack, `flex-row`, `inline-flex`, `truncate`) stays in each
 * app next to the key.
 */
export const rashifalClasses = {
  // ── Page ──────────────────────────────────────────────────────────────────
  eyebrow: "m-0 mt-1 text-xs uppercase tracking-eyebrow text-muted-foreground",
  navWrap: "mt-4",
  /** Period switch: active tab carries its label, the rest are icon-only. */
  tabBar:
    "mt-4 flex flex-wrap border border-border bg-surface-muted sm:max-w-md sm:rounded-lg sm:overflow-hidden",
  tab: "min-h-11 flex-1 rounded-none px-2 py-2.5",
  tabGapActive: "gap-1.5",
  tabGapIdle: "gap-0",
  /** App only: the web draws these with `after:` pseudo-elements. */
  tabActiveSurface: "bg-tab-active/70",
  tabIndicator: "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-secondary",
  tabLabel: "whitespace-nowrap text-xs font-bold text-foreground",
  profileWrap: "mt-3 flex flex-col items-center gap-1.5",
  profileError: "m-0 text-xs text-destructive",
  panel: "mt-6 flex flex-col gap-4",
  selectedBar: "flex items-center justify-center gap-1.5 text-sm text-secondary",
  selectedLink: "font-semibold underline underline-offset-2",
  methodNote: "m-0 text-center text-xs text-muted-foreground",
  intro: "m-0 text-center text-sm text-muted-foreground",
  statusBox:
    "rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center text-sm",
  personalWrap: "mx-auto w-full sm:max-w-md",
  signGrid: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",

  // ── Card ──────────────────────────────────────────────────────────────────
  card: "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
  cardPersonal:
    "flex min-w-0 flex-col overflow-hidden rounded-xl border border-secondary/40 bg-card",
  header:
    "flex items-start gap-3 border-b border-border bg-secondary/8 px-4 py-3 dark:bg-secondary/15",
  headerBody: "min-w-0 flex-1",
  name: "m-0 text-base font-bold leading-snug text-foreground",
  nameSub: "m-0 mt-1 text-xs leading-relaxed text-muted-foreground",
  taraBadge: "shrink-0 rounded-md px-2 py-0.5 text-diagram-xs font-bold uppercase tracking-wide",
  /** The badge's text in the app (React Native text does not inherit from the View). */
  taraBadgeText: "text-diagram-xs font-bold uppercase tracking-wide text-foreground",

  // ── Strength meter ────────────────────────────────────────────────────────
  meter: "flex items-center gap-2.5 border-b border-border/60 px-4 py-2.5",
  stars: "gap-0.5",
  star: "size-1.5 rounded-full",
  starOff: "bg-border",
  meterTrack: "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted",
  meterFill: "h-full rounded-full",
  percent: "shrink-0 font-num tabular-nums text-xs font-bold",
  grade:
    "m-0 border-b border-border/60 px-4 pb-2 text-diagram-xs font-semibold uppercase tracking-wide text-muted-foreground",
  dashaRow: "flex items-center gap-1.5 border-b border-border/60 bg-muted/20 px-4 py-2",
  dashaText: "text-xs font-semibold text-foreground",

  // ── Life areas ────────────────────────────────────────────────────────────
  domains: "border-b border-border/60 px-4 py-3",
  /** Web only: the three-column life-area grid. */
  domainGrid: "m-0 grid list-none grid-cols-3 gap-x-3 gap-y-2",
  domain: "m-0 min-w-0",
  domainHead: "flex items-center gap-1",
  domainLabel: "text-diagram-xs font-semibold text-muted-foreground",
  domainTrack: "mt-1 h-1 overflow-hidden rounded-full bg-muted",
  domainFill: "h-full rounded-full",

  prediction: "px-4 py-3.5 text-sm leading-relaxed text-foreground/90",

  // ── Lucky row ─────────────────────────────────────────────────────────────
  lucky: "gap-x-3 gap-y-1.5 border-t border-border bg-muted/25 px-4 py-2.5",
  luckyCell: "min-w-0 items-center gap-1.5",
  luckyValue: "text-xs font-semibold text-foreground",

  // ── "Why this reading" ────────────────────────────────────────────────────
  whyButton:
    "min-h-10 w-full items-center justify-between gap-2 border-t border-border px-4 py-2",
  whyLabel: "text-xs font-semibold text-muted-foreground",
  details: "border-t border-border bg-surface-muted px-4 py-3",
  componentList: "gap-1.5",
  /** Web only: the <ul> reset for the component list. */
  componentListReset: "m-0 flex list-none flex-col p-0",
  /** Web only: hover state of the details toggle. */
  whyButtonHover: "transition-colors hover:bg-muted/40 hover:text-foreground",
  componentRow: "items-baseline gap-2",
  componentLabel: "w-24 shrink-0 text-xs font-semibold text-foreground",
  componentNote: "min-w-0 flex-1 text-xs text-muted-foreground",
  componentValue: "shrink-0 font-num tabular-nums text-xs font-bold",
  lordLine: "m-0 mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground",
  footNote: "m-0 mt-2 text-xs text-muted-foreground",
  remedy: "m-0 mt-2 text-xs font-medium text-foreground/80",

  // ── Gochar chips ──────────────────────────────────────────────────────────
  gochar: {
    wrap: "border-t border-border/60 pt-3",
    list: "gap-1.5",
    chip: "items-center gap-1 rounded-md px-1.5 py-0.5",
    chipText: "text-diagram-xs font-semibold",
    toneVedha: "bg-tone-neutral",
    toneGood: "bg-tone-good",
    toneBad: "bg-tone-bad",
    house: "font-num tabular-nums opacity-80",
    legend: "mt-2 gap-x-3 gap-y-1",
    legendItem: "items-center gap-1",
    legendText: "text-diagram-xs text-muted-foreground",
  },

  // ── Profile picker ────────────────────────────────────────────────────────
  picker: {
    row: "flex-wrap items-center gap-2",
    label: "items-center gap-1.5",
    labelText: "text-sm font-medium text-foreground",
    signInButton: "rounded-lg border border-border bg-card px-2.5 py-1.5",
    signInText: "text-xs font-semibold text-primary",
    empty: "text-xs text-muted-foreground",
    select:
      "h-9 min-w-[10rem] max-w-[16rem] rounded-lg border border-border bg-card px-2.5 text-sm text-foreground",
    selectText: "text-sm text-foreground",
    /** App only: the web uses a native <select>. */
    menu: "w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card",
    menuItem: "px-3 py-2.5",
    menuItemDivider: "border-b border-border/60",
    menuItemActive: "bg-tab-active",
    menuText: "text-sm text-foreground",
  },
} as const;
