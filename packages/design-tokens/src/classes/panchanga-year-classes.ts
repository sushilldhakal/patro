import { panchangaPageClasses } from "./panchanga-page-classes";

/**
 * Panchanga year wheel page (pages/PanchangaYear.tsx, app/panchanga/year).
 * The website is the source; both apps import these strings. The error box is
 * the panchanga page's own.
 */
export const panchangaYearClasses = {
  shell: "mx-auto max-w-page px-4 pb-16 pt-4",
  header: "mb-3 mt-2",
  backLink: "mb-1.5 items-center gap-1 text-xs",
  title: "m-0 text-xl font-bold leading-tight tracking-tight",
  body: "mt-4 gap-4",
  errorBox: panchangaPageClasses.page.errorBox,
  errorText: panchangaPageClasses.page.errorText,
  status: "m-0 px-1 text-xs",
} as const;
