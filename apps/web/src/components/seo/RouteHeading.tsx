import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "@vedic-patro/i18n/react";
import { resolvePageSeo } from "@/lib/seo";

/** Pages that draw their own visible <h1>; every other page gets the one below. */
const OWN_H1 = [
  "/learn",
  "/brahma-mana",
  "/converter",
  "/documents",
  "/jyotish/kundali-milan",
  "/kundali",
  "/panchanga/avakahada-chakra",
  "/panchanga/details",
  "/privacy",
  "/terms",
  "/ritu",
  "/vastu",
  "/verify-email",
  "/reset-password",
];

function hasOwnH1(path: string): boolean {
  return OWN_H1.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * The page's <h1> for search engines and screen readers, on pages whose visible
 * headings start at <h2> (home, /panchanga, /holidays, /gochar, साइत…). Text is the
 * route's SEO title without the site suffix, so it matches what the search result shows.
 * Rendered in the prerender as well — that is the HTML crawlers read first.
 */
export function RouteHeading() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const path = pathname.replace(/\/$/, "") || "/";
  if (hasOwnH1(path)) return null;
  const heading = resolvePageSeo(path, t).title.split(" | ")[0]!.trim();
  if (!heading) return null;
  return <h1 className="sr-only">{heading}</h1>;
}
