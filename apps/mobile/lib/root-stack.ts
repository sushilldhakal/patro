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
  const container = useRootNavigationState();
  useEffect(() => {
    // The container's state holds one `__root` route; the root stack is that route's state. Read at
    // the container level this never matched, so pages piled up under the tabs (2-4 GB in a session).
    const state = rootStackState(container);
    if (!state || state.index === 0) return;
    const top = state.routes[state.index];
    if (top?.name !== "(tabs)") return;
    navigation.dispatch({
      type: "RESET",
      payload: { ...state, index: 0, routes: [top] },
      target: state.key,
    });
  }, [navigation, container]);
}

type NavState = { type?: string; key?: string; index?: number; routes: { name: string; key: string; state?: NavState }[] };

function rootStackState(container: unknown): (NavState & { key: string; index: number }) | null {
  let state = container as NavState | undefined;
  while (state && state.routes.length === 1 && state.routes[0]?.name === "__root") state = state.routes[0].state;
  if (!state || state.type !== "stack" || !state.key || state.index == null) return null;
  return state as NavState & { key: string; index: number };
}
