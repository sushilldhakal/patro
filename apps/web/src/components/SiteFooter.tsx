import { useNavigate } from "@tanstack/react-router";
import { SiteFooter as SiteFooterView } from "@vedic-patro/ui/kit/shell";

/** Router binding. `router.tsx` imports this path. */
export function SiteFooter() {
  const navigate = useNavigate();
  return <SiteFooterView onOpenPage={(path) => void navigate({ to: path as "/privacy" | "/terms" })} />;
}
