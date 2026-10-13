/**
 * Page chrome both apps render on every page: header, brand mark, floating
 * bottom navigation and the footer link row. The website is the source of
 * truth; positioning (fixed/sticky vs absolute) and flex direction stay next
 * to the element in each app.
 */
export const shellClasses = {
  // ── Header ────────────────────────────────────────────────────────────────
  header: "border-b border-border bg-background/80",
  headerInner: "mx-auto max-w-page items-center px-4",
  brand: "min-w-0 items-center gap-2.5",
  brandName: "text-base font-bold tracking-tight",
  brandVedic: "text-secondary dark:text-primary",
  brandPatro: "text-foreground",
  navLink: "items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
  navSubLink: "w-full items-center gap-2 rounded-lg px-3 py-2 text-sm",

  // ── Navigation drawer ─────────────────────────────────────────────────────
  drawerHeader: "border-b border-border",
  drawerBrandRow: "items-center gap-2.5",
  drawerTitle: "text-base font-semibold",
  drawerTitleVedic: "text-secondary",
  drawerTitlePatro: "text-foreground",

  // ── Floating bottom navigation ────────────────────────────────────────────
  navOuter: "px-2",
  navBar:
    "max-w-lg items-stretch justify-around gap-0.5 rounded-2xl border border-border bg-background/90 p-1",
  navItem: "flex-1 items-center gap-1 rounded-xl px-1 py-1.5",
  navItemActive: "bg-secondary/10",
  navLabel: "text-diagram-xs font-medium leading-normal",
  navLabelActive: "text-secondary",
  navLabelIdle: "text-muted-foreground",

  // ── Page frame ────────────────────────────────────────────────────────────
  pageHeaderIcon: "mt-0.5",
  pageHeaderRow: "mb-8 items-start justify-between gap-3",

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: "mt-12 border-t border-border",
  footerRow: "mx-auto max-w-page items-center justify-center gap-x-4 gap-y-2 px-4 py-6",
  footerLink: "text-sm text-muted-foreground",
} as const;
