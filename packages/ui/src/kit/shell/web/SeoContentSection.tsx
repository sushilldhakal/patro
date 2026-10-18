import { cn } from "@vedic-patro/design-tokens/cn";
import { seoClasses as seo } from "@vedic-patro/design-tokens/classes/seo-classes";
import { useSeoContentSection } from "@vedic-patro/features/common";
import { Box, Text } from "@vedic-patro/ui";
import type { SeoContentSectionProps } from "../contract";

/** Intro paragraphs and FAQ under converter, panchanga and holidays. */
export function SeoContentSection({ route, className }: SeoContentSectionProps) {
  const { empty, paragraphs, faqTitle, faqs } = useSeoContentSection(route);
  if (empty) return null;

  return (
    <Box as="section" className={cn(seo.section, className)}>
      {paragraphs.length > 0 ? (
        <Box className={seo.intro}>
          {paragraphs.map((paragraph, i) => (
            <Text key={i} as="p" className={seo.introParagraph}>
              {paragraph}
            </Text>
          ))}
        </Box>
      ) : null}
      {faqs.length > 0 ? (
        <Box className={seo.faq}>
          <Text as="h2" className={seo.faqTitle}>
            {faqTitle}
          </Text>
          {faqs.map((faq) => (
            <Box key={faq.q}>
              <Text className={seo.question}>{faq.q}</Text>
              <Text className={seo.answer}>{faq.a}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
