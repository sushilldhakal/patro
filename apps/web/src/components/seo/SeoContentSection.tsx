import { cn } from "@vedic-patro/domain/utils";
import { useSeoContentSection, type SeoContentRoute } from "@vedic-patro/features/common";
import { seoClasses } from "@vedic-patro/design-tokens/classes/seo-classes";

/**
 * Static intro + FAQ content rendered at the bottom of key pages. This text is
 * part of the prerendered HTML (the data-driven parts of these pages are
 * client-fetched and invisible to crawlers), and it backs the FAQPage JSON-LD
 * emitted from the same seo_faq.* strings — keep them in sync.
 */
export function SeoContentSection({ route }: { route: SeoContentRoute }) {
  const { empty, paragraphs, faqTitle, faqs } = useSeoContentSection(route);

  if (empty) return null;

  return (
    <section className="space-y-6 border-t border-border pt-8 text-base leading-relaxed">
      {paragraphs.length > 0 && (
        <div className="space-y-3 text-muted-foreground">
          {paragraphs.map((p, i) => (
            <p key={i} className={seoClasses.introParagraph}>{p}</p>
          ))}
        </div>
      )}
      {faqs.length > 0 && (
        <div className="space-y-4">
          <h2 className={seoClasses.faqTitle}>{faqTitle}</h2>
          <dl className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className={seoClasses.question}>{f.q}</dt>
                <dd className={cn("mt-1", seoClasses.answer)}>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
