/**
 * Related navigation at the bottom of patro pages — this app's route table and
 * icons; the grouping logic is shared (packages/domain).
 */

import { elementHref } from "@/lib/element-routes";
import type { DrawerIconName } from "@/lib/drawer-icons";

export {
  RELATED_LEARN_LIMIT,
  RELATED_LINK_LIMIT,
  SITE_LINK_GROUPS,
  getRelatedLearnSlugs,
  getRelatedSiteLinkIds,
  type SiteLinkGroupKey,
} from "@vedic-patro/domain/related-page-links";

export const RELATED_CARD_LIMIT = 6;

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

export const SITE_LINK_LABEL_KEY: Record<string, string> = {
  panchanga: "panchanga.title",
  "aakash-gochar": "sidebar_nav.items.aakash-gochar.label",
  holidays: "sidebar_nav.items.holidays.label",
  converter: "sidebar_nav.items.converter.label",
  suryakranti: "sidebar_nav.items.suryakranti.label",
  "panchanga-year": "sidebar_nav.items.panchanga-year.label",
  dainikkranti: "sidebar_nav.items.dainikkranti.label",
  "panchak-patro": "sidebar_nav.items.panchak-patro.label",
  ritu: "sidebar_nav.items.ritu.label",
  "avakahada-chakra": "sidebar_nav.items.avakahada.label",
  "abhijit-muhurta": "sidebar_nav.items.abhijit.label",
  kundali: "sidebar_nav.items.kundali.label",
  "kundali-milan": "sidebar_nav.items.kundali-milan.label",
  rashifal: "rashifal.title",
  gochar: "sidebar_nav.items.gochar.label",
  "graha-asta": "sidebar_nav.items.graha-asta.label",
  "graha-vakri": "sidebar_nav.items.graha-vakri.label",
  "chandra-grahan": "sidebar_nav.items.chandra-grahan.label",
  "surya-grahan": "sidebar_nav.items.surya-grahan.label",
  "shanti-vidhi": "seo.routes.shanti_vidhi.title",
  "vivah-sait": "seo.routes.vivah_sait.title",
};

export const SITE_LINK_BLURB_KEY: Record<string, string> = {
  gochar: "sidebar_nav.items.gochar.blurb",
  "graha-asta": "sidebar_nav.items.graha-asta.blurb",
  "graha-vakri": "sidebar_nav.items.graha-vakri.blurb",
  "chandra-grahan": "sidebar_nav.items.chandra-grahan.blurb",
  "surya-grahan": "sidebar_nav.items.surya-grahan.blurb",
  "aakash-gochar": "sidebar_nav.items.aakash-gochar.blurb",
};

/** Same Lucide icons web's `SITE_LINK_ICONS` picks, as drawer icon names. */
export const SITE_LINK_ICON: Record<string, DrawerIconName> = {
  panchanga: "calendar-clock",
  "aakash-gochar": "orbit",
  holidays: "party-popper",
  converter: "arrow-left-right",
  suryakranti: "sunrise",
  "panchanga-year": "calendar-range",
  dainikkranti: "moon",
  "panchak-patro": "calendar-clock",
  ritu: "sprout",
  "avakahada-chakra": "grid-3x3",
  "abhijit-muhurta": "sparkles",
  kundali: "sparkles",
  "kundali-milan": "heart",
  gochar: "route",
  "graha-asta": "sunrise",
  "graha-vakri": "rotate-ccw",
  "chandra-grahan": "moon-star",
  "surya-grahan": "eclipse",
  rashifal: "sun",
};

export function iconForLinkId(id: string): DrawerIconName {
  if (id.startsWith("element:") || id.startsWith("sait:")) return "heart-handshake";
  return SITE_LINK_ICON[id] ?? "compass";
}

const PAGE_LEARN_SLUGS: Record<string, string[]> = {
  panchanga: ["what-is-panchang", "five-limbs-together", "tithi"],
  "panchanga-year": ["rashi", "what-is-panchang"],
  holidays: ["bikram-sambat", "calendar-differences"],
  converter: ["bikram-sambat", "calendar-differences"],
  suryakranti: ["rashi", "earth-rotation-day"],
  dainikkranti: ["rashi", "what-is-panchang"],
  "panchak-patro": ["five-limbs-together", "what-is-panchang"],
  ritu: ["sidereal-vs-tropical", "bikram-sambat"],
  gochar: ["geocentric-heliocentric", "earth-rotation-day"],
  "aakash-gochar": ["geocentric-heliocentric", "earth-rotation-day"],
  "graha-asta": ["geocentric-heliocentric", "earth-rotation-day"],
  "graha-vakri": ["geocentric-heliocentric", "earth-rotation-day"],
  "chandra-grahan": ["geocentric-heliocentric"],
  "surya-grahan": ["geocentric-heliocentric"],
  rashifal: ["rashi", "five-limbs-together"],
  kundali: ["sidereal-vs-tropical"],
  "kundali-milan": ["sidereal-vs-tropical"],
  "abhijit-muhurta": ["five-limbs-together", "what-is-panchang"],
  "avakahada-chakra": ["five-limbs-together", "what-is-panchang"],
  "element:tithi": ["tithi", "lunar-month"],
  "element:nakshatra": ["five-limbs-together"],
  "element:yoga": ["five-limbs-together"],
  "element:karana": ["five-limbs-together"],
  "element:chandra-rashi": ["lunar-month", "rashi"],
  "element:hora": ["five-limbs-together"],
  "element:choghadiya": ["five-limbs-together"],
  "element:lagna": ["what-is-panchang"],
};

/** Pages that carry no related footer (home, hubs, account flows). */
const EXCLUDED_PATHS = ["/", "/panchanga/details", "/more", "/documents", "/privacy", "/terms", "/learn"];
const EXCLUDED_PREFIXES = ["/account", "/verify-email", "/reset-password", "/documents/", "/kundali/"];

export function shouldShowRelatedLinks(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (EXCLUDED_PATHS.includes(path)) return false;
  return !EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
}

export function resolveSitePageId(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (!shouldShowRelatedLinks(path)) return null;
  if (path.startsWith("/learn/")) return `learn:${path.split("/")[2]}`;
  if (path.startsWith("/panchanga/element/")) return `element:${path.split("/").pop()}`;
  const tableId = path.match(/^\/panchanga\/(choghadiya|hora|lagna|chandrabala|tarabala|panchaka-rahita|pushkara)$/)?.[1];
  if (tableId) return `element:${tableId}`;
  if (path.startsWith("/sait/")) return `sait:${path.split("/").pop()}`;
  const entry = Object.entries(SITE_LINK_PATH).find(([, p]) => p === path);
  return entry ? entry[0] : null;
}

export function siteLinkHref(linkId: string): string {
  if (linkId.startsWith("element:")) return elementHref(linkId.slice(8));
  if (linkId.startsWith("sait:")) {
    const c = linkId.slice(5);
    return c === "vivah" ? "/vivah-sait" : `/sait/${c}`;
  }
  return SITE_LINK_PATH[linkId] ?? "/";
}
