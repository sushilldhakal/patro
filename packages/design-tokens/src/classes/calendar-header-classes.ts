/**
 * The calendar header (date badge, month + year button and panel, prev/next,
 * calendar toggle, location button and panel). Shared by the website and the
 * app; each draws its own row layout (grid on the website, stacked rows in the
 * app) and adds `hover:` / popover positioning on the website only. Container
 * and text classes are separate keys because React Native does not inherit text
 * style from a View.
 */
export const calendarHeaderClasses = {
  badge: "h-14 w-13 shrink-0 overflow-hidden rounded-xl border border-border bg-card",
  badgeMonth: "bg-secondary px-1 py-0.5 text-center text-sm font-bold text-secondary-foreground",
  badgeDays: "flex flex-1 items-center justify-center",
  badgeDaysText: "text-sm font-bold text-secondary",

  titleMain: "text-xl font-bold text-secondary",
  titleSub: "text-xs font-semibold text-muted-foreground",

  iconButton: "flex size-9.5 items-center justify-center rounded-xl border border-border bg-card",
  iconButtonSmall: "flex size-10 items-center justify-center rounded-xl border border-border bg-card",

  selectButton: "flex h-9.5 min-w-20 flex-row items-center justify-between gap-1.5 rounded-xl border bg-card pl-2.5 pr-2",
  selectButtonIdle: "border-border",
  selectButtonOpen: "border-secondary",
  selectLabel: "text-base font-semibold text-foreground",

  segment: "flex flex-row rounded-xl border border-border bg-muted p-0.5",
  segmentItem: "flex min-h-8 flex-1 items-center justify-center rounded-xl px-2.5",
  segmentItemActive: "bg-secondary",
  segmentLabel: "whitespace-nowrap text-sm font-semibold",
  segmentLabelActive: "text-secondary-foreground",
  segmentLabelIdle: "text-muted-foreground",

  swapButton: "flex h-9.5 shrink-0 flex-row items-center gap-1.5 rounded-xl border border-border bg-card px-2.5",
  swapLabel: "text-sm font-semibold text-foreground",

  locationButton: "flex h-9.5 min-w-0 max-w-full flex-row items-center gap-1.5 rounded-xl border bg-card pl-1.5 pr-2",
  locationPin: "flex size-7 items-center justify-center rounded-full bg-muted",
  locationName: "shrink text-sm font-semibold text-foreground",

  panel: "rounded-2xl border border-border bg-card p-3.5",
  panelLabel: "mb-2 text-xs font-bold text-muted-foreground",
  yearRow: "flex mb-3 flex-row items-center gap-2",
  yearInput: "h-11 min-w-0 flex-1 rounded-xl border bg-background px-2 text-center text-xl font-bold",
  yearInputOk: "border-border text-secondary",
  yearInputBad: "border-destructive text-destructive",
  yearGo: "flex h-11 shrink-0 items-center justify-center rounded-xl bg-secondary px-3.5",
  yearGoLabel: "text-sm font-bold text-secondary-foreground",
  yearError: "mb-2 text-xs font-semibold text-destructive",

  monthGrid: "flex flex-row flex-wrap gap-2",
  monthChip: "flex min-h-11 basis-[31%] grow items-center justify-center rounded-xl border",
  monthChipActive: "border-secondary bg-secondary",
  monthChipIdle: "border-border bg-background",
  monthChipLabel: "text-base font-semibold",
  monthChipLabelActive: "text-secondary-foreground",
  monthChipLabelIdle: "text-foreground",

  searchBox: "flex mb-2 h-11 flex-row items-center gap-2 rounded-xl border border-border bg-background px-3",
  searchInput: "min-w-0 flex-1 text-base text-foreground",
  locationRow: "flex min-h-12 flex-row items-center justify-between gap-2.5 rounded-xl px-3 py-2",
  locationRowActive: "bg-muted",
  locationRowName: "text-base font-semibold text-foreground",
  locationRowSub: "text-xs text-muted-foreground",
  locationRowGps: "text-base font-semibold text-secondary",
  locationEmpty: "px-2 py-4 text-center text-sm text-muted-foreground",
  locationError: "px-3 pb-2 text-xs font-semibold text-destructive",

  // ── Website row layout (CSS grid + order); the app stacks rows in code ─────
  nativeTitle: "min-w-0 flex-1 flex-row items-center gap-3",

  webRoot:
    "relative grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]",
  webTitle: "flex min-w-0 flex-row items-center gap-3 max-md:order-1",
  webNav: "flex min-w-0 flex-row items-center gap-2 max-md:order-3 xs:max-md:col-start-1",
  webSegment: "max-md:order-4 max-xs:hidden xs:max-md:justify-self-end",
  // Below the xs breakpoint the controls shrink another step (and their text a step).
  webDenseControl: "max-xs:h-8.5",
  webDenseIcon: "max-xs:size-8.5",
  webDenseText: "max-xs:text-sm",
  nativeDenseControl: "h-8.5",
  nativeDenseIcon: "size-8.5",
  nativeDenseText: "text-sm",
  webSwap: "justify-self-end max-md:order-4 xs:hidden",
  webLocation: "min-w-0 justify-self-end max-md:order-2 xs:relative",
  webMonthAnchor: "min-w-0 max-xs:flex-1 xs:relative",
  webChevronHide: "max-xs:hidden",
  webLocationName: "max-w-32 truncate max-xs:max-w-16",
  webPanel: "absolute top-full z-30 mt-2 shadow-lg max-xs:inset-x-0 xs:w-85",
  webScrim: "fixed inset-0 z-20 cursor-default",
  webBadgeHover: "flex flex-col transition-shadow hover:ring-3 hover:ring-secondary/20 active:scale-95",
  webLocationList: "flex max-h-72 flex-col gap-0.5 overflow-auto",
} as const;
