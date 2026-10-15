/**
 * The intro paragraphs and FAQ that close the converter, panchanga and
 * holidays pages, shared by the website's and the app's
 * `components/seo/SeoContentSection.tsx`. Same `seo_faq.*` strings as the
 * website's FAQPage JSON-LD, with the current AD and BS years filled in.
 */
import { toDevanagariDigits } from "@vedic-patro/domain/locale";
import { useLocale } from "@vedic-patro/i18n/react";

export type SeoContentRoute = "converter" | "panchanga" | "holidays";

/** How many FAQ entries a route may have; the list stops at the first missing one. */
const MAX_FAQS = 8;

/** Year variables the SEO copy is written with (BS new year falls mid-April). */
function seoYears(now: Date = new Date()): Record<string, string> {
  const adYear = now.getFullYear();
  const afterNewYear = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 14);
  const bsYear = adYear + (afterNewYear ? 57 : 56);
  return { adYear: String(adYear), bsYear: String(bsYear), bsYearNe: toDevanagariDigits(bsYear) };
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (whole, k: string) => vars[k] ?? whole);
}

export function useSeoContentSection(route: SeoContentRoute) {
  const { t, tList } = useLocale();
  const years = seoYears();
  const paragraphs = tList<string>(`seo_faq.${route}.intro`).map((p) => fill(p, years));

  const faqs: { q: string; a: string }[] = [];
  for (let i = 0; i < MAX_FAQS; i += 1) {
    const q = t(`seo_faq.${route}.items.${i}.q`, years);
    const a = t(`seo_faq.${route}.items.${i}.a`, years);
    // A missing translation comes back as its key.
    if (!q || !a || q.startsWith("seo_faq.") || a.startsWith("seo_faq.")) break;
    faqs.push({ q, a });
  }

  return {
    empty: paragraphs.length === 0 && faqs.length === 0,
    paragraphs,
    faqTitle: t("seo_faq.section_title"),
    faqs,
  };
}
