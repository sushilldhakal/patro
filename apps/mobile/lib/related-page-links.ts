/**
 * Related navigation at the bottom of patro pages — this app's route table and
 * icons; the grouping and page-id logic is shared (packages/domain).
 */

import { elementHref } from "@/lib/element-routes";
import type { DrawerIconName } from "@/lib/drawer-icons";
import { resolveNavIcon } from "@vedic-patro/icons";

import { normalizeSitePath, resolveSitePageIdForPath } from "@vedic-patro/domain/panchanga/related-page-links";

/** This app's route for each static site link id. */
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
  "kundali-milan": "/kundali-milan",
  rashifal: "/rashifal",
  gochar: "/gochar",
  "graha-asta": "/panchanga/graha-asta",
  "graha-vakri": "/panchanga/graha-vakri",
  "chandra-grahan": "/panchanga/chandra-grahan",
  "surya-grahan": "/panchanga/surya-grahan",
  "shanti-vidhi": "/shanti-vidhi",
  "vivah-sait": "/vivah-sait",
};

/** Same Lucide icons web's `SITE_LINK_ICONS` picks, as drawer icon names. */
export const SITE_LINK_ICON: Record<string, DrawerIconName> = {
  panchanga: "scroll-text",
  "aakash-gochar": "orbit",
  holidays: "calendar-heart",
  converter: "calendar-sync",
  suryakranti: "sunrise",
  "panchanga-year": "chart-pie",
  dainikkranti: "moon",
  "panchak-patro": "calendar-x",
  "adhik-maas": "calendar-plus",
  ritu: "leaf",
  "avakahada-chakra": "grid-3x3",
  "abhijit-muhurta": "timer",
  kundali: "sparkles",
  "kundali-milan": "heart",
  gochar: "route",
  "graha-asta": "eye-off",
  "graha-vakri": "rotate-ccw",
  "chandra-grahan": "sun-moon",
  "surya-grahan": "eclipse",
  rashifal: "sun",
};

export function iconForLinkId(id: string): DrawerIconName {
  if (id.startsWith("element:")) return resolveNavIcon("tables", id.slice("element:".length));
  if (id.startsWith("sait:")) return resolveNavIcon("sait", id.slice("sait:".length));
  return SITE_LINK_ICON[id] ?? "compass";
}

/** Pages that carry no related footer (home, hubs, account flows). */
const EXCLUDED_PATHS = ["/", "/panchanga/details", "/more", "/documents", "/privacy", "/terms", "/learn"];
const EXCLUDED_PREFIXES = ["/account", "/verify-email", "/reset-password", "/documents/", "/kundali/"];

export function shouldShowRelatedLinks(pathname: string): boolean {
  const path = normalizeSitePath(pathname);
  if (EXCLUDED_PATHS.includes(path)) return false;
  return !EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
}

export function resolveSitePageId(pathname: string): string | null {
  const path = normalizeSitePath(pathname);
  if (!shouldShowRelatedLinks(path)) return null;
  // App-only routes: each muhurta table has its own screen.
  const tableId = path.match(/^\/panchanga\/(choghadiya|hora|lagna|chandrabala|tarabala|panchaka-rahita|pushkara)$/)?.[1];
  if (tableId) return `element:${tableId}`;
  return resolveSitePageIdForPath(path, {}, SITE_LINK_PATH);
}

export function siteLinkHref(linkId: string): string {
  if (linkId.startsWith("element:")) return elementHref(linkId.slice(8));
  if (linkId.startsWith("sait:")) {
    const c = linkId.slice(5);
    return c === "vivah" ? "/vivah-sait" : `/sait/${c}`;
  }
  return SITE_LINK_PATH[linkId] ?? "/";
}
