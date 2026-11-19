/**
 * Ritu (seasons) page and the RituSeasons card list. Shared by the website and
 * the app. Container and text classes are separate keys because React Native
 * does not inherit text style from a View; `flex` / `flex-row` and the grid stay in
 * each platform's file.
 */
export const rituClasses = {
  headerRow: "items-start justify-between gap-4",

  sectionHead: "mb-3 items-baseline gap-2.5",
  sectionTitle: "text-lg font-bold",
  sectionSub: "flex-1 text-xs",
  southTag: "text-xs font-semibold text-warning",

  toolbar: "mb-4 items-center justify-end gap-2",
  whyLink:
    "shrink-0 items-center gap-1 rounded-full border border-secondary/35 px-2.5 py-1 dark:border-primary/35",
  whyLinkText: "text-xs font-semibold text-secondary dark:text-primary",

  card: "gap-2 rounded-xl bg-card p-3.5 shadow-xs",
  cardCurrent: "shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--secondary)_38%,transparent)] dark:shadow-[0_0_0_1.5px_color-mix(in_srgb,var(--primary)_38%,transparent)]",
  kicker: "text-sm font-bold uppercase tracking-eyebrow",
  kickerCurrent: "text-secondary dark:text-primary",
  seasonRow: "items-center gap-3",
  emoji: "shrink-0 text-lg leading-none",
  nameWrap: "min-w-0 flex-1",
  name: "text-xl font-bold leading-tight text-foreground",

  startLabel: "text-xs text-muted-foreground",
  startValue: "text-sm font-semibold text-accent",

  metaRow: "items-baseline justify-between gap-2",
  metaText: "text-sm font-semibold text-foreground",
  metaFrom: "text-xs text-foreground",

  track: "h-1.5 overflow-hidden rounded-full bg-foreground/10",
  bar: "h-full rounded-full",
  progressRow: "items-baseline justify-between gap-2",
  progressText: "text-sm text-foreground",
  progressPct: "text-xs font-semibold text-foreground",

  /** The Vedic (sidereal) crossover under each card's real-sky start. */
  vedicRow: "items-baseline justify-between gap-2 border-t border-dashed border-foreground/15 pt-2",
  vedicText: "min-w-0 flex-1 text-xs text-muted-foreground",
  vedicLabel: "font-semibold text-foreground",
  vedicShift: "shrink-0 text-xs font-semibold text-warning",
  subsection: "mt-6",
  subsectionTitle: "mb-3 text-lg font-bold",

  southNote: "mx-0.5 mt-2.5 text-sm leading-normal text-foreground",
} as const;
