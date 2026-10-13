/**
 * Kundali pages (list, detail, milan): the classes the website and the app
 * share. Section and report components use `kundali-detail-classes.ts`.
 * `flex-row` is spelled out because React Native defaults to a column; on the
 * web it is the default and changes nothing.
 */
export const kundaliClasses = {
  // ── List / milan page header ───────────────────────────────────────────────
  headerRow: "mb-4 mt-2 flex flex-row items-start justify-between gap-3",
  eyebrow: "mb-1.5 text-xs uppercase tracking-eyebrow",
  title: "text-xl font-bold leading-tight tracking-tight",
  titleRow: "flex flex-row items-center gap-2.5",
  subtitle: "mt-1 text-sm",
  profileHint: "text-sm",

  // ── Empty / loading / error boxes ──────────────────────────────────────────
  emptyBox: "rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12",
  emptyBoxTall: "rounded-xl border border-dashed border-border bg-muted/20 px-5 py-16",
  emptyBoxShort: "rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8",
  emptyText: "text-center text-sm",
  warnBox: "rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-8",
  warnText: "text-center text-sm text-foreground",
  errorBox: "rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-8",
  errorText: "text-center text-sm text-destructive",
  noticeBox: "rounded-xl border border-border bg-card px-5 py-12",
  noticeTitle: "text-center text-sm text-foreground",
  noticeBody: "mt-1 max-w-md text-center text-sm",
  computingBox: "rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16",
  loadError: "rounded-xl border border-destructive/20 bg-destructive/10 p-4",
  loadErrorText: "text-sm text-destructive",
  sectionUnavailable: "py-8 text-center text-sm",
  noBirthBox: "rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16",
  noBirthTitle: "text-base font-semibold text-foreground",
  noBirthBody: "mt-2 max-w-md text-center text-sm",

  // ── Login prompt ───────────────────────────────────────────────────────────
  loginCard: "rounded-2xl border border-border bg-card px-6 py-12",
  loginIcon: "mb-4 h-14 w-14 items-center justify-center rounded-full bg-secondary/15",
  loginTitle: "text-center text-xl font-bold text-foreground",
  loginBody: "mt-2 max-w-md text-center text-sm",
  loginActions: "mt-6 flex flex-row flex-wrap items-center justify-center gap-3",

  // ── Detail page: top bar + profile header ──────────────────────────────────
  topBar: "flex flex-row flex-wrap items-center justify-between gap-3",
  topBarActions: "flex flex-row flex-wrap items-center gap-2",
  backLink: "flex-row items-center gap-1.5",
  backLinkText: "text-sm",
  profileHeader: "overflow-hidden rounded-xl border border-border bg-card",
  profileIdentity: "min-w-0 flex-row items-center gap-2.5 px-3 py-2.5 sm:px-4",
  profileAvatar: "size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/15 sm:size-10",
  profileEyebrow: "mb-0.5 text-sm font-semibold uppercase tracking-eyebrow",
  profileName: "text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl",
  profileNameRow: "flex flex-row flex-wrap items-center gap-1.5",
  profileGender: "mt-0.5 text-sm capitalize",
  metaItem: "flex-col justify-center gap-0 px-2.5 py-2 sm:px-3",
  metaLabelRow: "flex flex-row items-center gap-1",
  metaLabel: "text-sm font-semibold uppercase tracking-wider",
  metaValue: "text-sm font-semibold leading-tight text-foreground",
  metaValueMono: "font-mono text-xs font-semibold leading-tight text-foreground",
  metaSub: "mt-0.5 text-sm leading-tight",

  // ── Milan: birth details card ──────────────────────────────────────────────
  detailsCard: "overflow-hidden rounded-2xl border border-border bg-card",
  detailsHeader: "border-b border-border bg-muted/20 px-4 py-3",
  detailsHeading: "text-sm font-semibold",
} as const;
