/**
 * Home month calendar: the BS / AD grid, its festival list, and the
 * calendar / panchanga view switch. Shared by the website and the app. The
 * breakpoint variants are separate keys (`*Phone`, `*Wide`) because the app
 * picks them from its own breakpoint hook and the website from `max-md:` / `md:`.
 */
export const calendarClasses = {
  // ── Grid frame and weekday header ─────────────────────────────────────────
  grid: "overflow-hidden border border-border bg-border",
  gridWide: "rounded-xl shadow-sm",
  gridPhone: "rounded-none",
  gridWeb: "shadow-ring-soft max-md:rounded-none max-md:shadow-none",
  gridCols: "grid grid-cols-7 gap-px",
  weekdayCell: "min-w-0 bg-surface-inset",
  weekdayCellWide: "items-start px-3 py-2",
  weekdayCellPhone: "items-center px-0 py-1",
  weekdayEn: "text-xs font-semibold uppercase tracking-widest",
  weekdayNe: "text-sm font-semibold",
  weekdayNeShort: "text-center text-sm font-bold leading-tight tracking-tight",
  weekdayWeekend: "text-danger",

  // ── Day cells ─────────────────────────────────────────────────────────────
  emptyCell: "bg-surface-muted",
  emptyWeb: "min-h-[104px] cursor-default max-md:min-h-12",
  cell: "relative min-w-0 overflow-hidden bg-card",
  cellWeb: "flex min-h-[104px] flex-col max-md:min-h-[5rem] max-md:p-1",
  cellSelected: "shadow-[inset_0_0_0_2px_var(--ring)]",
  cellHit: "absolute inset-0 z-0 border-none bg-transparent p-0",
  moonWrap: "pointer-events-none absolute right-0.5 top-0.5 z-[2] size-3.5 max-md:right-0 max-md:top-0 sm:size-4 md:right-1 md:top-1",
  edgeStrip: "pointer-events-none absolute z-[2] flex w-[1.375rem] items-center justify-center overflow-visible max-md:hidden inset-y-1",
  edgeText: "inline-block max-h-full whitespace-nowrap font-num font-semibold leading-[1.4] tracking-wide [writing-mode:vertical-rl] [text-orientation:mixed]",
  cellWide: "p-2",
  cellPhone: "p-1",
  cellWithEdgeLabels: "px-3.5",
  cellOutside: "bg-surface-muted/70",
  cellToday: "bg-surface-today",
  cellHoliday: "bg-surface-tint-danger",
  cellText: "text-foreground",
  cellTextOutside: "text-foreground/70",

  tithi: "min-w-0 pt-1 text-center font-semibold",
  tithiPhone: "text-xs",
  tithiWide: "text-sm",
  tithiPending: "h-1.5 w-6 rounded-full bg-muted-foreground/25",

  todayBadge: "rounded-full bg-secondary px-1.5 py-0.5",
  todayBadgePhone: "px-1",
  todayBadgeText: "text-xs font-bold leading-none tracking-wide text-secondary-foreground",

  dayNumber: "font-semibold tracking-tight",
  dayNumberWide: "text-3xl",
  dayNumberPhone: "text-2xl",
  dayNumberDanger: "text-danger",
  secondaryDate: "font-semibold text-muted-foreground",
  secondaryDateNamed: "text-diagram-xs",
  secondaryDatePlain: "text-xs",
  secondaryDateWide: "text-sm",

  countBadge: "rounded-full bg-secondary px-1 py-px",
  countBadgePhone: "px-0.5",
  countBadgeCompact: "rounded-full bg-secondary px-1.5 py-0.5",
  countBadgeText: "font-num text-diagram-xs font-bold leading-none text-secondary-foreground",

  festival: "text-center text-xs font-semibold leading-tight",
  festivalHoliday: "text-danger",
  festivalNormal: "text-foreground",
  festivalExtra: "text-diagram-xs font-medium leading-tight opacity-90",
  festivalExtraStack: "gap-px",

  // ── Festival list (dialog on the website, sheet in the app) ───────────────
  festivalItem: "rounded-lg border border-border bg-muted/40 px-3 py-2",
  festivalItemText: "text-sm font-medium leading-snug text-foreground",

  // ── Calendar / panchanga view switch ──────────────────────────────────────
  viewSwap: "h-8 shrink-0 flex-row items-center gap-1 rounded-lg border border-border bg-card px-2",
  viewSwapText: "text-sm font-semibold text-foreground",
  viewSegGroup: "shrink-0 flex-row gap-0.5 rounded-lg border border-border bg-card p-0.5",
} as const;
