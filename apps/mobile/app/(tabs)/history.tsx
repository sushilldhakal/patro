import { Redirect } from "expo-router";

/** Legacy path `/history` → the history chapter of `calendar-differences`. */
export default function HistoryAlias() {
  return <Redirect href="/learn/calendar-differences" />;
}
