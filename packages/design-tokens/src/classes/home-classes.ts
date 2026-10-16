/**
 * Home page: the panchanga aside (header, today card, tabs, panchanga / sait /
 * muhurta panels), quick links, Veda mantra, rashifal teaser and picker.
 * Shared by the website and the app. Container and text classes are separate
 * keys where React Native does not inherit text style from a View. The month
 * grid and the date navigation live in calendar-classes.ts and
 * patro-date-classes.ts.
 */
export const homeClasses = {
  // ── Panchanga aside shell ─────────────────────────────────────────────────
  asideShell: "w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card",
  asideHeader: "flex flex-row items-baseline gap-2.5 border-b border-border px-4 py-3.5",
  asideTitle: "flex-1 text-lg font-bold text-foreground",
  asideLink: "shrink-0 text-xs text-secondary",
  asideBody: "overflow-hidden bg-card",
  asideTabBar: "border-b border-border bg-surface-muted",
  asideTab: "relative min-h-9 min-w-0 flex-1 px-1.5 py-2.5",
  asideTabActive: "bg-tab-active/70 dark:bg-primary/10",
  asideTabLabel: "text-center text-xs leading-snug",
  asideTabLabelActive: "font-bold text-foreground",
  asideTabLabelIdle: "font-semibold text-muted-foreground",
  asideTabIndicator: "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-secondary dark:bg-primary",
  asidePanel: "min-h-48 p-3",
  aakashCardTone: "border-secondary/40 bg-secondary/[0.07] shadow-sm",
  aakashCard:
    "flex flex-row items-center gap-2.5 rounded-xl border border-secondary/40 bg-secondary/[0.07] px-3 py-2.5 shadow-sm",
  footerNote: "mt-7 text-center text-sm",

  // ── Today highlight card ──────────────────────────────────────────────────
  highlight: "bg-card px-4 py-3",
  highlightTop: "flex flex-row items-start gap-3",
  highlightDay: "min-w-11 pt-0.5 text-4xl font-bold leading-none text-danger",
  highlightDate: "min-w-0 flex-1",
  highlightMonth: "text-base font-bold leading-tight text-foreground",
  highlightWeekday: "text-sm font-normal text-muted-foreground",
  highlightCrossEra: "text-sm text-muted-foreground",
  highlightNs: "mt-0.5 text-xs text-muted-foreground",
  highlightSpecial: "mt-2.5 border-t border-border pt-2.5",
  /** Beside the date block on a wide card: a rule on the left instead of on top. */
  highlightSpecialWide: "mt-0 min-w-0 flex-1 border-l border-t-0 pl-4 pt-0",
  highlightKicker: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  highlightTitle: "text-base font-bold leading-snug text-danger",
  highlightSubtitle: "mt-0.5 text-sm text-muted-foreground",
  highlightMoon: "mt-3 flex flex-row items-center gap-2",
  highlightMoonText: "text-sm text-foreground",
  highlightSun: "mt-2 flex flex-row flex-wrap items-center gap-x-4 gap-y-1",
  /** Moon phase, sunrise and sunset on one wrapping line. */
  highlightMeta: "mt-2 flex flex-row flex-wrap items-center gap-x-4 gap-y-1.5",
  highlightSunItem: "flex flex-row items-center gap-1.5",
  highlightSunText: "font-num text-sm text-foreground",

  // ── Panchanga (vivaran) tab ───────────────────────────────────────────────
  vivaranCells: "mb-2.5",
  vivaranTile: "min-w-0 rounded-lg bg-surface-inset px-2.5 py-2",
  vivaranLabel: "text-xs uppercase tracking-eyebrow",
  vivaranValue: "mt-0.5 text-base font-semibold leading-snug text-foreground",
  vivaranValueMono: "text-sm",
  vivaranHint: "mt-0.5 text-xs leading-snug",
  gocharSection: "mt-2.5 border-t border-foreground/10",
  gocharTitle: "mb-1.5 text-sm font-bold text-foreground",
  gocharTile: "gap-0.5",
  gocharName: "text-sm font-semibold leading-tight text-foreground",
  gocharDegree: "font-num text-sm font-semibold leading-tight text-foreground",
  solarWithPlanets: "mt-1.5 border-t border-foreground/10 pt-2",
  solarAlone: "mt-2.5 border-t border-foreground/10 pt-2",
  solarValue: "text-sm font-semibold leading-tight text-foreground",
  vivaranFooter: "mt-2.5 border-t border-foreground/10 pt-2.5",
  vivaranFooterText: "text-sm leading-snug text-foreground",
  vivaranFooterStrong: "font-semibold",
  vivaranFooterNum: "font-num font-semibold",

  // ── Muhurta tab ───────────────────────────────────────────────────────────
  muhurtaStack: "flex flex-col gap-2",
  muhurtaSubTab: "min-w-0 rounded-md border bg-surface-inset px-1 py-1.5",
  muhurtaSubTabActive: "border-secondary/30 bg-tab-active",
  muhurtaSubTabIdle: "border-transparent",
  muhurtaSubTabLabel: "text-center text-sm font-semibold leading-tight text-foreground",
  muhurtaSubTabLabelActive: "font-bold",
  muhurtaHint: "flex flex-row items-start gap-1.5",
  muhurtaHintText: "text-sm leading-snug",
  muhurtaHintIcon: "mt-px shrink-0 opacity-75",
  muhurtaEmpty: "py-5 text-center text-sm",
  muhurtaMoonRef: "mb-2 text-sm font-semibold text-foreground",
  muhurtaMoonRefStrong: "font-bold text-accent",
  muhurtaSlotTitle: "w-full text-center text-xs font-bold leading-tight text-foreground",
  muhurtaSlotValue: "w-full text-center text-xs font-semibold leading-snug text-foreground",
  muhurtaSlotSep: "opacity-55",

  // ── Sait tab ──────────────────────────────────────────────────────────────
  saitStack: "flex flex-col gap-2",
  saitMonth: "text-xs font-semibold text-muted-foreground",
  saitSkeleton: "h-48 rounded-md bg-muted",
  saitList: "flex flex-col gap-1",
  saitRow: "flex flex-row items-center gap-2 rounded-md bg-surface-inset px-2.5 py-2",
  saitName: "shrink-0 text-sm font-bold leading-snug text-foreground",
  saitDays: "font-num text-right text-sm font-semibold text-foreground",
  saitDaysNone: "text-right text-sm font-semibold text-muted-foreground",
  saitHighlight: "font-extrabold text-accent underline",
  saitEmpty: "py-5 text-center text-sm",

  // ── Quick links ───────────────────────────────────────────────────────────
  quickTitle: "mb-3 text-base font-bold text-foreground",
  quickTitleWide: "text-center text-sm font-bold uppercase tracking-wider text-muted-foreground",
  quickRow: "flex flex-row flex-wrap items-stretch justify-start",
  quickChip:
    "max-w-full flex-row items-center justify-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm",
  quickTile: "flex-col justify-center gap-3 rounded-2xl px-2.5 py-3.5",
  quickLabel: "text-sm font-bold leading-snug text-foreground",
  quickGroups: "flex flex-col gap-8",
  quickLinkCard:
    "group flex w-auto shrink-0 flex-row items-center text-left md:aspect-square md:w-[calc((100%-3rem)/5)] md:max-w-32 md:flex-col md:items-center md:justify-center md:gap-3 md:rounded-2xl md:px-2.5 md:py-3.5 md:text-center md:shadow-none lg:max-w-none lg:w-[calc((100%-5.25rem)/8)]",
  quickLinkIconWrap: "inline-flex shrink-0 items-center justify-center",
  quickLinkDesc: "hidden w-full min-w-0 text-xs leading-snug text-muted-foreground md:block",
  quickTitlePhone: "text-left",

  // ── Veda mantra ───────────────────────────────────────────────────────────
  vedaTitle: "min-w-0 flex-1 text-base font-bold text-secondary",
  vedaPlay: "h-11 w-11 items-center justify-center rounded-full bg-secondary",
  vedaBody: "flex flex-col gap-3 px-4 py-4",
  vedaSanskrit: "text-xl leading-relaxed text-foreground",
  vedaWord: "rounded bg-yellow-300/70 dark:bg-yellow-400/30",
  vedaMeaning: "flex flex-col gap-1",
  vedaMeaningLabel: "text-xs font-bold text-muted-foreground",
  vedaMeaningText: "text-sm leading-relaxed text-foreground",
  vedaFooter: "flex flex-row flex-wrap items-end justify-between gap-x-4 gap-y-2",
  vedaMore: "text-sm font-semibold text-secondary",
  vedaSource: "ml-auto text-right text-xs text-muted-foreground",

  // ── Rashifal teaser and sign picker ───────────────────────────────────────
  rashifalHeader: "mb-3 flex flex-col items-center gap-1",
  rashifalTitle: "text-sm font-bold uppercase tracking-wider text-muted-foreground",
  rashifalMonth: "text-xs font-semibold text-secondary",
  rashifalLinks: "mt-4 flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-2",
  rashifalLinkPrimary: "text-sm font-semibold text-secondary",
  rashifalLinkSecondary: "text-sm font-semibold text-muted-foreground",
  pickerGrid: "rounded-xl border border-border bg-card/80 p-2.5 shadow-sm",
  pickerThumb: "min-w-0 flex-col gap-1.5 rounded-lg border px-2 py-2.5",
  pickerThumbActive: "border-secondary bg-secondary/15",
  pickerThumbIdle: "border-border/50 bg-muted/25",
  pickerName: "text-center text-xs font-semibold leading-tight",
  pickerNameActive: "text-foreground",
  pickerNameIdle: "text-muted-foreground",
  pickerBarRow: "flex flex-row items-center gap-0.5 px-0.5",
  pickerBar: "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted",
  pickerBarFill: "h-full rounded-full",
  pickerPercent: "shrink-0 font-num text-xs font-bold leading-none",
  pickerArrow: "size-8 border border-border bg-card shadow-sm",
  pickerCarousel: "relative px-9",
} as const;
