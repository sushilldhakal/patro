import { useTranslation } from "react-i18next";
import { getRouteFaqs, seoYearVars } from "@/lib/seo";

type SeoRoute = "converter" | "panchanga" | "holidays";

/**
 * Static intro + FAQ content rendered at the bottom of key pages. This text is
 * part of the prerendered HTML (the data-driven parts of these pages are
 * client-fetched and invisible to crawlers), and it backs the FAQPage JSON-LD
 * emitted from the same seo_faq.* strings — keep them in sync.
 */
export function SeoContentSection({ route }: { route: SeoRoute }) {
  const { t } = useTranslation();
  const years = seoYearVars();
  const intro = t(`seo_faq.${route}.intro`, { returnObjects: true, ...years });
  const paragraphs = Array.isArray(intro) ? (intro as string[]) : [];
  const faqs = getRouteFaqs(`/${route}`, t);

  if (paragraphs.length === 0 && faqs.length === 0) return null;

  return (
    <section className="space-y-6 border-t border-border pt-8 text-[15px] leading-relaxed">
      {paragraphs.length > 0 && (
        <div className="space-y-3 text-muted-foreground">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      {faqs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t("seo_faq.section_title")}</h2>
          <dl className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
