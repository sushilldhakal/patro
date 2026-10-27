import { RouteAlias } from "@/components/navigation/RouteAlias";

/** Legacy path `/history` → the history chapter of `calendar-differences`. */
export default function HistoryAlias() {
  return <RouteAlias to="/learn/calendar-differences" />;
}
