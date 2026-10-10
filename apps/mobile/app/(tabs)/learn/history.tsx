import { Redirect } from "expo-router";

/** Web retired the standalone history page — `history` is now the last chapter of `calendar-differences`. */
export default function LearnHistoryRedirect() {
  return <Redirect href="/learn/calendar-differences" />;
}
