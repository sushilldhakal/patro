import { Redirect } from "expo-router";

/** Duplicate of `/gochar` — keep the old URL working. */
export default function GrahaSthitiAlias() {
  return <Redirect href="/gochar" />;
}
