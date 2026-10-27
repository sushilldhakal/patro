import { useEffect } from "react";
import { useNavigationContainerRef, useRootNavigationState } from "expo-router";

/**
 * The tabs screen has a fixed id (app/_layout.tsx), so a link to a tab page from a pushed page
 * moves that one instance to the top of the root stack. The pages it came from are then under
 * it, unreachable — the tabs never swipe back. Drop them, keeping the tabs' own route (same key,
 * so nothing remounts or animates); otherwise every trip back to a tab would leave pages in memory.
 */
export function useDropPagesBehindTabs() {
  const navigation = useNavigationContainerRef();
  const state = useRootNavigationState();
  useEffect(() => {
    if (!state || state.type !== "stack" || state.index === 0) return;
    const top = state.routes[state.index];
    if (top?.name !== "(tabs)") return;
    navigation.dispatch({
      type: "RESET",
      payload: { ...state, index: 0, routes: [top] },
      target: state.key,
    });
  }, [navigation, state]);
}
