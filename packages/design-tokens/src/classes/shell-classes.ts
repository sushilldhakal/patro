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
  /** The website drawer's preferences block, scrolling under the menu (not pinned to the foot). */
  drawerPrefs: "flex flex-col gap-3 border-t border-border p-4",
  drawerSettingsLink: "flex items-center justify-between gap-3 rounded-lg py-1 text-sm text-foreground hover:text-secondary",
  drawerBrandRow: "items-center gap-2.5",
  drawerTitle: "text-base font-semibold",
  drawerTitleVedic: "text-secondary",
  drawerTitlePatro: "text-foreground",

  // ── Floating bottom navigation ────────────────────────────────────────────
  navOuter: "px-2",
  navBar:
    "max-w-lg items-stretch justify-around gap-0.5 rounded-2xl border border-border bg-background/90 p-1",
  navItem: "flex-1 items-center gap-1 rounded-xl px-1 py-1.5",
  /** Website: scrolling down folds the bar to its icons in a narrower pill (the app animates the same). */
  navBarMotion: "transition-[max-width,padding] duration-200 ease-out motion-reduce:transition-none",
  navBarCompact: "max-w-xs",
  navItemMotion: "transition-[color,background-color,gap,padding] duration-200 ease-out motion-reduce:transition-none",
  navItemCompact: "gap-0 py-2",
  navLabelFold: "grid max-w-full transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
  navLabelFolded: "grid-rows-[0fr] opacity-0",
  navLabelOpen: "grid-rows-[1fr] opacity-100",
  /** The app's bottom row: [search, +] [tabs] [place]. Three capsules of one height, on the app's card colour. */
  navRow: "w-full max-w-xl flex-row items-center gap-2 self-center",
  navGroup: "h-16 flex-row items-center rounded-full border border-border/60 bg-card px-1.5",
  navTab: "h-13 min-w-0 flex-1 items-center justify-center gap-0.5 rounded-full px-1",
  navTabActive: "bg-secondary/12",
  /** Search, "+" and place: smaller capsules than the tabs, centred beside them. */
  navActionGroup: "h-12 flex-row items-center rounded-full border border-border/60 bg-card px-1",
  navActionButton: "h-10 w-10 items-center justify-center rounded-full active:bg-muted",
  /** iPhone Duo tab pages: the two action groups at the foot, either side of the system tab bar. */
  navDuoActions: "absolute left-0 right-0 flex-row justify-between px-4",
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

  langButton: "h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card px-2.5",
  langLabel: "text-xs font-semibold text-foreground",
} as const;
