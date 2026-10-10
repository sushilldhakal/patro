import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `Sankranti` — see `what-is-panchang.ts` header note. */
export const sankranti: ArticleData = {
  slug: "sankranti",
  sections: [
    {
      title: { ne: "राशि परिवर्तनको क्षण", en: "The moment the sign changes" },
      eyebrow: "Sun enters a sign",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्य एक राशिबाट अर्को राशिमा प्रवेश गर्ने ठ्याक्क क्षणलाई ~सङ्क्रान्ति~ भनिन्छ। वर्षमा **१२ सङ्क्रान्ति** हुन्छन्, र प्रत्येकले बि.सं. को नयाँ *महिनाको पहिलो गते* चिन्ह लगाउँछ।",
            en: "The exact moment the Sun enters a new sign from the previous one is called ~Sankranti~. There are **12 sankrantis** a year, and each marks the *first day of a new BS month*.",
          },
        },
      ],
    },
    {
      title: { ne: "प्रमुख सङ्क्रान्ति", en: "Notable ones" },
      eyebrow: "Notable ones",
      blocks: [
        {
          kind: "keys",
          items: [
            {
              h: { ne: "मेष सङ्क्रान्ति", en: "Mesha Sankranti" },
              p: { ne: "बैशाख १ — नेपाली नयाँ वर्ष।", en: "Baisakh 1 — Nepali New Year." },
            },
            {
              h: { ne: "मकर सङ्क्रान्ति", en: "Makar Sankranti" },
              p: {
                ne: "माघे सङ्क्रान्ति — सूर्य उत्तरायण हुने पर्व।",
                en: "Maghe Sankranti — the festival when the Sun turns north (Uttarayana).",
              },
            },
            {
              h: { ne: "महिनाको आधार", en: "Basis of months" },
              p: {
                ne: "हरेक सङ्क्रान्ति = नयाँ सौर महिनाको सुरुवात।",
                en: "Every sankranti = the start of a new solar month.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "अधिक मास पनि सङ्क्रान्तिमै निर्भर छ — जुन चान्द्र मासमा सङ्क्रान्ति पर्दैन, त्यो अधिक हुन्छ।",
            en: "Adhik Maas also depends on sankranti — the lunar month in which no sankranti falls becomes the adhik (extra) month.",
          },
        },
      ],
    },
  ],
};
