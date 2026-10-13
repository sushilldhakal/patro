/**
 * Abhijit Muhurta page: header, today hero, month grid of day cards. Shared by
 * the website and the app. Container and text classes are separate keys because
 * React Native does not inherit text style from a View. Page title and hero
 * range sizes use a fluid clamp() on the web, so each app keeps its own size.
 */
export const abhijitClasses = {
  // ── Header ─────────────────────────────────────────────────────────────────
  titleRow: "flex flex-row items-center gap-2.5",
  title: "font-bold leading-tight tracking-tight",
  subtitle: "mt-1.5 max-w-xl text-sm leading-relaxed",

  // ── Today hero ─────────────────────────────────────────────────────────────
  hero: "overflow-hidden rounded-2xl border border-secondary/30 p-5 shadow-xs sm:p-6 dark:border-primary/30",
  heroEyebrow: "mb-1 text-sm font-bold uppercase tracking-eyebrow text-secondary dark:text-primary",
  heroDate: "mb-2 text-sm",
  heroDateAd: "font-num text-sm tabular-nums",
  heroRange: "font-bold leading-tight text-foreground",
  heroNoon: "mt-2 text-sm",
  heroNoonValue: "text-sm font-semibold text-foreground",
  sunPanel:
    "flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-3 text-sm",
  sunDate: "font-num text-xs tabular-nums",

  // ── Note ───────────────────────────────────────────────────────────────────
  noteBox: "rounded-xl border border-border bg-muted/20 px-4 py-3.5",
  noteRow: "flex flex-row gap-2.5",
  noteText: "text-sm leading-relaxed",

  // ── Month heading ──────────────────────────────────────────────────────────
  headingRow: "flex flex-row flex-wrap items-center justify-between gap-2",
  heading: "text-base font-bold text-foreground",
  countPill: "rounded-full border border-border bg-card px-2.5 py-0.5",
  countText: "text-sm font-semibold",

  // ── States ─────────────────────────────────────────────────────────────────
  errorBox: "rounded-lg border border-danger/30 bg-error-surface px-3 py-2.5",
  errorText: "text-sm text-danger",
  empty: "py-5 text-center text-sm",
  skeleton: "h-60 w-full rounded-2xl",
  gridWrap: "rounded-2xl border border-border bg-muted/15 p-3 sm:p-4",

  // ── Day card ───────────────────────────────────────────────────────────────
  dayCard: "flex min-h-[132px] flex-col rounded-xl border p-2.5 shadow-xs sm:min-h-[140px] sm:p-3",
  dayCardToday: "border-secondary/50 bg-secondary/10 dark:border-primary/40 dark:bg-primary/10",
  dayCardIdle: "border-border bg-card",
  dayHead: "mb-1 flex flex-row items-center justify-between gap-1",
  dayWeekday: "text-sm font-semibold",
  todayBadge: "rounded-full bg-secondary/20 px-1.5 py-px dark:bg-primary/20",
  todayBadgeText: "text-sm font-bold uppercase text-secondary dark:text-primary",
  dayNumRow: "mb-2 flex flex-row items-baseline justify-center gap-1.5",
  dayNum: "font-num text-lg font-bold leading-none tabular-nums sm:text-2xl",
  dayNumAd: "font-num text-sm tabular-nums",
  dayBody: "mt-auto flex flex-col gap-1.5",
  dayRange: "text-center text-sm font-bold leading-tight text-secondary sm:text-xs dark:text-primary",
  dayNoon: "text-center text-sm",
  dayNoonValue: "text-base text-foreground",
  daySun: "text-center text-sm",
} as const;
