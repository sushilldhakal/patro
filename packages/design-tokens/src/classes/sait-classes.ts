import { spec } from "../specs";

/**
 * Sait (muhurta) pages: ceremony layout, day card, rules section, profile
 * picker, verdict badge/legend, sources card and the date-only (Vas)
 * categories. The website and the app both read these strings.
 *
 * Container and text classes are separate keys because React Native does not
 * inherit text style from a View: the website puts both on the one element,
 * the app puts each on its own View/Text. Hover, focus, transitions,
 * animations, `ring-*`, `inline-flex`/`w-fit`/`truncate`/`m-0` and CSS grid
 * columns stay in the website; explicit widths and native-only pieces stay in
 * the app.
 */
export const saitClasses = {
  // ── Ceremony layout ───────────────────────────────────────────────────────
  nakshatraRow: "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3",
  nakshatraLabel: "text-sm font-medium text-foreground",
  nakshatraGroup: "flex flex-row flex-wrap gap-1 rounded-lg border border-border bg-card p-0.5",
  nakshatraBtn: "rounded-md px-2.5 py-1.5",
  nakshatraBtnText: "text-xs font-semibold",
  nakshatraBtnActive: "bg-primary",
  nakshatraBtnTextActive: "text-primary-foreground",
  nakshatraBtnTextIdle: "text-muted-foreground",
  countText: "text-sm text-muted-foreground",
  profileBox: "flex flex-col gap-2 rounded-xl border border-border bg-surface-inset p-3",
  body: "space-y-6",
  skeletonCard: "h-40 rounded-xl border border-border bg-surface-muted",
  monthBlock: "space-y-3",
  monthHeader: "flex flex-row items-end justify-between gap-3",
  monthTitle: "text-lg font-bold text-foreground",
  monthCount: "text-sm text-muted-foreground",
  dayGrid: "gap-3",
  emptyText: "py-8 text-center text-sm text-muted-foreground",

  // ── Day card ──────────────────────────────────────────────────────────────
  card: "flex flex-col rounded-xl border border-border bg-card p-4",
  cardBadgeRow: "flex flex-row justify-end pb-1.5",
  cardHead: "flex flex-row items-stretch gap-3 pb-3",
  dateBox:
    "flex min-w-[4.25rem] flex-col items-center justify-center rounded-lg bg-surface-inset px-2 py-2.5",
  dateMonth: "text-diagram-xs font-semibold uppercase tracking-wider text-secondary",
  dateDay: "font-num text-3xl font-bold leading-none tracking-tight text-foreground",
  headBody: "flex min-w-0 flex-1 flex-col justify-center gap-1.5",
  titleRow: "flex flex-row flex-wrap items-baseline gap-x-2 gap-y-0.5",
  weekday: "text-base font-bold leading-tight text-foreground",
  gregorian: "font-num text-sm text-muted-foreground",
  windowChip: "flex flex-row max-w-full items-center gap-1.5 rounded-md bg-secondary/12 px-2 py-1",
  windowText: "text-sm font-semibold text-secondary",
  windowTime: "font-num tabular-nums",
  windowNote: "text-xs font-medium text-secondary/80",
  facts: "border-t border-border pt-3",
  factItem: "flex flex-col gap-0.5",
  factLabel: "text-xs text-muted-foreground",
  factValue: "text-sm font-semibold text-foreground",
  block: "mt-3 border-t border-border pt-2.5",
  blockRow: "flex flex-row flex-wrap items-center gap-1.5",
  blockRowLoose: "flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1",
  blockLabel: "text-xs font-semibold text-muted-foreground",
  blockIconLabel: "flex flex-row items-center gap-1",
  chip: "flex flex-row items-center rounded-md px-1.5 py-0.5",
  chipGap: "gap-1",
  chipText: "text-xs font-semibold",
  chipNum: "font-num tabular-nums",
  summary: "mt-1.5 text-xs font-semibold",
  summaryNote: "font-normal text-muted-foreground",

  // ── Tone flags (graha shuddhi, kumbha chakra, anna month) ────────────────
  toneText: {
    good: "text-success",
    shanti: "text-warning",
    avoid: "text-danger",
  },
  toneChip: {
    good: "bg-success/12",
    shanti: "bg-warning/15",
    avoid: "bg-danger/12",
  },
  toneChipText: {
    good: "text-foreground dark:text-success",
    shanti: "text-warning",
    avoid: "text-danger",
  },

  // ── Per-day verdict (native chart suitability) ───────────────────────────
  suitability: {
    favourable: {
      dot: "bg-success",
      box: "bg-success/12",
      text: "text-foreground dark:text-success",
      frame: "border-2 border-success/50",
    },
    neutral: {
      dot: "bg-muted-foreground/60",
      box: "bg-surface-muted",
      text: "text-muted-foreground",
      frame: "border border-border",
    },
    avoid: {
      dot: "bg-danger",
      box: "bg-danger/12",
      text: "text-danger",
      frame: "border-2 border-danger/40",
    },
  },
  badge: "flex flex-row items-center gap-1 rounded-md px-1.5 py-0.5",
  badgeText: "text-xs font-semibold",
  badgeDot: "size-1.5 rounded-full",
  legend: "flex flex-row flex-wrap items-center gap-x-3 gap-y-1",
  legendText: "text-xs text-muted-foreground",
  legendTitle: "font-medium text-foreground",
  legendItem: "flex flex-row items-center gap-1",
  legendDot: "size-2 rounded-full",
  legendCount: "font-num tabular-nums",

  // ── Rules section ─────────────────────────────────────────────────────────
  rulesCard: "overflow-hidden rounded-xl border border-border bg-card",
  rulesHead: "flex flex-row items-center gap-3 px-4 py-3.5",
  rulesHeadText: "min-w-0 flex-1",
  rulesTitle: "text-base font-bold text-foreground",
  rulesSubtitle: "mt-0.5 text-sm text-muted-foreground",
  rulesBody: "space-y-4 border-t border-border px-4 py-4",
  rulesIntro: "max-w-4xl text-sm leading-relaxed text-foreground/90",
  rulesHint: "flex flex-row items-start gap-1.5",
  rulesHintText: "text-xs leading-relaxed text-muted-foreground",
  ruleList: "gap-3",
  rule: "flex flex-col gap-2 rounded-lg border p-3.5",
  ruleOn: "border-border bg-surface-inset",
  ruleOff: "border-dashed border-border bg-surface-inset/40",
  ruleHead: "flex flex-row items-start gap-2",
  ruleNum: "flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary/15",
  ruleNumText: "font-num text-xs font-bold text-secondary",
  ruleText: "flex-1 text-sm font-semibold leading-snug",
  ruleTextOn: "text-foreground",
  ruleTextOff: "text-muted-foreground",
  ruleDetail: "flex flex-col gap-1.5 border-t border-border pt-2.5",
  ruleDetailOff: "opacity-60",
  ruleSource: "text-sm font-semibold text-muted-foreground",
  ruleShloka: "text-base italic leading-relaxed text-foreground",
  ruleGloss: "text-sm leading-relaxed text-muted-foreground",
  engine: "flex flex-row items-center gap-1.5 pt-4",
  engineText: "text-xs text-muted-foreground",

  // ── Sources ───────────────────────────────────────────────────────────────
  sourcesCard: "rounded-xl border border-border bg-muted/40 p-3.5 sm:p-5",
  sourcesHeading: "text-sm font-semibold text-foreground",
  sourcesBlurb: "mt-1.5 text-sm text-muted-foreground",
  sourcesList: "mt-4 flex flex-col gap-4",
  sourceItem: "flex flex-row gap-3",
  sourceText: "text-sm",
  sourceNum: "w-5 shrink-0 font-semibold text-muted-foreground",
  sourceBody: "min-w-0 flex flex-col gap-1",
  sourceCredit: "font-semibold text-foreground",
  sourceDetail: "text-muted-foreground",

  // ── Profile picker ────────────────────────────────────────────────────────
  pickerRow: "flex flex-row flex-wrap items-center gap-2",
  pickerLabel: "flex-row items-center gap-1.5",
  pickerLabelText: "text-sm font-medium text-foreground",
  pickerSignIn: spec.chip,
  pickerSignInText: "text-xs font-semibold text-primary",
  pickerHint: "text-xs text-muted-foreground",
  pickerSelect: "h-9 min-w-[10rem] max-w-[16rem] rounded-lg border border-border bg-card px-2.5",
  pickerSelectText: "text-sm text-foreground",
  sheetHeader: "border-b border-border px-4 py-3",
  sheetTitle: "text-sm font-semibold text-foreground",
  sheetOption: "flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3.5",
  sheetOptionActive: "bg-secondary/10",
  sheetOptionText: "shrink text-sm",
  sheetOptionTextActive: "text-secondary",
  sheetOptionTextIdle: "text-foreground",

  // ── Date-only categories (Vas) ────────────────────────────────────────────
  notice: "flex flex-row gap-2.5 rounded-xl bg-card border-l-2 border-l-secondary p-3.5",
  noticeText: "text-sm text-danger",
  noticeIconWrap: "mt-0.5",
  dateList: "flex flex-col gap-2",
  dateSkeleton: "h-14 rounded-xl bg-surface-muted",
  dateSkeletonList: "gap-2",
  dateRow: "flex flex-col gap-2 rounded-xl bg-card p-3.5 sm:flex-row sm:items-center sm:gap-4",
  dateRowMonth: "w-28 shrink-0 text-sm font-bold text-foreground",
  dateRowDays: "flex flex-row flex-wrap gap-1.5",
  dateChip: "h-8 min-w-8 items-center justify-center rounded-md px-2",
  dateChipText: "font-num text-sm font-semibold tabular-nums",
  noDates: "rounded-xl border border-dashed border-border bg-surface-inset px-6 py-12",
  noDatesText: "text-center text-sm text-muted-foreground",
} as const;
