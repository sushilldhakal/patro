import { Stack } from "expo-router";

/** Shell sidebar is provided by `PanchangaTabsShell` in `(tabs)/_layout.tsx`. */
export default function PanchangaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent", flex: 1 },
      }}
    />
  );
}
