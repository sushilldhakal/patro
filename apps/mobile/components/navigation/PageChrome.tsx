import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { FloatingNavBar } from "@/components/FloatingNavBar";
import { PanchangaTabsShell } from "@/components/panchanga/PanchangaTabsShell";

/**
 * Pages in the root stack (holidays, ritu, sait, documents, …) that are not
 * floating-nav tabs. Each pushed screen carries its own header, page shell and
 * floating nav, so the whole page slides in as one card and a swipe-back shows
 * the page underneath exactly as it was — the native stack does the motion.
 */
export const PAGE_CHROME_ROUTES: ReadonlySet<string> = new Set([
  "abhijit-muhurta",
  "adhik-maas",
  "chandrakranti",
  "converter",
  "documents",
  "gochar",
  "history",
  "holidays",
  "jyotish/kundali-milan",
  "jyotish/rashifal",
  "kundali-milan",
  "more",
  "offline",
  "panchak-patro",
  "rashifal",
  "reminders",
  "ritu",
  "sait/[category]",
  "shanti-vidhi",
  "sun-times",
  "suryakranti",
  "vivah-sait",
]);

/**
 * The native push only starts once the new screen's first render has committed. A full page is
 * a slow first render (over a second in a development build), so the tap froze and the page then
 * jumped in. The first render is just the chrome; the page fills in a frame later, while UIKit is
 * already sliding it in on the UI thread.
 */
function useMountAfterFirstFrame(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}

export function PageChrome({ routeName, children }: { routeName: string; children: ReactNode }) {
  const ready = useMountAfterFirstFrame();
  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <AppHeader />
      <View className="min-h-0 flex-1">
        {ready ? <PanchangaTabsShell routeName={routeName}>{children}</PanchangaTabsShell> : null}
      </View>
      <FloatingNavBar />
    </View>
  );
}
