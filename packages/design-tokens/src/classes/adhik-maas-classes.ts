/**
 * Adhik maas: the home notice under the calendar (`@vedic-patro/ui/kit/shell`
 * AdhikMaasNotice) and the year page's result card and nearby-years grid.
 * Shared by the website and the app; text keys are separate from containers
 * because React Native does not inherit text style from a View.
 */
export const adhikMaasClasses = {
  // ── Home notice ────────────────────────────────────────────────────────────
  notice: "rounded-xl border border-border bg-card",
  noticeRow: "w-full flex-row items-center gap-2.5 px-3 py-2",
  noticeLabel: "min-w-0 flex-1 text-sm text-foreground",
  noticeBody: "border-t border-border px-3 pb-3 pt-2",
  noticeDetail: "text-sm font-medium text-foreground",
  noticeWhy: "mt-1 text-xs leading-relaxed text-muted-foreground",
  noticeMore: "mt-2 self-start",
  noticeMoreText: "text-xs font-medium text-secondary",

  // ── Year page ──────────────────────────────────────────────────────────────
  backLink: "mb-2 inline-flex items-center gap-1 text-xs hover:text-foreground",
  cardName: "text-lg font-bold text-secondary",
  nearbyGrid: "flex-row flex-wrap gap-2",
  nearbyChip: "rounded-xl border px-3 py-2.5",
  nearbyChipActive: "border-secondary bg-secondary/10",
  nearbyChipIdle: "border-border bg-card",
  nearbyYear: "text-xs text-muted-foreground",
  nearbyMonth: "text-sm font-semibold text-foreground",
  nearbyNone: "text-sm font-semibold text-muted-foreground",
  readMore: "text-sm font-medium text-secondary",
} as const;
