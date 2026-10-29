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
/** The pages under app/panchanga: every panchanga page but the daily one (the panchanga tab). */
const PANCHANGA_PAGE_ROUTES = [
  "panchanga/avakahada-chakra",
  "panchanga/chandra-grahan",
  "panchanga/chandrabala",
  "panchanga/choghadiya",
  "panchanga/details",
  "panchanga/element/[name]",
  "panchanga/graha-asta",
  "panchanga/graha-sthiti",
  "panchanga/graha-vakri",
  "panchanga/hora",
  "panchanga/lagna",
  "panchanga/panchaka-rahita",
  "panchanga/pushkara",
  "panchanga/surya-grahan",
  "panchanga/tarabala",
  "panchanga/year",
];

export const PAGE_CHROME_ROUTES: ReadonlySet<string> = new Set([
  "abhijit-muhurta",
  "adhik-maas",
  "brahma-mana",
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
  // The panchanga pages (tithi, choghadiya, graha asta, …) live here too, not in the panchanga
  // tab's own stack: opened from home they slide in over home, so a swipe back shows home.
  ...PANCHANGA_PAGE_ROUTES,
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
        {ready ? (
          // Panchanga pages scroll themselves, as they did in the panchanga tab: the shell stays plain views.
          <PanchangaTabsShell routeName={routeName} stableTree={routeName.startsWith("panchanga/")}>
            {children}
          </PanchangaTabsShell>
        ) : null}
      </View>
      <FloatingNavBar />
    </View>
  );
}
