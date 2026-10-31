import { RouteAlias } from "@/components/navigation/RouteAlias";

/** Legacy path `/history` → the Surya Siddhanta page, which carries the history chapter. */
export default function HistoryAlias() {
  return <RouteAlias to="/learn/surya-siddhanta" />;
}
