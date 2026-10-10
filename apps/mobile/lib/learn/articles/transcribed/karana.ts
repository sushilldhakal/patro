import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `Karana` — see `what-is-panchang.ts` header note. */
export const karana: ArticleData = {
  slug: "karana",
  sections: [
    {
      title: { ne: "तिथिको आधा भाग", en: "Half a tithi" },
      eyebrow: "Half a tithi",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "करण भनेको **आधा तिथि** हो — चन्द्र–सूर्यको **६° कोणीय दूरी**। एक तिथिमा दुई करण पर्ने हुनाले महिनाभरि ~६० करण~ हुन्छन्, तर नाम जम्मा **११** — सात चर (बारम्बार दोहोरिने) र चार स्थिर।",
            en: "A karana is **half a tithi** — a **6° angular gap** between Moon and Sun. Since each tithi contains two karanas, there are ~60 karanas~ across a month, but only **11** names — seven movable (repeating) and four fixed.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "७ चर करण", en: "7 movable karanas" },
              p: {
                ne: "बव, बालव, कौलव… महिनाभरि घुमिफिरी आउँछन्।",
                en: "Bava, Balava, Kaulava… recur throughout the month.",
              },
            },
            {
              h: { ne: "४ स्थिर करण", en: "4 fixed karanas" },
              p: {
                ne: "शकुनि, चतुष्पद, नाग, किंस्तुघ्न — महिनामा एक–एक पटक मात्र।",
                en: "Shakuni, Chatushpada, Naga, Kimstughna — once each per month.",
              },
            },
            {
              h: { ne: "मुहूर्तमा प्रयोग", en: "Use in muhurta" },
              p: {
                ne: "विष्टि (भद्रा) करण अशुभ मानिन्छ — शुभ कार्य टारिन्छ।",
                en: "The Vishti (Bhadra) karana is inauspicious — auspicious work is avoided.",
              },
            },
          ],
        },
      ],
    },
  ],
};
