/**
 * Avakahada chakra page: the nakshatra table, the wheel card with its hub
 * read-out and legend, and the bhoomadosha notes. The website is the source;
 * apps/web and apps/mobile both import these strings.
 *
 * Layout that differs between the DOM and React Native (`flex`, `flex-row`,
 * `grid`, `inline-flex`, `whitespace-nowrap`, `space-y-*`) stays in each app
 * next to the key. Wheel colours that come from the dark wheel theme
 * (`--w-ink`, `--w-accent`) stay with each platform's SVG theme.
 */
export const avakahadaClasses = {
  // ── Table ─────────────────────────────────────────────────────────────────
  note: "rounded-lg border border-border bg-muted/40 px-4 py-3",
  noteText: "text-sm",
  searchBox: "mb-4 items-center gap-2 rounded-lg border border-border bg-card px-3",
  searchWrap: "max-w-sm",
  tableWrap: "rounded-xl border border-border",
  headLabel: "font-semibold text-foreground",
  headInner: "items-center gap-1",
  emptyCell: "py-8",
  emptyText: "text-center text-sm",
  nakCell: "items-center gap-2",
  nakIcon: "h-6 w-6 shrink-0 items-center justify-center text-secondary",
  nakIndex: "text-xs",
  nakLabel: "text-base text-foreground",
  aksharaList: "flex-wrap gap-1",
  aksharaChip: "min-w-7 items-center justify-center rounded-md border border-border bg-card px-1.5 py-0.5",
  aksharaText: "text-base text-foreground",
  ganaBadge: "rounded-full px-2 py-0.5",
  ganaBadgeText: "text-xs",
  /** Gana tone: background and text colour apart, as React Native paints them on two nodes. */
  ganaBg: {
    देव: "bg-emerald-500/15",
    नर: "bg-sky-500/15",
    राक्षस: "bg-rose-500/15",
  },
  ganaFg: {
    देव: "text-emerald-700 dark:text-emerald-300",
    नर: "text-sky-700 dark:text-sky-300",
    राक्षस: "text-rose-700 dark:text-rose-300",
  },

  // ── Wheel card ────────────────────────────────────────────────────────────
  wheelSection: "mt-2 overflow-hidden rounded-2xl border border-border",
  wheelHead: "mb-3 px-4 pt-4",
  wheelTitle: "text-lg font-bold text-foreground",
  wheelSubtitle: "text-sm",
  /** The dark stage the SVG sits in; its fill and border are the wheel theme. */
  wheelStage: "rounded-2xl p-1.5 sm:p-3",
  wheelToolbar: "mb-2 shrink-0 items-center justify-end gap-1.5",
  zoomReset: "rounded-md border px-2 py-1",
  zoomButton: "h-7 w-7 items-center justify-center rounded-md border",
  zoomPercent: "min-w-10 text-center text-sm font-semibold font-num",
  legend: "mt-3 flex-wrap items-center gap-x-3.5 gap-y-2.5 text-xs",
  legendLabel: "font-semibold text-foreground",
  legendItem: "items-center gap-1.5",
  legendSwatch: "h-3 w-3 rounded-md border border-foreground/20",
  legendText: "text-xs",

  // ── Wheel hub read-out (font sizes are for the web wheel's scale; the app
  //    draws the wheel unscaled and sets its own size beside the key) ─────────
  hubStack: "items-center gap-1 px-0.5 py-1",
  hubIcon: "h-9 w-9 shrink-0",
  hubIconFallback: "text-2xl font-bold text-secondary",
  hubNakTitle: "m-0 text-sm font-bold leading-snug",
  hubAttrList: "mt-1 w-full text-left text-sm leading-snug",
  hubAttrRow: "gap-1 border-b py-0.5 last:border-b-0",
  hubAttrName: "text-base leading-snug",
  hubAttrValue: "m-0 text-sm font-semibold leading-snug",
  hubLabel: "m-0 text-sm font-bold uppercase tracking-wide",
  hubValue: "mt-0.5 text-base font-bold leading-snug",
  hubSub: "mt-1 text-sm leading-snug",
  hubVairi: "text-sm",
  hubGanaPill: "rounded-full px-1.5 text-sm font-bold",
  hubIdleTitle: "m-0 text-lg font-bold",
  hubIdleHint: "mt-1 text-sm font-semibold",

  // ── Bhoomadosha notes ─────────────────────────────────────────────────────
  notes: "gap-4",
  notesTitle: "text-xl font-bold text-foreground",
  notesGrid: "gap-3",
  notesCard: "rounded-xl border border-border p-4",
  notesCardTitle: "mb-2 text-sm font-semibold text-foreground",
  vargaList: "gap-1.5",
  vargaRow: "items-center gap-2",
  vargaName: "text-base text-foreground",
  vargaVs: "text-xs",
  vargaNote: "mt-3 text-xs",
  shlokaList: "gap-3",
  shloka: "text-sm leading-relaxed",
  footnote: "text-xs",
} as const;
