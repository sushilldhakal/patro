import { Redirect } from "expo-router";

/** Canonical web path `/jyotish/kundali-milan` → existing tab screen. */
export default function KundaliMilanAlias() {
  return <Redirect href="/kundali-milan" />;
}
