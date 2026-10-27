import { Redirect, useLocalSearchParams } from "expo-router";

/** Web path `/jyotish/rashifal` → mobile rashifal screen. */
export default function RashifalAlias() {
  const { period } = useLocalSearchParams<{ period?: string }>();
  return (
    <Redirect
      href={
        period
          ? { pathname: "/rashifal", params: { period } }
          : "/rashifal"
      }
    />
  );
}
