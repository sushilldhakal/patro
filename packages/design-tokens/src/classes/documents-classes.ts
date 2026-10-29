import { spec } from "../specs";

/**
 * Documents (scripture library): list page, document page, chapter page, verse
 * card and the playback bar. The website and the app both read these strings.
 * Hover, focus, transitions, `ring-*`, `backdrop-*` and CSS-only helpers stay
 * in the website component; React Native layout (explicit `flex-row`, absolute
 * positioning) stays in the app.
 */
export const documentsClasses = {
  // ── Page states ───────────────────────────────────────────────────────────
  errorText: "text-sm text-destructive",
  mutedText: "text-sm text-muted-foreground",
  notFound: "mt-4 text-sm text-muted-foreground",
  backLink: "items-center gap-1.5 text-sm",
  backLinkText: "text-sm",

  // ── Category tabs ─────────────────────────────────────────────────────────
  tabsBar: "mb-6 flex flex-row flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1",
  tab: "rounded-lg px-3 py-1.5",
  tabLabel: "text-sm font-semibold",
  tabSelected: "bg-card shadow-sm",
  tabLabelSelected: "text-foreground",
  tabLabelIdle: "text-muted-foreground",
  tabCount: "ml-1.5 text-xs font-medium tabular-nums text-muted-foreground",

  // ── Category section ──────────────────────────────────────────────────────
  sectionHeader: "flex flex-row items-end justify-between gap-3 border-b border-border/70 pb-2",
  sectionTitle: "text-lg font-bold",
  sectionIndex: "tabular-nums text-muted-foreground",
  sectionCount: "shrink-0 text-xs font-semibold tabular-nums text-muted-foreground",

  // ── Document card ─────────────────────────────────────────────────────────
  card: `${spec.cardRoomy} flex flex-col gap-3`,
  cardTop: "flex flex-row items-start justify-between gap-2",
  cardIcon: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10",
  cardTitle: "text-lg font-semibold",
  cardSubtitle: "mt-0.5 text-sm text-muted-foreground",
  cardDescription: "text-sm text-muted-foreground",
  cardMeta: "flex flex-row items-center gap-3 pt-1",
  cardMetaText: "text-xs font-semibold text-muted-foreground",

  // ── Document / chapter header ─────────────────────────────────────────────
  header: "gap-1.5",
  headerSanskrit: "text-sm font-medium text-secondary",
  headerTitle: "text-2xl font-bold sm:text-3xl",
  headerSubtitle: "text-sm text-muted-foreground",
  headerDescription: "max-w-2xl text-sm text-muted-foreground",
  headerSource: "text-xs text-muted-foreground",
  statsRow: "flex flex-row items-center gap-3",
  statsText: "text-xs font-semibold text-muted-foreground",

  // ── Chapter number bubble / chapter pills ─────────────────────────────────
  chapterBubble: "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary/10",
  chapterBubbleText: "text-base font-bold tabular-nums text-secondary",
  chapterPill: "flex size-9 shrink-0 items-center justify-center rounded-full border border-border",
  chapterPillText: "text-sm font-bold tabular-nums text-muted-foreground",
  chapterHeading: "text-lg font-bold sm:text-xl",
  chapterHeadingSub: "text-sm text-muted-foreground",

  // ── Chapter card (row in a chapter picker) ────────────────────────────────
  chapterRow: "flex flex-row items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5",
  chapterRowNumber: "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/10",
  chapterRowNumberText: "text-sm font-bold tabular-nums text-secondary",
  chapterRowTitle: "text-sm font-semibold",
  chapterRowSub: "text-sm text-muted-foreground",
  chapterRowCount: "mt-0.5 text-xs text-muted-foreground/80",

  // ── Section title cards (multi-column picker) ─────────────────────────────
  sectionColumns: "columns-1 gap-3 sm:columns-2 lg:columns-3 [column-fill:balance]",
  sectionCard: "mb-3 inline-flex w-full break-inside-avoid flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3.5 text-left",
  sectionCardTitle: "text-sm font-semibold leading-snug text-foreground",
  sectionCardCount: "text-xs text-muted-foreground/80",

  // ── Chapter page ──────────────────────────────────────────────────────────
  chapterTitleRow: "flex flex-row items-center justify-between gap-3",
  chapterProgress: "text-xs font-semibold text-muted-foreground",
  chapterTitle: "min-w-0 text-2xl font-bold sm:text-3xl",
  chapterTitleSub: "mt-0.5 text-base font-semibold text-muted-foreground sm:text-lg",
  suktaLabel: "text-sm font-bold text-secondary",
  suktaMeta: "mt-0.5 text-xs text-muted-foreground",
  pager: "flex flex-row items-center justify-between gap-3 border-t border-border pt-4",
  pagerButton: "flex flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5",
  pagerButtonText: "text-sm font-semibold",

  // ── Jump form ─────────────────────────────────────────────────────────────
  jumpForm: "flex flex-row flex-wrap items-end gap-2",
  jumpField: "flex flex-col gap-1",
  jumpLabel: "text-xs font-semibold text-muted-foreground",
  /** Text input box on the app; the website renders its ui/Input with the same box. */
  jumpInput: "h-9 rounded-lg border border-border px-3 py-2 text-sm text-foreground",
  jumpChapterInput: "w-20",
  jumpSectionSelect: "h-9 min-w-[12rem] max-w-full flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground sm:min-w-[16rem]",
  jumpVerseInput: "w-28",
  jumpError: "text-xs text-destructive",

  // ── Verse card ────────────────────────────────────────────────────────────
  verse: "rounded-xl border p-4 sm:p-5",
  verseActive: "border-secondary/60 bg-secondary/5",
  verseIdle: "border-border bg-card",
  verseClosing: "border-secondary/35 bg-secondary/5",
  verseNote: "border-dashed bg-muted/30",
  verseRow: "flex flex-row items-start gap-3",
  versePlay: "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border",
  /* Same solid teal button as the home page's mantra card, playing or not; the playing
     verse is told apart by its highlighted card. */
  versePlayActive: "border-secondary bg-secondary",
  versePlayIdle: "border-secondary bg-secondary",
  verseLabelSlot: "mt-0.5 flex size-9 shrink-0 items-center justify-center",
  verseLabelSlotText: "text-xs font-semibold tabular-nums text-muted-foreground/50",
  verseBody: "min-w-0 flex-1",
  verseMetaRow: "flex flex-row items-start justify-between gap-3",
  verseBadge: "rounded-md bg-muted px-1.5 py-0.5",
  verseBadgeText: "text-xs font-semibold tabular-nums text-muted-foreground",
  verseCite: "ml-auto shrink-0 pt-0.5 text-right text-xs font-medium text-muted-foreground",
  /* Keep Devanagari intact — avoid mid-akshara wraps from overflow-wrap:anywhere. */
  verseText: "mt-1 break-normal [overflow-wrap:normal] [word-break:normal] leading-relaxed text-lg sm:text-xl",
  verseTextNote: "mt-1 whitespace-pre-line break-normal [overflow-wrap:normal] leading-relaxed text-base text-foreground/85 sm:text-lg",
  chapterImages: "grid gap-3 sm:grid-cols-2",
  chapterImage: "w-full rounded-xl border border-border bg-card object-contain",
  verseWord: "rounded bg-yellow-300/70 px-0.5 dark:bg-yellow-400/30",
  verseTranslit: "mt-1.5 text-sm italic text-muted-foreground",
  verseProgress: "mt-3 h-0.5 w-full overflow-hidden rounded-full bg-border",
  verseProgressFill: "h-full bg-secondary",
  verseMeaningWrap: "mt-1",
  frame: "px-4 py-8 sm:px-6",
  verseMeaningToggle: "gap-1.5 py-1.5",
  verseMeaningToggleText: "text-xs font-semibold text-secondary",
  verseMeaning: "pb-1 text-base leading-relaxed sm:text-lg",

  // ── Playback bar ──────────────────────────────────────────────────────────
  barShell: "w-full max-w-2xl rounded-2xl border border-border bg-background/95 shadow-lg",
  barPadIdle: "px-4 py-3",
  barPad: "px-3 py-2.5",
  barRow: "flex flex-row items-center gap-3",
  barPlay: "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary",
  barSkip: "flex size-8 shrink-0 items-center justify-center rounded-full",
  fill: "min-w-0 flex-1",
  barTitle: "text-sm font-semibold",
  barSubtitle: "text-xs text-muted-foreground",
  barKicker: "text-xs font-semibold text-muted-foreground",
  barScrubRow: "mt-1.5 flex flex-row items-center gap-2",
  barTime: "w-8 shrink-0 text-diagram-xs tabular-nums text-muted-foreground",
  barTrack: "h-1 w-full min-w-0 flex-1 overflow-hidden rounded-full bg-border",
  barTrackFill: "h-full bg-secondary",
} as const;
