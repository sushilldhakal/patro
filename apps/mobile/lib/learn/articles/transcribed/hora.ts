import type { ArticleData } from "../../article-schema";

/**
 * Transcribed from web's hand-written `HoraArticle` — see `what-is-panchang.ts`
 * header note. The live ring is replaced by `hora-live` (`HoraTodayDiagram`),
 * wired to mobile's own panchang data rather than a pixel port of web's SVG wheel.
 */
export const hora: ArticleData = {
  slug: "hora",
  sections: [
    {
      title: { ne: "दिनका चौबीस होरा", en: "The day's twenty-four horas" },
      eyebrow: "Planetary hours",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "प्रत्येक दिनलाई **चौबीस होरा** (ग्रहीय घण्टा) मा बाँडिन्छ — सूर्योदयदेखि अर्को सूर्योदयसम्म। हरेक होरालाई ~सात ग्रह~ (आदित्य, शुक्र, बुध, चन्द्र, शनि, बृहस्पति, मङ्गल) ले पालैपालो शासन गर्छन्। सूर्योदयपछिको **पहिलो होरा** को स्वामी ग्रहले नै *दिनको नाम* दिन्छ।",
            en: "Each day is divided into **twenty-four horas** (planetary hours) — from sunrise to the next sunrise. Each hora is ruled in turn by the ~seven planets~ (Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars). The lord of the **first hora** after sunrise gives the *day its name*.",
          },
        },
        { kind: "diagram", id: "hora-live" },
      ],
    },
    {
      title: { ne: "कसरी पढ्ने", en: "How to read it" },
      eyebrow: "How to read it",
      blocks: [
        {
          kind: "keys",
          items: [
            { h: { ne: "वलय = एक दिन", en: "Ring = one day" }, p: { ne: "भित्री वलय आइतबार, बाहिरी शनिबार — सात वलय सात दिन।", en: "The inner ring is Sunday, the outer Saturday — seven rings, seven days." } },
            { h: { ne: "होरा क्रम", en: "Hora order" }, p: { ne: "हरेक वलयभित्र चौबीस होरा; ग्रह आदित्य → शनि क्रममा घुम्छन्।", en: "Twenty-four horas within each ring; planets cycle Sun → Saturn." } },
            { h: { ne: "दिनको स्वामी", en: "Lord of the day" }, p: { ne: "सूर्योदयको पहिलो होराको ग्रह = त्यो दिनको स्वामी (वार)।", en: "The planet of the first hora at sunrise = that day's lord (vaara)." } },
            { h: { ne: "निरन्तर गणना", en: "Unbroken count" }, p: { ne: "आइतबारको अन्तिम होरा सोमबारमा गुड्छ — कहिल्यै रोकिँदैन।", en: "Sunday's last hora rolls into Monday — it never stops." } },
          ],
        },
      ],
    },
    {
      title: { ne: "किन काम लाग्छ", en: "Why it matters" },
      eyebrow: "Why it matters",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "शुभ कार्यको मुहूर्त छान्दा होरा हेरिन्छ — जस्तै यात्रा वा व्यापारका लागि **बुध/बृहस्पति** होरा, स्थिर कामका लागि **शनि** होरा अनुकूल मानिन्छ। माथिको सूची अहिलेको होरामा केन्द्रित छ — दिनभर हेर्दा होरा कसरी सर्छ थाहा हुन्छ।",
            en: "A hora is checked when choosing a muhurta for auspicious work — e.g. a **Mercury/Jupiter** hora for travel or business, a **Saturn** hora for steady work. The list above is centred on the current hora — check back through the day to see how it shifts.",
          },
        },
      ],
    },
  ],
};
