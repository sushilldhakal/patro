import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";

/**
 * Old path → its new screen. `<Redirect>` inside the tab group drew a blank
 * page when the old path was opened from a link (cold start), so the move is
 * made from an effect once the router is mounted.
 */
export function RouteAlias({ to }: { to: Href }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return null;
}
