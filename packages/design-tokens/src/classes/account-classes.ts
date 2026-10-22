/**
 * Account, password reset, e-mail verification and the sign-in dialog, shared
 * by the website and the app. The website is the source of truth; the stacking
 * (flex / flex-col on the DOM, flex-row on React Native) is added next to the
 * element in each app.
 */
export const accountClasses = {
  // ── Account page ──────────────────────────────────────────────────────────
  column: "mx-auto max-w-2xl",
  header: "mb-6",
  title: "text-2xl font-bold text-foreground",
  subtitle: "text-sm",
  banner:
    "mb-6 items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10",
  bannerIcon: "mt-0.5 shrink-0",
  bannerText: "text-sm text-amber-800 dark:text-amber-200",
  bannerAction: "mt-1 text-base text-amber-700 dark:text-amber-300",
  sectionRow: "mb-4 items-center justify-between",
  sectionTitle: "text-lg font-semibold text-foreground",
  errorText: "mb-4 text-sm text-destructive",
  loadingBox: "py-10",
  emptyBox: "rounded-lg border border-dashed border-border py-10",
  emptyText: "text-center text-sm",
  profileList: "gap-3",
  profileRow: "items-center justify-between gap-3 rounded-lg border border-border bg-card p-4",
  profileBody: "min-w-0",
  profileNameRow: "items-center gap-2",
  profileName: "text-base text-foreground",
  defaultBadge: "items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5",
  defaultBadgeText: "text-xs text-secondary",
  profileMeta: "text-sm",
  profileActions: "shrink-0 items-center gap-1",
  dangerZone: "mt-10 border-t border-border pt-6",
  dangerTitle: "text-lg font-semibold text-destructive",
  dangerBody: "mt-1 text-sm text-muted-foreground",
  dangerButton: "mt-3 border border-destructive",
  dangerButtonText: "text-destructive",

  // ── Reset password and verify e-mail ──────────────────────────────────────
  panel: "mx-auto max-w-md justify-center",
  panelCentered: "mx-auto max-w-md items-center justify-center text-center",
  formTitle: "text-xl font-bold text-foreground",
  statusTitle: "mt-4 text-xl font-bold text-foreground",
  statusBody: "mt-1 text-sm",
  loadingRow: "mt-6 items-center gap-2 text-sm",
  form: "mt-6 gap-3",
  backLink: "text-center text-sm",
  statusAction: "mt-6",

  // ── Form fields (reset password, profile form, sign-in dialog) ────────────
  field: "gap-1.5",
  label: "text-sm text-foreground",
  /** Text input on the app; the website renders its ui/Input with the same box. */
  input: "h-9 rounded-lg border border-border px-3 py-2 text-sm text-foreground",
  hint: "text-xs",
  formError: "text-sm text-destructive",
  formNotice: "text-sm text-emerald-600 dark:text-emerald-400",
  submit: "mt-1",

  // ── Profile form ──────────────────────────────────────────────────────────
  profileForm: "gap-4",
  fieldRow: "gap-4",
  checkRow: "items-center gap-2",
  checkText: "text-sm text-foreground",
  formActions: "justify-end gap-2",

  // ── Sign-in dialog ────────────────────────────────────────────────────────
  socialStack: "gap-3",
  socialDividerRow: "w-full items-center gap-3 text-xs",
  socialDividerLine: "h-px flex-1 bg-border",
  socialDividerText: "text-xs",
  socialButton: "h-10 max-w-full gap-2 rounded-full border border-border bg-background",
  socialButtonText: "text-base text-foreground",
  socialFallbackText: "text-sm",
  dialogForm: "gap-3",
  switchStack: "gap-1 text-center text-sm",
  switchText: "text-sm",
  switchLink: "text-base text-secondary",
  legal: "text-center text-xs text-muted-foreground",
  legalLink: "text-xs text-secondary",

  // ── Account menu ──────────────────────────────────────────────────────────
  avatarSkeleton: "h-8 w-8 rounded-full bg-muted",
  avatar: "h-8 w-8 items-center justify-center rounded-full bg-secondary/15",
  avatarText: "text-sm font-semibold text-secondary",
  menuEmail: "text-sm text-foreground",
  menuStatus: "text-xs",
  menuPanel: "absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-border bg-card p-1.5 shadow-lg",
  menuItem: "items-center gap-2 rounded-md px-2.5 py-2 text-sm",
  menuItemText: "text-sm text-foreground",

  // ── Settings page (app) ───────────────────────────────────────────────────
  settingsLink: "flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80",
  settingsLinkBody: "flex-1 flex-row items-center gap-3 pr-3",
  settingsLinkTitle: "text-sm font-medium text-foreground",
  settingsLinkText: "mt-0.5 text-xs text-muted-foreground",
  settingsRowTitle: "text-body font-semibold text-foreground",
  settingsRowText: "text-caption text-muted-foreground",

  // ── Profile form native selects ───────────────────────────────────────────
  select: "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30",
} as const;
