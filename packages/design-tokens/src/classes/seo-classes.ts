/**
 * Intro + FAQ block at the foot of converter, panchanga and holidays. The
 * website sets `text-base leading-relaxed` once on the section and the text
 * inherits it; React Native text does not inherit, so each run carries it.
 */
export const seoClasses = {
  section: "flex flex-col gap-6 border-t border-border pt-8",
  intro: "flex flex-col gap-3",
  faq: "flex flex-col gap-4",
  introParagraph: "text-base leading-relaxed text-muted-foreground",
  faqTitle: "text-lg font-bold text-foreground",
  question: "text-base font-semibold leading-relaxed text-foreground",
  answer: "mt-1 text-base leading-relaxed text-muted-foreground",
} as const;
