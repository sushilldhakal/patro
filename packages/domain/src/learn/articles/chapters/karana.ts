import type { ArticleData } from "../../article-schema";

/** Chapter text — written once, read by the website and the app. */
export const karana: ArticleData = {
  slug: "karana",
  seeAlso: ["tithi", "what-is-panchang", "yoga"],
  sections: [
    {
      title: {
        ne: "तिथिको आधा भाग",
        en: "Half a tithi",
      },
      eyebrow: "Half a tithi",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "करण **आधा तिथि** हो — चन्द्र–सूर्यको **६°**। तिथिको १२° [[tithi|तिथिको लेख]] मा छ; यहाँ केवल आधा भाग। एक तिथिमा दुई करण पर्ने हुनाले महिनाभरि ~६० खण्ड~ हुन्छन्, तर नाम जम्मा **११** — सात चर र चार स्थिर।",
            en: "A karana is **half a tithi** — **6°** between Moon and Sun. The tithi's 12° is the [[tithi|tithi article]]; this page is only the half. Two karanas fall in each tithi, so a month holds ~60 slots~, but only **11** names — seven movable and four fixed.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: {
                ne: "७ चर करण",
                en: "7 movable karanas",
              },
              p: {
                ne: "बव, बालव, कौलव… महिनाभरि घुमिफिरी आउँछन्।",
                en: "Bava, Balava, Kaulava… recur throughout the month.",
              },
            },
            {
              h: {
                ne: "४ स्थिर करण",
                en: "4 fixed karanas",
              },
              p: {
                ne: "शकुनि, चतुष्पद, नाग, किंस्तुघ्न — महिनामा एक–एक पटक मात्र।",
                en: "Shakuni, Chatushpada, Naga, Kimstughna — once each per month.",
              },
            },
            {
              h: {
                ne: "मुहूर्तमा प्रयोग",
                en: "Use in muhurta",
              },
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
