/** Navigation drawer tiles. The website's drawer is the look. */
export const navMenuClasses = {
  root: "flex flex-col gap-1 pb-3 pt-2",
  section: "border-t border-border/50 px-3 pb-5 pt-4",
  sectionFirst: "px-3 pb-5 pt-1",
  heading: "mb-3",
  title: "text-sm font-semibold tracking-wide text-foreground",
  accent: "mt-1.5 h-0.5 w-7 rounded-full bg-primary",
  row: "flex flex-row flex-wrap gap-2.5",
  tile: "h-[6.25rem] w-[calc((100%-1.25rem)/3)] compact:w-[calc((100%-1.875rem)/4)] flex-col items-center justify-center gap-1.5 bg-transparent px-0.5 py-1",
  tileWeb: "text-center shadow-none transition-colors duration-200 hover:text-secondary active:scale-[0.98]",
  iconWrap: "size-12 items-center justify-center rounded-full bg-muted/80",
  iconWrapActive: "bg-secondary/15",
  label: "w-full min-w-0 px-0.5 text-center text-diagram-sm font-bold leading-tight text-foreground",
  labelActive: "text-secondary",
};
