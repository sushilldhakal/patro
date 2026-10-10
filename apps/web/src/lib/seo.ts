import { LEARN_TOPICS_BY_SLUG } from "@/lib/learn/learn-topics-meta";
import { PRERENDER_PATHS as ALL_PRERENDER_PATHS } from "@/lib/public-indexable-paths";
import { ROUTE_SEO_KEYS, isNoindexPath } from "@/lib/app-routes";

export const SITE_NAME = "Vedic Patro";
export const SITE_URL = "https://www.vedicpatro.com";

export const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

/**
 * Live दिन-चक्र chart for today (Kathmandu) — used as the share image on the
 * home + panchanga routes so a shared vedicpatro.com preview shows the actual
 * chart, not the static logo.
 *
 * Use the bare `/og-image` path (nginx proxies it to FastAPI), not `/api/og-image`:
 * `robots.txt` disallows `/api/`, and Facebook's crawler respects that when
 * fetching og:image — so an `/api/...` share URL falls back to favicon.svg in
 * the Sharing Debugger even though the meta tag and Twitter previews are fine.
 * No `date` means today; `city=1283240` is Kathmandu.
 *
 * `v` is a manual cache-buster: the PNG is cached hard by Cloudflare, the
 * backend's disk cache and Facebook's scraper, so bump it whenever the card
 * layout changes or the old image keeps showing for days. v2 = 1200×630
 * full-bleed card (chart + summary panel) instead of the letterboxed chart.
 */
export const CHART_OG_IMAGE_URL = `${SITE_URL}/og-image?city=1283240&v=2`;

/** Routes whose share image is the live panchanga chart rather than the logo. */
const CHART_OG_ROUTES = new Set(["/", "/panchanga"]);

export function ogImageForRoute(normalized: string): string {
  return CHART_OG_ROUTES.has(normalized) ? CHART_OG_IMAGE_URL : OG_IMAGE_URL;
}

/** MIME type for the route's share image (chart PNG vs static JPG logo). */
export function ogImageTypeForRoute(normalized: string): string {
  return CHART_OG_ROUTES.has(normalized) ? "image/png" : "image/jpeg";
}

export interface PageSeoMeta {
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  noindex: boolean;
  type: "website" | "article";
}

export interface FaqItem {
  q: string;
  a: string;
}

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

const DEVANAGARI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

function toDevanagariDigits(value: number): string {
  return String(value).replace(/\d/g, (d) => DEVANAGARI_DIGITS[Number(d)]!);
}

/**
 * Interpolation values for SEO strings: {{adYear}}, {{bsYear}}, {{bsYearNe}}.
 * Bikram Sambat new year (Baisakh 1) falls around April 13–14; close enough
 * for title keywords — prerendered pages refresh the year on each deploy.
 */
export function seoYearVars(now: Date = new Date()): Record<string, string> {
  const adYear = now.getFullYear();
  const afterNewYear = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 14);
  const bsYear = adYear + (afterNewYear ? 57 : 56);
  return {
    adYear: String(adYear),
    bsYear: String(bsYear),
    bsYearNe: toDevanagariDigits(bsYear),
  };
}

export function resolvePageSeo(pathname: string, t: TFunc): PageSeoMeta {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const canonical = `${SITE_URL}${normalized}`;
  const noindex = isNoindexPath(normalized);
  const years = seoYearVars();

  const learnMatch = normalized.match(/^\/learn\/([^/]+)$/);
  if (learnMatch) {
    const topic = LEARN_TOPICS_BY_SLUG[learnMatch[1]!];
    if (topic) {
      return {
        title: `${topic.titleEn} | ${SITE_NAME}`,
        description: topic.summary,
        keywords: t("seo.site_keywords", years),
        canonical,
        noindex,
        type: "article",
      };
    }
  }

  const routeKey = ROUTE_SEO_KEYS[normalized];
  if (routeKey) {
    const keywords = t(`${routeKey}.keywords`, years);
    return {
      title: t(`${routeKey}.title`, years),
      description: t(`${routeKey}.description`, years),
      keywords: keywords || t("seo.site_keywords", years),
      canonical,
      noindex,
      type: "website",
    };
  }

  return {
    title: t("seo.routes.home.title", years),
    description: t("seo.default_description", years),
    keywords: t("seo.site_keywords", years),
    canonical,
    noindex,
    type: "website",
  };
}

/** Routes that render a visible FAQ section; JSON-LD FAQPage uses the same strings. */
const FAQ_ROUTES: Record<string, string> = {
  "/converter": "seo_faq.converter",
  "/panchanga": "seo_faq.panchanga",
  "/holidays": "seo_faq.holidays",
};

export function getRouteFaqs(pathname: string, t: TFunc): FaqItem[] {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const key = FAQ_ROUTES[normalized];
  if (!key) return [];
  const years = seoYearVars();
  const items: FaqItem[] = [];
  for (let i = 0; i < 8; i += 1) {
    const q = t(`${key}.items.${i}.q`, years);
    const a = t(`${key}.items.${i}.a`, years);
    // i18next returns the key itself when a translation is missing.
    if (!q || !a || q.startsWith("seo_faq.") || a.startsWith("seo_faq.")) break;
    items.push({ q, a });
  }
  return items;
}

/** Page title without the "| Vedic Patro" branding suffix, for breadcrumb labels. */
function shortTitle(title: string): string {
  return title.split("|")[0]!.trim();
}

function buildBreadcrumbs(pathname: string, meta: PageSeoMeta, t: TFunc): Record<string, unknown> | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  if (normalized === "/") return null;

  const segments = normalized.split("/").filter(Boolean);
  const items: { name: string; url: string }[] = [{ name: SITE_NAME, url: `${SITE_URL}/` }];
  let prefix = "";
  for (const segment of segments) {
    prefix += `/${segment}`;
    const routeKey = ROUTE_SEO_KEYS[prefix];
    const isLast = prefix === normalized;
    const name = isLast
      ? shortTitle(meta.title)
      : routeKey
        ? shortTitle(t(`${routeKey}.title`, seoYearVars()))
        : segment;
    items.push({ name, url: `${SITE_URL}${prefix}` });
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildJsonLd(meta: PageSeoMeta, pathname: string, t: TFunc): Record<string, unknown> {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const graph: Record<string, unknown>[] = [];

  if (normalized === "/") {
    graph.push(
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: ["वैदिक पात्रो", "Vedic Patro", "Nepali Patro"],
        description: meta.description,
        url: `${SITE_URL}/`,
        inLanguage: ["ne", "en"],
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: OG_IMAGE_URL,
      },
    );
  } else if (meta.type === "article") {
    graph.push({
      "@type": "Article",
      headline: meta.title,
      description: meta.description,
      url: meta.canonical,
      image: OG_IMAGE_URL,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    });
  } else {
    graph.push({
      "@type": "WebPage",
      name: shortTitle(meta.title),
      description: meta.description,
      url: meta.canonical,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: ["ne", "en"],
    });
  }

  const breadcrumbs = buildBreadcrumbs(pathname, meta, t);
  if (breadcrumbs) graph.push(breadcrumbs);

  const faqs = getRouteFaqs(pathname, t);
  if (faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Static head tags injected at prerender time (Nepali default locale). */
export function buildHeadHtml(pathname: string, t: TFunc): string {
  const meta = resolvePageSeo(pathname, t);
  const normalized = pathname.replace(/\/$/, "") || "/";
  const ogImage = ogImageForRoute(normalized);
  const ogImageType = ogImageTypeForRoute(normalized);
  const jsonLd = JSON.stringify(buildJsonLd(meta, pathname, t)).replace(/</g, "\\u003c");

  const lines = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    meta.noindex
      ? `<meta name="robots" content="noindex, nofollow" />`
      : `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="${meta.type === "article" ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:locale" content="ne_NP" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:type" content="${ogImageType}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ];

  return lines.join("\n    ");
}

/** Public routes pre-rendered at build time for crawlers and first paint. */
export const PRERENDER_PATHS: string[] = ALL_PRERENDER_PATHS;
