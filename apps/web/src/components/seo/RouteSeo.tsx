import { Helmet } from "react-helmet-async";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  buildJsonLd,
  ogImageForRoute,
  ogImageTypeForRoute,
  resolvePageSeo,
  SITE_NAME,
} from "@/lib/seo";
import { isBrowser } from "@/lib/browser";

function RouteSeoInner() {
  const { t, i18n } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const meta = resolvePageSeo(pathname, t);
  const jsonLd = buildJsonLd(meta, pathname, t);
  const htmlLang = i18n.language?.startsWith("en") ? "en" : "ne";
  const normalized = pathname.replace(/\/$/, "") || "/";
  const ogImage = ogImageForRoute(normalized);
  const ogImageType = ogImageTypeForRoute(normalized);

  return (
    <Helmet>
      <html lang={htmlLang} />
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="keywords" content={meta.keywords} />
      <link rel="canonical" href={meta.canonical} />
      {meta.noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <meta property="og:type" content={meta.type === "article" ? "article" : "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:locale" content={htmlLang === "ne" ? "ne_NP" : "en_US"} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:type" content={ogImageType} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={ogImage} />

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}

/**
 * Updates document title, meta tags, canonical URL, and JSON-LD on every route change.
 * Skipped during SSR prerender — buildHeadHtml injects those tags into <head> instead.
 */
export function RouteSeo() {
  if (!isBrowser) return null;
  return <RouteSeoInner />;
}
