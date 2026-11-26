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
  // Full-height day line drawn over the grid so caption rows do not break it.
  dayLine: "absolute top-0 bottom-0 w-px bg-foreground",
  cell: "w-16 items-start border-r border-border px-2 py-2",
  cellNight: "bg-muted",
  cellTime: "text-sm text-foreground",
  cellTemp: "text-xl font-medium text-foreground",
  cellText: "text-sm text-foreground",
  cellSub: "text-xs text-muted-foreground",
  /** No vertical padding: the label carries it, so its card background fills the row's height
   *  and the day line passes behind it. */
  rowCaption: "border-y border-border px-3",
  /** Website: a round icon button (add place, make primary, remove). */
  iconButton:
    "inline-flex size-10 cursor-pointer items-center justify-center rounded-full",
  /** A dot's tap target. */
  dotButton: "inline-flex size-5 cursor-pointer items-center justify-center",
  /** Website: the place name that opens the list; the list's row button. */
  placeTrigger:
    "flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left",
  placeRowButton:
    "min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-left",
  /** App: a row of the places list. */
  placeRowPress: "min-h-11 flex-1 items-center gap-2",
  /** The bottom-centre pill of place dots. */
  dotsPill:
    "items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm",
  dot: "size-2.5 rounded-full bg-muted-foreground opacity-40",
  dotActive: "size-3 rounded-full bg-foreground",
  placeRow: "items-center gap-1 border-b border-border py-1",
  placeName: "text-base text-foreground",
  placeNameActive: "text-base font-semibold text-foreground",
  primaryBadge:
    "rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-white dark:bg-primary dark:text-primary-foreground",
  dialogActions: "mt-5 flex-wrap justify-end gap-3",
  /** App places screen: one card per place, the search bar, the ⋯ menu. */
  placesTitle: "flex-1 text-3xl font-bold text-foreground",
  placeCard: "gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4",
  placeCardActive: "border-2 border-secondary dark:border-primary",
  placeCardName: "text-xl font-semibold text-foreground",
  placeCardTime: "text-sm text-muted-foreground",
  placeCardTemp: "text-4xl font-light text-foreground",
  placeCardMeta: "text-sm text-muted-foreground",
  searchBar:
    "flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-3",
  searchBarText: "flex-1 text-base text-muted-foreground",
  menuCard:
    "absolute right-3 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg",
  menuItem: "min-h-12 flex-row items-center gap-3 border-b border-border px-4 active:bg-muted",
  menuItemText: "flex-1 text-base text-foreground",
  unitGroupTitle: "mt-4 mb-1 text-sm font-semibold text-muted-foreground",
  rowCaptionInner: "items-center gap-1.5 bg-card py-2 pr-2",
  infoBody: "text-base leading-relaxed text-foreground",
  rowCaptionText: "text-sm text-muted-foreground",

  dayRow: "items-center gap-3 border-b border-border px-4 py-4",
  dayName: "text-base font-medium text-foreground",
  dayLabel: "text-sm text-muted-foreground",
  dayLow: "text-base text-muted-foreground",
  dayHigh: "text-base font-semibold text-foreground",
  dayRain: "text-sm text-foreground",
  /** The opened day: the page colour (not beige), with accent rules above and below, as a weather app. */
  dayPanel: "gap-4 border-y border-secondary bg-background px-4 py-5 dark:border-primary",
  /** A titled block of the opened day (rain, wind, sun/moon/UV), ruled off from the one above. */
  dayPanelSection: "gap-3 border-t border-border pt-4",
  dayPanelTitle: "text-base font-semibold text-muted-foreground",
  dayPanelRangeValue: "text-lg font-semibold text-foreground",
  /** Home's today card: the weather now, small, at the right of the date. */
  nowBadge: "flex flex-col items-end",
  nowBadgeRow: "flex flex-row items-center gap-1.5",
  nowBadgePlace: "text-xs font-semibold text-muted-foreground",
  nowBadgeTemp: "text-2xl font-semibold text-foreground",
  nowBadgeLabel: "text-xs text-muted-foreground",
  dayPanelDate: "text-sm text-muted-foreground",
  dayPanelLabel: "text-base text-foreground",

  moreButton: "px-4 py-3",
  moreButtonText: "text-sm font-medium text-secondary dark:text-primary",

  footer: "gap-4 px-1 pb-8 pt-2",
  footerTitle: "text-sm font-semibold text-muted-foreground",
  footerText: "text-sm text-muted-foreground",

  /** The hero's right column (condition, feels-like). Web adds `flex flex-col`. */
  heroSide: "min-w-0 flex-1 items-end gap-1 text-right",
  /** A saved place's text column and its name row. */
  placeText: "min-w-0 flex-1 gap-0.5",
  placeNameRow: "min-w-0 items-center gap-2 text-left",
  /** The saved-places list and its pinned footer (web drawer). */
  placeList: "m-0 flex-1 list-none gap-3 p-0",
  placeListFooter: "sticky bottom-0 bg-card pt-2 pb-1",
  /** The pull-to-refresh spinner bubble (web) and the round header buttons (app). */
  pullLayer: "pointer-events-none fixed inset-x-0 top-0 z-50 justify-center",
  pullBubble: "size-10 items-center justify-center rounded-full border border-border bg-card shadow-md",
  roundButton: "size-11 items-center justify-center rounded-full border border-border",
} as const;
