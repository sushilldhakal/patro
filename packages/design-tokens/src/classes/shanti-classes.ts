/**
 * Shanti Vidhi page: the birth-details card that wraps the controls and the
 * shared ShantiVidhiPanel (whose own classes live in kundali-detail-classes).
 * Shared by the website and the app.
 */
export const shantiClasses = {
  card: "rounded-2xl border border-border",
  header: "flex flex-row items-center gap-1.5 border-b border-border px-4 py-3",
  headerTitle: "text-sm font-semibold text-foreground",
  headerMeta: "ml-auto text-sm",
  body: "flex flex-col gap-4 p-4",
} as const;
