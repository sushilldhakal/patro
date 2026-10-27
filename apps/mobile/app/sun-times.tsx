import { RouteAlias } from "@/components/navigation/RouteAlias";

/** Legacy web path `/sun-times` → `/suryakranti`. */
export default function SunTimesAlias() {
  return <RouteAlias to="/suryakranti" />;
}
