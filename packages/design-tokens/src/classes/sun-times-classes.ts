/**
 * Sun times / suryakranti page: back link, title, the year matrix, the
 * per-month accordion table and the ayana note. Shared by the website and the
 * app. Container and text classes are separate keys because React Native does
 * not inherit text style from a View; `flex` / `flex-row`, the table/grid
 * layout, sticky columns and fixed column widths stay in each platform's file.
 */
export const sunTimesClasses = {
  backLink: "mb-1.5 items-center gap-1",
  backLinkText: "text-xs",
  title: "text-xl font-bold leading-tight tracking-tight",
  subtitle: "mt-1 text-sm",

  ayanaNorth: "text-xs font-extrabold leading-none text-accent",
  ayanaSouth: "text-xs font-extrabold leading-none text-danger opacity-95",

  card: "mt-5 rounded-xl bg-card shadow-xs",
  cardClip: "overflow-hidden rounded-xl",
  loadError: "px-4 py-3.5 text-xs",

  legend: "items-start justify-between gap-3 border-b border-border px-4 pt-3.5 pb-2.5",
  legendTitle: "text-base font-bold",
  legendSub: "mt-0.5 text-sm",
  legendItems: "shrink-0 gap-3",
  legendItem: "items-center gap-1",
  legendLabel: "text-sm",

  matrixDayHead: "border-b border-r border-border bg-card px-2 py-2",
  matrixDayHeadText: "text-center text-sm font-bold",
  matrixMonthHead: "border-b border-r border-border bg-card px-1 py-2.5",
  matrixMonthHeadText: "text-center text-xs font-bold",
  matrixDayRowHead: "border-b border-r border-border/70 bg-card px-2 py-2",
  matrixDayRowText: "text-center text-sm font-bold font-num",
  matrixCell: "min-h-10 border-b border-r border-border/50 px-1 py-1.5",
  matrixCellBlank: "bg-surface-muted opacity-45",
  matrixCellLoading: "bg-surface-inset",
  matrixRise: "text-sm font-semibold leading-snug text-accent",
  matrixSet: "text-sm font-semibold leading-snug text-danger/90",

  monthHeadRow: "bg-muted",
  monthHeadCell: "h-10 px-3 py-3",
  monthHeadText: "text-sm font-semibold",
  monthRow: "border-b border-border",
  monthCell: "px-3 py-2.5",
  monthCellSkeleton: "px-3 py-3",
  monthDayText: "text-base font-semibold",
  monthPlainText: "text-base",
  monthRiseText: "text-base text-primary dark:text-accent",
  monthSetText: "text-base text-destructive/90",

  accordion: "px-3 pb-3",
  accordionItem: "border-border",
  accordionTrigger: "px-1",
  accordionTriggerText: "text-base font-semibold",
  accordionDays: "text-sm font-normal",
  accordionContent: "px-0",

  ayanaCard: "rounded-2xl border border-border bg-card p-4 sm:p-5",
  ayanaCardText: "text-sm leading-relaxed",
  ayanaTitleRow: "items-center gap-2",
  ayanaTitle: "text-base font-bold",
  ayanaBody: "text-base leading-relaxed",
  ayanaLocation: "text-xs leading-relaxed",
} as const;
