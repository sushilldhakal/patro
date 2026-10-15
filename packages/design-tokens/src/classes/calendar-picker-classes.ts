/**
 * The date + time picker and the year picker. They reuse the parts of
 * `calendarHeaderClasses` (badge, title, icon buttons, panel, month chips, year
 * box) and add what only they draw: the day grid, the month / year crumbs, the
 * year grid with its Gregorian years, and the time steppers. `web*` keys are
 * the website's grid and popover layout; the app stacks rows in code.
 */
export const calendarPickerClasses = {
  dateButton: "flex h-9.5 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl border bg-card pl-3.5 pr-3",
  dateButtonText: "shrink text-base font-semibold text-foreground",
  dateButtonTime: "border-l border-border pl-2.5 text-base font-bold text-secondary",
  yearButton: "flex h-9.5 min-w-28 flex-row items-center justify-between gap-2.5 rounded-xl border bg-card pl-3.5 pr-3",
  yearButtonText: "text-lg font-bold text-foreground",

  crumbRow: "mb-2.5 flex flex-row items-center gap-2",
  crumbs: "flex min-w-0 flex-1 flex-row justify-center gap-1.5",
  crumb: "flex h-10 flex-row items-center rounded-lg px-3",
  crumbActive: "bg-muted",
  crumbLabel: "text-lg font-bold text-secondary",

  weekRow: "mb-1 flex flex-row",
  weekHead: "flex w-1/7 items-center py-1",
  weekHeadText: "text-xs font-bold text-muted-foreground",
  weekHeadSaturday: "text-destructive",
  dayGrid: "flex flex-row flex-wrap",
  dayCell: "flex w-1/7 p-0.5",
  dayButton: "flex h-11 flex-1 items-center justify-center rounded-xl border border-transparent",
  dayButtonToday: "border-secondary",
  dayButtonSelected: "border-secondary bg-secondary",
  dayLabel: "text-base font-semibold text-foreground",
  dayLabelSaturday: "text-destructive",
  dayLabelToday: "text-secondary",
  dayLabelSelected: "text-secondary-foreground",

  monthChipCurrent: "border-secondary",
  yearChip: "flex min-h-12 basis-[31%] grow items-center justify-center rounded-xl border",
  yearChipLabel: "text-base font-semibold",
  yearChipSub: "text-xs text-muted-foreground",
  yearChipSubSelected: "text-secondary-foreground",

  jumpLabel: "mb-2 text-xs font-bold text-muted-foreground",
  jumpRow: "mb-3 flex flex-row gap-2",
  yearPageRow: "mb-2.5 mt-1 flex flex-row items-center justify-between gap-2",
  yearPageText: "text-base font-bold text-secondary",
  ghostButton: "flex h-11 flex-1 items-center justify-center rounded-xl border border-secondary",
  ghostLabel: "text-sm font-bold text-secondary",

  timeRow: "mt-3 flex flex-row items-center gap-2.5 border-t border-border pt-3",
  timeLabel: "text-sm font-bold text-muted-foreground",
  stepper: "flex flex-col items-center gap-1",
  stepButton: "flex h-8 w-11 items-center justify-center rounded-lg border border-border bg-card",
  stepValue: "flex size-11 items-center justify-center rounded-xl border border-border bg-background",
  stepValueText: "text-xl font-bold text-secondary",
  timeColon: "text-2xl font-bold text-secondary",
  timeSpacer: "flex-1",
  footer: "mt-3 flex flex-row gap-2",
  okButton: "flex h-11 flex-1 items-center justify-center rounded-xl bg-secondary",

  nativeTitle: "min-w-0 flex-1 flex-row items-center gap-3",
  nativeNav: "min-w-0 flex-1 flex-row items-center gap-2",

  webNavRow: "flex w-full flex-col gap-3 md:flex-row md:items-start md:justify-between",
  webNavExtras: "flex shrink-0 flex-row flex-wrap items-center justify-end gap-2",
  webNavToolbar: "flex flex-wrap items-center gap-2 md:hidden",
  webNavDesktopOnly: "hidden items-center gap-2 md:flex",
  webLocationCompact: "h-9.5 min-w-0 w-auto max-w-[12.5rem] rounded-xl",
  webNavAside: "hidden shrink-0 flex-col items-end gap-2 md:flex",
  webStack: "relative flex w-full flex-col gap-3",
  // Day + time page header: 2 rows from phone to desktop (title / date picker left, tabs / location right).
  webDtGrid: "relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3",
  webDtTitle: "col-start-1 row-start-1",
  webDtNav: "col-start-1 row-start-2",
  webDtTabs: "col-start-2 row-start-2 justify-self-end max-[419px]:hidden md:row-start-1",
  webDtSwap: "col-start-2 row-start-2 justify-self-end min-[420px]:hidden",
  webDtLocationSolo: "col-start-2 row-start-1 justify-self-end",
  webDtLocation: "col-start-2 row-start-1 justify-self-end md:row-start-2",
  webBar: "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-3 max-sm:grid-cols-1",
  webNav: "relative flex flex-row items-center gap-2 max-sm:static",
  webDatePanel: "absolute left-0 top-full z-30 mt-2 shadow-lg max-sm:inset-x-0 sm:w-93",
  webYearPanel: "absolute right-0 top-full z-30 mt-2 shadow-lg max-sm:inset-x-0 sm:w-85",
  webScrim: "fixed inset-0 z-20 cursor-default",
  webTitle: "flex min-w-0 flex-row items-center gap-3",
  webBadgeHover: "flex flex-col transition-shadow hover:ring-3 hover:ring-secondary/20 active:scale-95",
} as const;
