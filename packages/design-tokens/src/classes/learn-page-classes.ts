/**
 * Learn hub, article chrome and the "Learn more" card. Read by the website
 * (Learn.tsx, LearnArticle.tsx, LearnMoreCard.tsx) and the app (learn/index,
 * LearnArticleView, learn/[slug], LearnMoreCard). The article hero and the
 * diagram internals use classes/learn-classes.ts and diagram-classes.ts.
 * Hover, group-*, transitions, rings and `inline-flex` stay in the website;
 * React Native layout (`flex-row` etc.) stays in the app.
 */
export const learnPageClasses = {
  // ── Hub hero ──────────────────────────────────────────────────────────────
  /** Panel shape; the website adds its gradient, the app a flat `bg-card`. */
  hero: "rounded-3xl border border-border px-6 py-8 sm:px-10 sm:py-10",
  eyebrow: "mb-4 items-center gap-2 rounded-full border border-secondary/25 bg-secondary/8 px-3.5 py-1.5",
  eyebrowText: "text-xs font-semibold uppercase tracking-wide text-secondary",
  title: "text-3xl font-bold tracking-tight text-foreground sm:text-4xl",
  titleAccent: "text-secondary",
  subtitle: "mt-4 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg",
  stats: "mt-6 flex flex-row flex-wrap gap-3",
  statText: "text-sm font-semibold tracking-wide text-foreground",
  searchWrap: "w-full max-w-md",
  searchInput: "h-12 text-base",
  searchClear: "flex size-8 items-center justify-center rounded-md",

  // ── Category filter ───────────────────────────────────────────────────────
  chip: "gap-1.5 rounded-full border px-4 py-2",
  chipText: "text-sm font-semibold",
  chipActive: "border-secondary bg-secondary",
  chipActiveText: "text-secondary-foreground",
  chipIdle: "border-border bg-card",
  chipCount: "opacity-70",
  resultsText: "text-base",

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: "rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14",
  emptyTitle: "text-base text-foreground",
  emptyHint: "mt-1 text-sm",
  clearFilters: "mt-4 text-sm font-semibold text-secondary",

  // ── Topic card ────────────────────────────────────────────────────────────
  topicCard: "flex flex-col rounded-2xl border border-border bg-card",
  topicHead: "flex flex-row items-start gap-3 px-5 pt-5",
  topicIcon: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10",
  topicTitleWrap: "min-w-0 flex-1",
  topicTitle: "text-base font-bold leading-snug text-foreground",
  topicBadge: "shrink-0 rounded-full border px-2.5 py-0.5",
  topicBadgeText: "text-xs font-semibold uppercase tracking-wide",
  topicSummary: "px-5 pt-3 text-sm leading-relaxed text-foreground/80",
  topicFooter: "mt-4 flex flex-row items-center justify-between border-t border-border/70 px-5 py-3",
  topicFooterText: "text-sm font-semibold text-secondary",

  /** Accent per library section: badge fill, border and text. */
  sectionChip: {
    start: "bg-emerald-500/10 text-emerald-900 border-emerald-500/25 dark:text-emerald-200",
    foundation: "bg-emerald-500/10 text-emerald-900 border-emerald-500/25 dark:text-emerald-200",
    sun: "bg-amber-500/10 text-amber-900 border-amber-500/25 dark:text-amber-200",
    moon: "bg-sky-500/10 text-sky-800 border-sky-500/25 dark:text-sky-200",
    "five-limbs": "bg-teal-500/10 text-teal-900 border-teal-500/25 dark:text-teal-200",
    "earth-sky": "bg-lime-500/10 text-lime-900 border-lime-500/25 dark:text-lime-200",
    zodiac: "bg-indigo-500/10 text-indigo-900 border-indigo-500/25 dark:text-indigo-200",
    "vedic-time": "bg-slate-500/10 text-slate-900 border-slate-500/25 dark:text-slate-200",
    panchanga: "bg-teal-500/10 text-teal-900 border-teal-500/25 dark:text-teal-200",
    "bs-construction": "bg-red-500/10 text-red-900 border-red-500/25 dark:text-red-200",
    eclipses: "bg-violet-500/10 text-violet-900 border-violet-500/25 dark:text-violet-200",
    calculation: "bg-cyan-500/10 text-cyan-900 border-cyan-500/25 dark:text-cyan-200",
    comparison: "bg-orange-500/10 text-orange-950 border-orange-500/25 dark:text-orange-200",
    deeper: "bg-rose-500/10 text-rose-900 border-rose-500/25 dark:text-rose-200",
  } as Record<string, string>,

  // ── Learning-path module ──────────────────────────────────────────────────
  moduleHeader: "mb-5 border-b border-border pb-4",
  moduleHeaderRow: "flex flex-row items-start gap-3",
  moduleIcon: "mt-0.5 flex size-10 items-center justify-center rounded-xl bg-secondary/10",
  moduleTitle: "text-2xl font-bold text-foreground",
  moduleBlurb: "max-w-2xl text-sm",
  moduleMore: "opacity-70",
  catHeader: "mb-3 flex flex-row items-center justify-between gap-3",
  catTitle: "flex flex-row items-center gap-2",
  catTitleText: "text-sm font-bold text-foreground",
  catCount: "font-medium text-muted-foreground",
  catLink: "text-sm font-semibold text-secondary",

  // ── Article chrome ────────────────────────────────────────────────────────
  backLink: "items-center gap-1.5 text-sm",
  backLinkText: "text-sm",
  articleCard: "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
  navRow: "flex flex-col gap-3 sm:flex-row sm:justify-between",
  navCard: "flex flex-row items-center gap-2 rounded-xl border border-border bg-card p-3",
  navKicker: "text-sm uppercase tracking-wide",
  navTitle: "text-sm text-foreground",
  inlineLink: "items-center gap-1.5 text-sm text-secondary",
  inlineLinkText: "text-sm text-secondary",
  notFound: "flex flex-col items-center gap-4 py-16",

  // ── "Learn more" card ─────────────────────────────────────────────────────
  moreCard: "rounded-2xl border border-border bg-card/40 p-4 sm:p-5",
  moreHead: "mb-3 flex flex-row items-center gap-2",
  moreHeading: "text-sm font-semibold text-foreground",
  moreItem: "flex flex-row items-center gap-2.5 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5",
  moreIcon: "flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary/10",
  moreLabel: "min-w-0 flex-1 text-sm text-foreground",
} as const;
