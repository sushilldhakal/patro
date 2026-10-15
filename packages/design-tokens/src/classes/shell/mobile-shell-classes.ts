/**
 * Mobile-only screens (more, reminders, offline data, day detail). There is
 * no website page to match, so these classes are the screen's own token look.
 * Import by path: the package export map only publishes one folder level.
 */
export const mobileShellClasses = {
  moreRow: "flex-row items-center gap-3 border-b border-border/40 py-3 active:opacity-80",
  moreRowLabel: "text-body flex-1 font-medium text-foreground",
  moreSettingRow: "flex-row items-center justify-between gap-3 border-b border-border/40 py-3",
  moreGroupTitle: "text-body mb-2 font-semibold text-foreground",
  moreVersionTitle: "text-body mb-1 font-semibold text-foreground",
  moreMeta: "text-caption font-mono text-muted-foreground",
  moreMetaGap: "text-caption mt-2 text-muted-foreground",
  moreTabletCard: "min-w-[45%] flex-1",
  moreWideCard: "w-full",
  moreStack: "gap-4",
  moreTabletStack: "flex-row flex-wrap gap-4",

  reminderChip: "rounded-full border px-3 py-1.5 active:opacity-80",
  reminderChipLabel: "text-body font-semibold",
  reminderSection: "text-body mb-2 font-bold text-foreground",

  dayScreen: "flex-1 bg-background",
  dayHeader: "border-b border-border py-3",
  dayTitle: "text-title font-bold text-foreground",
  daySubtitle: "text-body text-muted-foreground",

  offlineYearInput: "text-body rounded-lg border px-3 py-2.5",
  offlineYearLabel: "text-caption mb-1 font-semibold text-muted-foreground",
  offlineEmpty: "items-center gap-3 rounded-xl border border-dashed border-border px-5 py-12",
  offlineBanner: "mb-5 flex-row items-center gap-2.5 rounded-lg border p-3",
  offlineCard: "rounded-xl border border-border bg-card p-4",
  offlineCardLoose: "mt-5 rounded-xl border border-border bg-card p-4",
  offlineCardAfter: "mt-4 rounded-xl border border-border bg-card p-4",
  offlineGhost: "mt-3 self-start rounded-lg border border-border px-3 py-2 active:opacity-80 disabled:opacity-50",
  offlineFieldLabel: "text-caption mb-1 mt-4 font-semibold text-muted-foreground",
  offlineOption: "flex-row items-start gap-3 py-2 active:opacity-80",
  offlineEstimate: "mt-3 rounded-lg border border-border bg-background p-3",
  offlinePrimary: "mt-4 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 active:opacity-80 disabled:opacity-50",
  offlineTrack: "mt-2 h-1.5 overflow-hidden rounded-full bg-muted",
  offlineResume: "mt-4 flex-row items-center gap-2 rounded-xl border border-border bg-card p-4",
  offlineWifi: "mt-5 flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 active:opacity-80",
  offlineSwitch: "h-6 w-11 justify-center rounded-full px-0.5",
  offlineKnob: "h-5 w-5 rounded-full bg-white shadow",
  offlineDangerZone: "mt-8 border-t border-border pt-5",
  offlineDanger: "flex-row items-center gap-2 self-start rounded-lg border border-destructive px-4 py-2.5 active:opacity-80 disabled:opacity-50",
  offlineStat: "text-display mt-1 font-bold text-foreground",
} as const;
