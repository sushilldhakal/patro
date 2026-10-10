import { Redirect } from "expo-router";

/** Legacy path `/chandrakranti` → daily transit. */
export default function ChandrakrantiAlias() {
  return <Redirect href="/dainikkranti" />;
}
