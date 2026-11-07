/** Navigation drawer tiles. The website's drawer is the look. */
export const navMenuClasses = {
  root: "flex flex-col gap-1 pb-3 pt-2",
  section: "border-t border-border/50 px-3 pb-5 pt-4",
  sectionFirst: "px-3 pb-5 pt-1",
  heading: "mb-3",
  title: "text-sm font-semibold tracking-wide text-foreground",
  accent: "mt-1.5 h-0.5 w-7 rounded-full bg-primary",
  row: "flex flex-row flex-wrap gap-2.5",
  tile: "h-[6.25rem] w-[calc((100%-1.25rem)/3)] compact:w-[calc((100%-1.875rem)/4)] flex flex-col items-center justify-center gap-1.5 bg-transparent px-0.5 py-1",
  tileWeb: "text-center shadow-none transition-colors duration-200 hover:text-secondary active:scale-[0.98]",
  iconWrap: "flex size-12 shrink-0 items-center justify-center rounded-full bg-muted/80",
  iconWrapActive: "bg-secondary/15 dark:bg-secondary/15",
  label: "w-full min-w-0 px-0.5 text-center text-diagram-sm font-bold leading-tight text-foreground",
  labelActive: "text-secondary",
  /** The three category tabs at the top of the side menu (website; the app draws its own pills). */
  tabs: "mx-3 mt-2 flex rounded-2xl bg-muted p-1",
  tab: "min-h-11 flex-1 truncate rounded-xl px-1 py-2 text-sm font-semibold transition-colors",
  tabOn: "bg-card text-secondary shadow-sm",
  tabOff: "text-muted-foreground hover:text-foreground",
  categoryTitle: "mx-3 mt-3 text-base font-bold text-foreground",
  /** The app's side menu: four smaller tiles a row. */
  nativeTile: "w-full items-center gap-1.5 px-0.5 py-2",
  nativeIconWrap: "size-10 items-center justify-center rounded-2xl bg-muted/80 dark:bg-foreground/10",
  nativeLabel: "w-full min-w-0 text-center text-[15px] font-semibold leading-snug text-foreground",
  /** The app's side menu header: the tabs and the close button on one row. In dark the sheet is the card
      colour, so the track and the selected pill are lifted with the foreground instead. */
  nativeTabs: "min-w-0 flex-1 flex-row rounded-full bg-muted p-1 dark:bg-foreground/5",
  nativeTabOn: "rounded-full bg-card dark:bg-foreground/15",
  nativeTab: "h-11 flex-1 items-center justify-center rounded-full px-2",
  nativeCategoryTitle: "mx-4 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
};
