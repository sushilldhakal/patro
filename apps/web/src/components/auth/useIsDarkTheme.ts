import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

/** Resolved dark/light after mount — avoids wrong OAuth widget theme before hydration. */
export function useIsDarkTheme(): boolean | undefined {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return undefined;
  if (resolvedTheme === "dark") return true;
  if (resolvedTheme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
