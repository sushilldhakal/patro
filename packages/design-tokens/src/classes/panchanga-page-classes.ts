import { spec } from "../specs";

/**
 * Panchanga main page, its sections and chrome. The website is the source;
 * apps/web and apps/mobile both import these strings. Shared section/card
 * surfaces live in ../panchanga-classes.ts (panchangaSection, panchangaCardBase
 * ...); this file holds everything else on the page.
 *
 * Layout that differs between the DOM and React Native (`flex` / `flex-row`,
 * `grid`, `inline-flex`, `truncate`, `sticky`) stays in each app next to the key.
 */
export const panchangaPageClasses = {
  // ── Page (pages/Panchanga.tsx, app/(tabs)/panchanga/index) ────────────────
  page: {
    shell: "mx-auto max-w-page pb-16 pt-4",
    grid: "mt-2 gap-x-5 gap-y-4",
    mainColumn: "min-w-0 gap-4",
    aside: "min-w-0 gap-4",
    sections: "mt-4 min-w-0 gap-4",
    sectionStack: "gap-3",
    yearLink: "h-9 items-center gap-2 self-start rounded-xl border border-border bg-card px-4",
    yearLinkText: "text-sm font-semibold text-foreground",
    errorBox: "rounded-xl border border-destructive/20 bg-destructive/10 p-4",
    errorText: "text-sm text-destructive",
  },

  // ── Section building blocks (PanchangaLayout) ────────────────────────────
  planetMenu: {
    trigger:
      "flex h-9 w-9 items-center justify-center rounded-full border border-wheel-control-border bg-wheel-control shadow-[0_8px_20px_rgba(0,0,0,0.4)]",
    list: "fixed z-[81] w-[228px] overflow-hidden rounded-2xl border border-wheel-control-border bg-wheel-control py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
    option: "flex w-full items-center gap-2.5 px-3 py-2 text-left text-base text-ill-midnight-foam",
    swatch: "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
  },

  layout: {
    balamCard: "min-w-[8.5rem] gap-1 border-transparent",
    lagnaCard: "min-w-[8.5rem] gap-1",
    timingCard: "gap-1.5",
    timingHighlight: "border-success/45 bg-success/[0.06]",
    timingLabel: "whitespace-normal text-sm font-semibold sm:whitespace-nowrap",
    timingLabelGood: "text-success",
    timingLabelIdle: "text-muted-foreground",
    timingTime: "font-mono text-sm font-semibold tabular-nums whitespace-normal sm:whitespace-nowrap",
    timingNote: "font-mono text-xs text-muted-foreground whitespace-normal sm:whitespace-nowrap",
    chipGroupCard: "gap-2",
    chipGroupTitle:
      "m-0 text-sm font-semibold text-muted-foreground whitespace-normal sm:whitespace-nowrap",
    panelCard: "max-w-[min(100%,36rem)]",
    uptoRow: "min-w-0 items-baseline gap-x-1.5 gap-y-0.5",
    uptoRowCompact: "w-full justify-between gap-2",
    uptoRowWrap: "flex-wrap",
    uptoName: "min-w-0 items-baseline gap-1.5",
    uptoSymbol: "shrink-0 text-sm",
    uptoText: "min-w-0 font-semibold",
    uptoBadge:
      "rounded-full bg-secondary/15 px-1.5 py-0.5 text-sm font-semibold text-secondary dark:text-accent",
    uptoEnd: "min-w-0 text-sm font-mono font-semibold text-foreground",
    rangeNa: "text-xs",
    range: "font-mono text-sm font-semibold",
    rangeGood: "text-[var(--color-success)]",
    rangeBad: "text-destructive",
    rangeNeutral: "text-foreground",
    denseTable: "divide-y divide-border/80 rounded-md border border-border/80",
    denseRow: "px-2.5 py-1 text-sm leading-snug",
    denseRowHighlight: "font-semibold text-success",
    denseTime: "shrink-0 font-mono text-sm font-semibold text-foreground tabular-nums",
    denseNote: "-mt-0.5 pb-0.5 font-mono text-sm text-foreground/90",
    subBlock: "border-b border-border px-4 py-2 last:border-b-0",
    subBlockTitle: "m-0 mb-1.5 text-sm font-semibold",
    pairedTitle: "text-sm font-semibold",
    pairedHead: "border-b border-border bg-secondary/[0.06] px-3 py-1.5 text-sm font-semibold",
    pairedBorder: "border-l border-border/60 pl-2",
    pairedLabel: "min-w-0 text-base leading-snug",
    pairedLabelHighlight: "font-semibold text-success",
    pairedTime: "font-mono text-sm font-semibold text-foreground tabular-nums leading-snug",
    pairedNote: "mt-0.5 font-mono text-sm leading-tight text-foreground/90",
  },

  // ── Sections (PanchangaSections) ──────────────────────────────────────────
  sections: {
    mono: "font-mono font-semibold",
    monoTabular: "font-mono font-semibold tabular-nums",
    monoPlain: "font-mono tabular-nums text-foreground",
    strong: "font-semibold",
    strike: "text-base line-through",
    dual: "gap-0.5",
    balamBlock: "gap-2 border-b border-border/80 px-4 py-3 last:border-b-0",
    moonRef: "m-0 text-center text-sm text-muted-foreground",
    timingGood: "gap-1 text-emerald-800 dark:text-emerald-300",
    timingBad: "gap-1 text-rose-800 dark:text-rose-300",
    timingLine: "text-sm leading-snug",
    nivasList: "min-w-0 gap-1",
    nivasItem: "min-w-0",
    nivasTime: "text-sm font-mono font-semibold text-foreground",
    chipFestival:
      "text-sm font-semibold px-2.5 py-1.5 rounded-full bg-secondary/12 text-secondary dark:text-accent border border-secondary/20",
    chipHoliday:
      "text-sm font-semibold px-2.5 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20",
    // दिन विशेष: one card per festival, then markers and ceremony saits.
    festivalList: "flex flex-col gap-3 p-4",
    festivalCard: "flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-3 py-3",
    festivalHead: "flex flex-row flex-wrap items-center gap-2",
    festivalName: "text-base font-bold text-foreground",
    festivalBadge:
      "text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20",
    festivalWhen: "text-xs font-semibold text-muted-foreground",
    festivalAbout: "text-sm leading-relaxed text-foreground",
    festivalSubheading: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
    festivalSteps: "flex flex-col gap-1",
    festivalStep: "flex flex-row gap-2",
    festivalStepNumber: "w-5 shrink-0 text-right font-num text-sm font-semibold text-secondary",
    festivalStepText: "min-w-0 flex-1 text-sm leading-relaxed text-foreground",
    festivalSait: "flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2",
    festivalSaitRow: "flex flex-row flex-wrap items-baseline gap-x-2 gap-y-0.5",
    festivalSaitLabel: "text-sm font-semibold text-foreground",
    festivalSaitTime: "font-num text-sm font-bold text-danger",
    festivalSaitDetail: "text-xs text-muted-foreground",
    festivalSaitFacing: "text-xs font-semibold text-foreground",
    festivalNote: "text-xs text-muted-foreground",
    festivalMarkers: "flex flex-row flex-wrap gap-2",
    planetsPanel: "rounded-xl bg-card p-4",
    planetsHead: "mb-2 min-w-0 gap-1 sm:flex-row sm:items-baseline sm:gap-2",
    planetsTitle: "m-0 shrink-0 text-base font-bold",
    planetsAnchor: "min-w-0 text-sm",
    planetsList: "flex-col",
    lagnaRow: "flex-row items-center gap-3 border-b border-border py-2",
    lagnaBadge:
      "h-8 w-8 items-center justify-center rounded-lg bg-secondary/11 text-base text-secondary dark:text-accent",
    lagnaBody: "min-w-0 flex-1",
    lagnaTitle: "text-sm font-semibold",
    lagnaSign: "text-sm",
    planetRow:
      "flex-row flex-wrap items-start gap-x-3 gap-y-1 border-b border-border py-2 last:border-0",
    planetBody: "min-w-0 flex-1",
    planetNameRow: "flex-row flex-wrap items-center gap-1.5",
    planetName: "text-sm font-semibold",
    planetRashi: "text-sm",
    planetCoords: "font-mono text-sm font-semibold text-foreground",
  },

  // ── Day cycle band and toggle (DayTimeline chrome) ───────────────────────
  dayCycle: {
    bandTitle: "m-0 text-sm font-bold",
    bandSubtitle: "text-sm uppercase tracking-wider",
    bandLegend: "ml-auto flex-row flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm",
    legendItem: "items-center gap-1.5",
    legendSwatch: "h-2.5 w-2.5 rounded-md",
    legendLabel: "text-sm",
    toggleRadiusSm: "rounded-md",
    toggleRadiusMd: "rounded-lg",
    toggleSingle: "border border-border bg-card",
    toggleGroup: "overflow-hidden border border-border",
    toggleLabel: "font-semibold",
    toggleActive: "bg-primary text-primary-foreground",
    toggleIdle: "bg-card text-foreground",
    periodGroup: "gap-2 border-t border-border px-4 py-3",
    periodTitle: "text-sm font-bold leading-tight",
    periodCard: "min-w-0 gap-1.5 rounded-lg border px-2.5 py-2",
    periodHead: "min-w-0 items-start gap-1.5",
    periodBadge:
      "mt-px h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full px-1",
    periodBadgeText: "text-sm font-bold text-white",
    periodLabel: "min-w-0 text-sm font-semibold leading-snug",
    periodTime: "text-sm font-semibold tabular-nums",
  },

  // ── Sidebar nav ───────────────────────────────────────────────────────────
  sidebar: {
    nav: "rounded-2xl border border-border bg-card",
    navTitle:
      "border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground",
    navBody: "p-1",
    link: "rounded-xl px-3 py-2",
    linkOn: "bg-secondary/12 text-secondary ring-1 ring-secondary/25",
    linkOff: "text-foreground hover:bg-muted",
    linkLabel: "text-sm leading-snug",
    linkLabelActive: "font-medium text-secondary",
    linkLabelIdle: "font-medium text-foreground",
    linkBlurb: "mt-0.5 text-xs leading-snug text-muted-foreground",
    section: "border-b border-border/60 last:border-b-0",
    sectionHead: "w-full items-center gap-2 rounded-xl px-3 py-2.5",
    sectionTitle: "min-w-0 flex-1 text-sm font-bold uppercase leading-snug tracking-wide",
    sectionTitleActive: "text-secondary",
    sectionTitleIdle: "text-muted-foreground",
    list: "gap-0.5 px-1 pb-2",
    item: "gap-0.5",
  },

  // ── Directory (details hub) ───────────────────────────────────────────────
  directory: {
    sectionTitle:
      "mb-3 mt-8 text-left text-base font-bold text-foreground md:text-center md:text-sm md:uppercase md:tracking-wider md:text-muted-foreground",
    cardRow: "flex-wrap items-stretch justify-start gap-2 md:justify-center md:gap-3",
    backLink: "text-sm",
    backLinkFooter: "mt-6",
    backLinkText: "font-semibold text-secondary",
    shellMain: "mx-auto max-w-page-wide px-4 py-8",
    shellRow: "items-start gap-6",
    shellContent: "min-w-0 flex-1 overflow-x-hidden",
  },

  // ── Aside panels ──────────────────────────────────────────────────────────
  aside: {
    card: `${spec.card} shadow-sm`,
    eyebrow: `${spec.eyebrow} text-muted-foreground`,
    anchor: "m-0 mt-1 text-sm text-muted-foreground",
    body: "mt-2",
    muhurtaEyebrow: "mb-1 text-xs uppercase tracking-eyebrow",
    muhurtaInstant: "m-0 mb-3 text-sm",
    muhurtaList: "space-y-2",
    muhurtaRow: "items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm",
    muhurtaRowActive: "bg-secondary/20 text-secondary",
    muhurtaRowIdle: "bg-muted/40",
    muhurtaLabel: "text-sm font-semibold",
    muhurtaValue: "shrink-0 text-right text-sm font-semibold",
    muhurtaActive: "text-xs font-bold uppercase tracking-wide text-secondary",
    muhurtaRange: "text-xs font-mono tabular-nums",
    banner: "rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm",
    bannerTitle: "m-0 text-sm font-semibold text-foreground",
    bannerBody: "m-0 mt-1 text-sm leading-relaxed text-foreground",
    eventsCard: "px-4 py-3.5",
    eventsHead: "mb-2 flex-row flex-wrap items-center justify-between gap-2",
    eventsTitle: "m-0 text-base font-bold",
    eventsLink: "shrink-0 rounded-lg border border-border bg-background px-2.5 py-1",
    eventsLinkText: "text-xs font-semibold text-secondary",
    eventsStatus: "px-4 py-6 text-sm",
    eventsList: "flex-col",
    eventsRow: "flex-row items-center gap-2.5 border-b border-border py-2 last:border-b-0",
    eventsBody: "min-w-0 flex-1 flex-col",
    eventsName: "text-sm font-semibold",
    eventsTime: "font-mono text-sm font-semibold",
    eventsRel: "whitespace-nowrap font-mono text-sm font-semibold",
  },

  // ── Location selector ─────────────────────────────────────────────────────
  location: {
    geoErrorPanel: "px-2 pb-1 text-sm text-destructive",
    geoError: "text-xs text-destructive",
    cityName: "font-semibold",
    citySub: "text-sm",
    citySelected: "bg-secondary/20",
  },
} as const;
