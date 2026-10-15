import { useRouter } from "expo-router";
import { SiteFooter as SiteFooterView } from "@vedic-patro/ui/kit/shell";

/** Router binding. The shell and the home screen import this path. */
export function SiteFooter() {
  const router = useRouter();
  return <SiteFooterView onOpenPage={(path) => router.push(path as never)} />;
}
