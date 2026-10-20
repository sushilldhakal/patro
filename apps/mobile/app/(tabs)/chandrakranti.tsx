import { RouteAlias } from "@/components/navigation/RouteAlias";

/** Legacy path `/chandrakranti` → daily transit. */
export default function ChandrakrantiAlias() {
  return <RouteAlias to="/dainikkranti" />;
}
