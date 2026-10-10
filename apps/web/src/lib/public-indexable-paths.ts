import { LEARN_TOPIC_METAS } from "@/lib/learn/learn-topics-meta";
import { CEREMONY_META, ELEMENT_META } from "@/lib/panchanga-elements";
import { PRERENDER_EXTRA_PATHS, STATIC_SITEMAP_ENTRIES, type SitemapChangefreq } from "@/lib/app-routes";

export type SitemapEntry = {
  path: string;
  changefreq: SitemapChangefreq;
  priority: string;
};

const DYNAMIC_ENTRIES: SitemapEntry[] = [
  ...LEARN_TOPIC_METAS.map((t) => ({
    path: `/learn/${t.slug}`,
    changefreq: "monthly" as const,
    priority: "0.6",
  })),
  ...ELEMENT_META.map((e) => ({
    path: `/panchanga/element/${e.id}`,
    changefreq: "weekly" as const,
    priority: "0.6",
  })),
  ...CEREMONY_META.map((c) => ({
    path: `/sait/${c.id}`,
    changefreq: "weekly" as const,
    priority: "0.7",
  })),
];

function dedupeByPath(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.path)) continue;
    seen.add(entry.path);
    out.push(entry);
  }
  return out;
}

/** All routes that should appear in sitemap.xml (index, follow). */
export const SITEMAP_ENTRIES: SitemapEntry[] = dedupeByPath([
  ...STATIC_SITEMAP_ENTRIES,
  ...DYNAMIC_ENTRIES,
]);

export const PUBLIC_INDEXABLE_PATHS: string[] = SITEMAP_ENTRIES.map((e) => e.path);

/** Build-time prerender: indexable pages plus auth screens (noindex in robots). */
export { PRERENDER_EXTRA_PATHS };

export const PRERENDER_PATHS: string[] = [
  ...PUBLIC_INDEXABLE_PATHS,
  ...PRERENDER_EXTRA_PATHS,
];
