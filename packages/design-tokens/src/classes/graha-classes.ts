/**
 * Graha detail pages: asta, vakri and the solar / lunar eclipse year views,
 * with the banner, the per-graha column cards, the about block and the status
 * marks they share. The website is the source; apps/web and apps/mobile both
 * import these strings.
 *
 * The website's card carries a 1px foreground ring as a box-shadow
 * (`patroCard`); the app draws the same ring as a `border border-border`
 * beside the key. Column layout (CSS `columns` on the web, wrapped rows in the
 * app), `flex` / `flex-row` and `inline-flex` stay in each app.
 */
export const grahaClasses = {
  // ── Page frame and banner (GrahaDetailPageFrame, GrahaBanner) ────────────
  navStack: "gap-3",
  banner: "overflow-hidden rounded-2xl border border-border/80 bg-card px-5 py-5",
  bannerRow: "items-start gap-4",
  bannerIcon: "h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/15",
  bannerText: "min-w-0",
  bannerTitle: "text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl",
  bannerBlurb: "mt-1 text-sm leading-relaxed text-muted-foreground",

  detailsLink: "mt-6 items-center gap-1.5 self-start",

  // ── About block (GrahaDescription, ElementDescription) ───────────────────
  aboutCard: "mt-6 p-4",
  aboutTitle: "mb-3 text-sm font-bold uppercase tracking-wider text-secondary",
  aboutBody: "gap-4",
  aboutBlock: "gap-1",
  aboutBlockTitle: "text-sm font-bold text-foreground",
  aboutBlockText: "m-0 text-sm leading-relaxed text-muted-foreground",

  // ── Per-graha column cards (GrahaGroupedEventCards) ──────────────────────
  columns: "mt-2",
  columnCard: "mb-3 overflow-hidden rounded-xl bg-card",
  columnHead:
    "items-baseline justify-between gap-2 border-b border-border bg-secondary/[0.09] px-3 py-2 dark:bg-secondary/20",
  columnTitle: "text-base font-bold text-foreground",
  columnNote: "ml-1 text-xs font-normal text-muted-foreground",
  columnCount: "text-xs text-muted-foreground",
  columnBody: "gap-2 p-2",
  columnBodyTight: "gap-0.5 p-2",
  columnEmpty: "px-2 py-1.5 text-sm text-muted-foreground",
  stateText: "text-sm text-muted-foreground",

  // ── Asta period card ──────────────────────────────────────────────────────
  periodCard: "gap-1.5 rounded-lg border border-border/70 bg-foreground/[0.02] p-2.5",
  stampRow: "items-start justify-between gap-2",
  stampLabel: "text-sm font-semibold",
  stampValue: "text-right text-sm font-num tabular-nums text-foreground font-semibold",
  stampTime: "text-muted-foreground",
  stampOutside: "text-muted-foreground",
  periodFoot: "items-baseline justify-between gap-2 border-t border-border/60 pt-1",
  periodFootText: "text-xs text-muted-foreground",
  toneAsta: "text-danger",
  toneUdaya: "text-success",

  // ── Vakri event row ───────────────────────────────────────────────────────
  eventRow: "items-center justify-between gap-2 rounded-md px-2.5 py-1.5",
  eventLabel: "items-center gap-1.5",
  eventText: "text-sm font-semibold",
  eventValue: "text-right text-sm font-semibold",
  eventDate: "font-num tabular-nums text-foreground",
  eventTime: "text-muted-foreground",
  toneRetro: "text-danger",
  toneDirect: "text-success",

  // ── Eclipse card ──────────────────────────────────────────────────────────
  eclipseGrid: "mt-2 gap-3",
  eclipseCard: "overflow-hidden rounded-xl bg-card",
  eclipseHead: "items-baseline justify-between gap-2 border-b border-border px-3.5 py-2.5",
  eclipseHeadVisible: "bg-success/[0.12]",
  eclipseHeadHidden: "bg-secondary/[0.09] dark:bg-secondary/20",
  eclipseType: "text-base font-bold text-foreground",
  eclipseBadge: "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
  eclipseBadgeText: "text-xs font-bold",
  eclipseBadgeVisible: "bg-success/20 text-success",
  eclipseBadgeHidden: "bg-foreground/10 text-muted-foreground",
  eclipseBody: "gap-1.5 p-3.5",
  eclipseRow: "items-baseline justify-between gap-2",
  eclipseLabel: "text-sm text-muted-foreground",
  eclipseValue: "text-sm font-num tabular-nums text-foreground",
  eclipseDate: "text-right text-sm font-semibold text-foreground",
  eclipseNum: "font-num tabular-nums",
  emptyHint: "py-8",
  emptyHintText: "text-center text-sm text-muted-foreground",
  eclipseNone: "mt-2 overflow-hidden rounded-xl bg-card p-4",
  eclipseNoneText: "text-sm text-muted-foreground",

  // ── Status marks (GrahaStatusBadges, GrahaStatusLegend) ──────────────────
  statusRow: "items-center gap-1",
  statusLegend: "flex-wrap items-center justify-center gap-x-3 gap-y-1",
  statusLegendText: "text-sm text-muted-foreground",
  statusLegendItem: "items-center gap-1",
} as const;
