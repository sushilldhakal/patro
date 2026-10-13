/**
 * Holidays page: tabs, search, error box and the sortable table. Shared by the
 * website and the app. Container and text classes are separate keys because
 * React Native does not inherit text style from a View.
 */
export const holidaysClasses = {
  tabBar: "flex-row gap-1 border-b border-border",
  tab: "-mb-px flex-row items-center gap-2 border-b-2 px-4 py-2.5",
  tabActive: "border-secondary",
  tabIdle: "border-transparent",
  tabLabel: "text-sm",
  tabLabelActive: "text-secondary",
  tabLabelIdle: "text-foreground",
  tabCount: "rounded-full bg-muted px-1.5 py-0.5",
  tabCountText: "text-xs text-foreground",

  searchBox: "max-w-sm rounded-lg border border-border bg-background",
  searchInput: "py-2 text-sm text-foreground",

  errorBox: "rounded-xl border border-destructive/20 bg-destructive/10 p-4",
  errorText: "text-sm text-destructive",

  table: "rounded-xl border border-border",
  tableHead: "border-b border-border bg-muted/50",
  headCell: "px-4 py-3",
  headText: "text-xs font-semibold uppercase tracking-wide text-foreground",
  row: "border-b border-border/50",
  cell: "px-4 py-3",
  emptyCell: "py-8",
  emptyText: "text-center text-sm text-foreground",

  cellName: "text-base text-foreground",
  cellMono: "font-num text-sm text-foreground",
  cellText: "text-sm text-foreground",
  typeBadge: "rounded-full bg-muted px-2 py-0.5",
  typeBadgeText: "text-xs capitalize text-foreground",
  govtFlag: "flex-row items-center gap-1",
  govtFlagText: "text-xs font-semibold text-destructive",
} as const;
