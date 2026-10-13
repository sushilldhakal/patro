/**
 * Intro + FAQ block at the foot of converter, panchanga and holidays. The
 * website sets `text-base leading-relaxed` once on the section and the text
 * inherits it; React Native text does not inherit, so each run carries it.
 */
export const seoClasses = {
  introParagraph: "text-base leading-relaxed text-muted-foreground",
  faqTitle: "text-lg font-bold text-foreground",
  question: "text-base font-semibold leading-relaxed text-foreground",
  answer: "text-base leading-relaxed text-muted-foreground",
} as const;
