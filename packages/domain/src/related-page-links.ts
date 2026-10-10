/**
 * Related navigation at the bottom of patro pages — peers from the same sidebar
 * group, plus optional learn-article slugs. The routes themselves differ between
 * the website and the app, so each app keeps its own path table.
 */

import { CEREMONY_META, ELEMENT_BY_ID, ELEMENT_META } from "./panchanga-elements";
import { LEARN_LIBRARY } from "./learn/learn-library";

export const RELATED_LINK_LIMIT = 6;
export const RELATED_LEARN_LIMIT = 3;

const SPAN_IDS = ELEMENT_META.filter((e) => e.kind === "span").map((e) => `element:${e.id}`);
const TABLE_IDS = ELEMENT_META.filter((e) => e.kind === "table").map((e) => `element:${e.id}`);
const SAIT_IDS = CEREMONY_META.map((c) => `sait:${c.id}`);

export const SITE_LINK_GROUPS = {
  patro: [
    "holidays",
    "converter",
    "suryakranti",
    "panchanga-year",
    "dainikkranti",
    "panchak-patro",
    "ritu",
  ],
  jyotish: ["avakahada-chakra", "abhijit-muhurta", "kundali", "kundali-milan", "rashifal"],
  daily: ["panchanga", "panchanga-year", "dainikkranti", "gochar", "aakash-gochar", "abhijit-muhurta"],
  graha: [
    "gochar",
    "aakash-gochar",
    "graha-asta",
    "graha-vakri",
    "chandra-grahan",
    "surya-grahan",
  ],
  spans: SPAN_IDS,
  tables: TABLE_IDS,
  sait: SAIT_IDS,
} as const;

export type SiteLinkGroupKey = keyof typeof SITE_LINK_GROUPS;


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


/**
 * Site page → learn guides worth reading next.
 *
 * These must name *live page* slugs, not retired chapter slugs: an unknown slug
 * is dropped silently, so a stale entry here shows up only as a related section
 * that is quietly one link short.
 */
export const PAGE_LEARN_SLUGS: Record<string, string[]> = {
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

export function primaryGroup(pageId: string): SiteLinkGroupKey {
  if (pageId.startsWith("element:")) {
    const el = ELEMENT_BY_ID[pageId.slice(8)];
    return el?.kind === "span" ? "spans" : "tables";
  }
  if (pageId.startsWith("sait:")) return "sait";
  if (pageId.startsWith("learn:") || pageId === "learn-hub") return "daily";
  if (SITE_LINK_GROUPS.graha.includes(pageId as (typeof SITE_LINK_GROUPS.graha)[number])) {
    return "graha";
  }
  if (SITE_LINK_GROUPS.jyotish.includes(pageId as (typeof SITE_LINK_GROUPS.jyotish)[number])) {
    return "jyotish";
  }
  if (SITE_LINK_GROUPS.patro.includes(pageId as (typeof SITE_LINK_GROUPS.patro)[number])) {
    return "patro";
  }
  return "daily";
}

function pickCircular(group: readonly string[], currentId: string, limit: number): string[] {
  const filtered = group.filter((id) => id !== currentId);
  if (!filtered.length) return [];
  if (!group.includes(currentId)) return filtered.slice(0, limit);

  const idx = group.indexOf(currentId);
  const out: string[] = [];
  for (let i = 1; i <= group.length && out.length < limit; i++) {
    const id = group[(idx + i) % group.length]!;
    if (id !== currentId && !out.includes(id)) out.push(id);
  }
  return out;
}

export function getRelatedSiteLinkIds(pageId: string, limit = RELATED_LINK_LIMIT): string[] {
  if (pageId === "learn-hub") {
    return [...SITE_LINK_GROUPS.patro.slice(0, 3), ...SITE_LINK_GROUPS.graha.slice(0, 3)].slice(
      0,
      limit,
    );
  }

  if (pageId.startsWith("learn:")) {
    return pickCircular(SITE_LINK_GROUPS.daily, "panchanga", limit);
  }

  const groupKey = primaryGroup(pageId);
  const group = SITE_LINK_GROUPS[groupKey];
  return pickCircular(group, pageId, limit);
}

export function getRelatedLearnSlugs(pageId: string, limit = RELATED_LEARN_LIMIT): string[] {
  if (pageId.startsWith("learn:")) {
    const slug = pageId.slice(6);
    const topic = LEARN_LIBRARY.find((t) => t.slug === slug && t.status === "published");
    if (!topic) return [];
    return LEARN_LIBRARY.filter(
      (t) => t.status === "published" && t.section === topic.section && t.slug !== slug,
    )
      .slice(0, limit)
      .map((t) => t.slug);
  }

  const mapped = PAGE_LEARN_SLUGS[pageId];
  if (mapped?.length) return mapped.slice(0, limit);

  if (pageId.startsWith("sait:")) {
    return ["what-is-panchang", "five-limbs-together"].slice(0, limit);
  }

  if (pageId === "learn-hub") return [];

  return [];
}

