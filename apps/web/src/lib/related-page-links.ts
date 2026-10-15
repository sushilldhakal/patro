/**
 * Related navigation at the bottom of patro pages — the website's route table
 * and link props; the grouping logic is shared (packages/domain).
 */

import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import type { Era } from "@vedic-patro/domain/era";
import { patroElementLinkSearch, patroRouteLinkSearch } from "@/lib/url-state";

import { normalizeSitePath, resolveSitePageIdForPath } from "@vedic-patro/domain/related-page-links";

/** Static route for a site link id (dynamic ids use `element:` / `sait:` prefixes). */
export const SITE_LINK_PATH: Record<string, string> = {
  panchanga: "/panchanga",
  "aakash-gochar": "/aakash-gochar",
  holidays: "/holidays",
  converter: "/converter",
  suryakranti: "/suryakranti",
  "panchanga-year": "/panchanga/year",
  dainikkranti: "/dainikkranti",
  "panchak-patro": "/panchak-patro",
  ritu: "/ritu",
  "avakahada-chakra": "/panchanga/avakahada-chakra",
  "abhijit-muhurta": "/abhijit-muhurta",
  kundali: "/kundali",
  "kundali-milan": "/jyotish/kundali-milan",
  rashifal: "/jyotish/rashifal",
  gochar: "/gochar",
  "graha-asta": "/panchanga/graha-asta",
  "graha-vakri": "/panchanga/graha-vakri",
  "chandra-grahan": "/panchanga/chandra-grahan",
  "surya-grahan": "/panchanga/surya-grahan",
  "shanti-vidhi": "/shanti-vidhi",
  "vivah-sait": "/vivah-sait",
};

const EXCLUDED_PATH_PREFIXES = [
  "/account",
  "/verify-email",
  "/reset-password",
  "/panchanga/og-preview",
];

export function shouldShowRelatedLinks(pathname: string): boolean {
  const path = normalizeSitePath(pathname);
  if (path === "/") return false;
  if (path === "/panchanga/details") return false;
  return !EXCLUDED_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export function resolveSitePageId(pathname: string, params: Record<string, string>): string | null {
  if (!shouldShowRelatedLinks(pathname)) return null;
  return resolveSitePageIdForPath(pathname, params, SITE_LINK_PATH);
}

export function siteLinkRouteProps(
  linkId: string,
  location: PanchangaLocation,
  era: Era,
): {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
} {
  if (linkId.startsWith("element:")) {
    const name = linkId.slice(8);
    return {
      to: "/panchanga/element/$name",
      params: { name },
      search: patroElementLinkSearch(name, location, era) as Record<string, unknown>,
    };
  }
  if (linkId.startsWith("sait:")) {
    const category = linkId.slice(5);
    return {
      to: "/sait/$category",
      params: { category },
      search: patroRouteLinkSearch(`/sait/${category}`, location, era),
    };
  }
  const path = SITE_LINK_PATH[linkId];
  if (!path) {
    return { to: "/" };
  }
  return {
    to: path,
    search: patroRouteLinkSearch(path, location, era),
  };
}
