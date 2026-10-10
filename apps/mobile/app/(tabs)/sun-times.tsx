import { Redirect } from "expo-router";

/** Legacy web path `/sun-times` → `/suryakranti`. */
export default function SunTimesAlias() {
  return <Redirect href="/suryakranti" />;
}
