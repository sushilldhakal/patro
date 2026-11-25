/**
 * Weather page (/weather), shared by the website and the app. Container and
 * text classes are separate keys because React Native does not inherit text
 * style from a View; `flex` / `flex-row`, the sky gradient, sticky captions and
 * the responsive column switches stay in each platform's file.
 */
export const weatherClasses = {
  hero: "overflow-hidden rounded-2xl",
  heroBody: "gap-4 p-5",
  heroPlace: "text-base font-semibold text-foreground",
  /** `leading-normal`: text-5xl's own 1.0 line box cropped the tops of the digits in the app. */
  heroTemp: "text-5xl leading-normal font-light tracking-tight text-foreground",
  /** The sky's top row: back button and the place. */
  topBar: "items-center gap-1 px-2 pt-1",
  placeButton: "min-h-11 flex-1 items-center gap-2 pr-3",
  /** A full-width band whose content keeps the page's width (app). */
  band: "mx-auto w-full max-w-page",
  /** Website: the sky card fades in. */
  heroEnter: "animate-in fade-in border border-border duration-300",
  /** Website: a chip keeps one line and presses in. */
  chipPress:
    "shrink-0 cursor-pointer whitespace-nowrap transition-transform duration-150 active:scale-[0.97]",
  /** Website: an opened day fades in. */
  panelEnter: "animate-in fade-in duration-200",
  heroTempRow: "flex-wrap items-center gap-x-6 gap-y-2",
  headerRow: "flex-wrap items-start justify-between gap-3",
  chevron:
    "size-5 shrink-0 text-secondary transition-transform dark:text-primary",
  /** Website only: today's three detail blocks side by side from md up. */
  todayGrid:
    "grid bg-card md:grid-cols-3 md:[&>*]:border-b-0 md:[&>*+*]:border-l md:[&>*+*]:border-border",
  /** Website only: the day row is a full-width button. */
  dayButton: "w-full cursor-pointer text-left hover:bg-tab-hover",
  /** Website only: a day's facts, two columns from sm up. */
  dayFacts: "m-0 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2",
  heroFeels: "text-sm text-foreground",
  heroRangeValue: "text-xl font-medium text-foreground",
  heroRangeLabel: "text-sm text-foreground opacity-80",
  heroLine: "text-lg font-semibold text-foreground",
  heroToggle:
    "items-center justify-between border-t border-border bg-card px-5 py-3",
  heroToggleText: "text-sm font-medium text-secondary dark:text-primary",

  section: "rounded-2xl border border-border bg-card",
  sectionTitle: "text-base font-semibold text-foreground",
  detailBlock: "gap-2 border-b border-border px-5 py-4",
  detailTitle: "text-sm font-semibold text-muted-foreground",
  factValue: "text-sm font-semibold text-foreground",
  factLabel: "text-sm text-muted-foreground",

  chip: "rounded-md border-2 border-secondary px-3 py-1.5 dark:border-primary",
  chipActive:
    "rounded-md border-2 border-secondary bg-secondary px-3 py-1.5 dark:border-primary dark:bg-primary",
  chipText: "text-sm font-medium text-secondary dark:text-primary",
  chipTextActive: "text-sm font-medium text-white dark:text-primary-foreground",

  dayHead: "px-2 pb-1 pt-3",
  dayHeadText: "text-sm font-semibold text-foreground",
  dayDivider: "border-l border-foreground",
  cell: "w-16 items-start border-r border-border px-2 py-2",
  cellNight: "bg-muted",
  cellTime: "text-sm text-foreground",
  cellTemp: "text-xl font-medium text-foreground",
  cellText: "text-sm text-foreground",
  cellSub: "text-xs text-muted-foreground",
  rowCaption: "border-y border-border px-3 py-2",
  /** Website: a round icon button (add place, make primary, remove). */
  iconButton:
    "inline-flex size-10 cursor-pointer items-center justify-center rounded-full",
  /** A dot's tap target. */
  dotButton: "inline-flex size-4 cursor-pointer items-center justify-center",
  /** Website: the place name that opens the list; the list's row button. */
  placeTrigger:
    "flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left",
  placeRowButton:
    "min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left",
  /** App: a row of the places list. */
  placeRowPress: "min-h-11 flex-1 items-center gap-2",
  /** The bottom-centre pill of place dots. */
  dotsPill:
    "items-center gap-2 rounded-full border border-border bg-card px-3 py-2 shadow-sm",
  dot: "size-2 rounded-full bg-muted-foreground opacity-40",
  dotActive: "size-2 rounded-full bg-foreground",
  placeRow: "items-center gap-1 border-b border-border py-1",
  placeName: "text-base text-foreground",
  placeNameActive: "text-base font-semibold text-foreground",
  primaryBadge:
    "rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-white dark:bg-primary dark:text-primary-foreground",
  dialogActions: "mt-5 flex-wrap justify-end gap-3",
  rowCaptionInner: "items-center gap-1.5",
  infoBody: "text-base leading-relaxed text-foreground",
  rowCaptionText: "text-sm text-muted-foreground",

  dayRow: "items-center gap-3 border-b border-border px-4 py-4",
  dayName: "text-base font-medium text-foreground",
  dayLabel: "text-sm text-muted-foreground",
  dayLow: "text-base text-muted-foreground",
  dayHigh: "text-base font-semibold text-foreground",
  dayRain: "text-sm text-foreground",
  dayPanel: "gap-3 border-b border-border bg-muted px-4 py-4",
  dayPanelDate: "text-sm text-muted-foreground",
  dayPanelLabel: "text-base text-foreground",

  moreButton: "px-4 py-3",
  moreButtonText: "text-sm font-medium text-secondary dark:text-primary",

  footer: "gap-4 px-1 pb-8 pt-2",
  footerTitle: "text-sm font-semibold text-muted-foreground",
  footerText: "text-sm text-muted-foreground",
} as const;
