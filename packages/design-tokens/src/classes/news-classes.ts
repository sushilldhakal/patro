/**
 * News page: language toggle, category chips, story cards and source chips.
 * Shared by the website and the app. Container and text classes are separate keys
 * because React Native does not inherit text style from a View; `flex` /
 * `flex-row` are added by each platform.
 */
export const newsClasses = {
  toggle: "overflow-hidden rounded-xl border border-border",
  toggleButton: "items-center px-4 py-2",
  toggleButtonActive: "bg-secondary",
  toggleLabel: "text-sm font-semibold",
  toggleLabelActive: "text-secondary-foreground",
  toggleLabelIdle: "text-foreground",

  chips: "gap-2",
  chip: "rounded-full border border-border px-4 py-1.5",
  chipActive: "border-secondary bg-secondary",
  chipLabel: "text-sm font-medium",
  chipLabelActive: "text-secondary-foreground",
  chipLabelIdle: "text-foreground",

  sectionTitle: "text-lg font-bold text-foreground",
  list: "gap-3",

  card: "gap-2 rounded-2xl border border-border bg-card p-4",
  cardTop: "border-secondary/40",
  meta: "items-center gap-2",
  metaText: "text-xs font-medium text-muted-foreground",
  metaCategory: "text-xs font-semibold text-secondary",
  title: "text-base font-semibold leading-snug text-foreground",
  titleTop: "text-lg font-bold leading-snug text-foreground",
  summary: "text-sm leading-relaxed text-muted-foreground",

  sources: "flex-wrap items-center gap-2 pt-1",
  sourcesLabel: "text-xs text-muted-foreground",
  sourceChip: "items-center gap-1 rounded-full bg-muted px-3 py-1",
  sourceLabel: "text-xs font-semibold text-foreground",

  note: "text-xs leading-relaxed text-muted-foreground",
  stateBox: "items-center gap-3 rounded-2xl border border-border p-6",
  stateText: "text-center text-sm text-muted-foreground",
  moreButton: "items-center self-center rounded-xl border border-border px-5 py-2.5",
  moreLabel: "text-sm font-semibold text-foreground",
} as const;
