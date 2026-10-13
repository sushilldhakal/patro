/**
 * Panchak Patro page: period cards, prohibited-acts list and the explainer.
 * Shared by the website and the app. Container and text classes are separate
 * keys because React Native does not inherit text style from a View.
 */
export const panchakClasses = {
  pageStack: "pb-16",
  introText: "text-sm leading-relaxed",
  noData: "text-sm",
  errorText: "text-sm text-danger",

  // ── Period windows ─────────────────────────────────────────────────────────
  windows: "flex flex-col gap-3",
  windowsHeading: "flex flex-row items-center gap-2",
  sectionTitle: "text-base font-bold text-foreground",

  periodCard: "rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5",
  periodHead: "mb-4 flex flex-row flex-wrap items-start justify-between gap-2",
  periodTitle: "text-sm font-bold text-foreground",
  varietyBadge: "rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5",
  varietyText: "text-sm font-semibold text-amber-800 dark:text-amber-300",
  boundary: "rounded-xl border border-border/70 bg-muted/20 px-3.5 py-3",
  boundaryLabel: "mb-1.5 text-sm font-semibold uppercase tracking-wider",
  boundaryValue: "text-sm font-semibold leading-snug text-foreground",
  boundaryAd: "mt-1 text-xs",
  duration: "mt-3 text-xs",
  durationValue: "text-xs text-foreground",

  // ── Panels ─────────────────────────────────────────────────────────────────
  panel: "rounded-2xl border border-border bg-card p-5",
  panelLearn: "flex flex-col gap-5 rounded-2xl border border-border bg-card p-5",
  panelTitle: "text-base font-bold text-foreground",
  panelTitleSpaced: "mb-3 text-base font-bold text-foreground",
  prohibitedList: "flex flex-col gap-3",
  prohibitedItem: "border-b border-border/60 pb-3",
  itemTitle: "text-sm font-semibold text-foreground",
  itemDesc: "mt-0.5 text-sm leading-relaxed",
  learnHeading: "mb-1 text-sm font-semibold text-foreground",
  learnHeadingSpaced: "mb-2 text-sm font-semibold text-foreground",
  learnBody: "text-sm leading-relaxed",
  typesList: "flex flex-col gap-2.5",
  typeItem: "text-sm leading-relaxed",
  typeName: "text-sm font-semibold text-foreground",
} as const;
