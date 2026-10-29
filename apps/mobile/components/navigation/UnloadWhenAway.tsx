import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useThemeColors } from "@/lib/theme-context";

/** How long a tab stays loaded after you leave it, so a quick look elsewhere and back is instant. */
const UNLOAD_AFTER_MS = 20_000;

type TabNavigation = {
  isFocused: () => boolean;
  addListener: (type: "focus" | "blur", cb: () => void) => () => void;
};

/**
 * A tab you have left for a while drops its page, and builds it again (from cached data) when you
 * come back. Tabs stay mounted once visited, so every tab seen in a session (panchanga's wheel,
 * kundali, vastu, learn) held its whole tree: about half a gigabyte with nothing on screen.
 *
 * The tabs run without `freezeOnBlur` for this: a frozen tab cannot render its empty stand-in, and
 * a tree unmounted while frozen was never released (an earlier attempt that froze, then unmounted,
 * climbed to gigabytes).
 */
export function UnloadWhenAway({ navigation, children }: { navigation: TabNavigation; children: ReactNode }) {
  const colors = useThemeColors();
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const away = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLoaded(false), UNLOAD_AFTER_MS);
    };
    const back = () => {
      clearTimeout(timer);
      setLoaded(true);
    };
    const offBlur = navigation.addListener("blur", away);
    const offFocus = navigation.addListener("focus", back);
    if (!navigation.isFocused()) away();
    return () => {
      clearTimeout(timer);
      offBlur();
      offFocus();
    };
  }, [navigation]);

  return loaded ? children : <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
