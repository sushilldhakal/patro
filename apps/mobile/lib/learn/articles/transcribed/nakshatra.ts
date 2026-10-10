import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `Nakshatra` — see `what-is-panchang.ts` header note. */
export const nakshatra: ArticleData = {
  slug: "nakshatra",
  sections: [
    {
      title: { ne: "२७ तारापुञ्ज", en: "27 star-clusters" },
      eyebrow: "27 lunar mansions",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "आकाशको चान्द्र–मार्गलाई **२७ बराबर भाग** मा बाँडिएको छ, प्रत्येक **१३°२०′** को। चन्द्रमा जुन भागमा हुन्छ, त्यही ~नक्षत्र~ कहलिन्छ — अश्विनीदेखि रेवतीसम्म।",
            en: "The Moon's path across the sky is divided into **27 equal parts**, each **13°20′**. Whichever part the Moon is in is the ~nakshatra~ — from Ashwini to Revati.",
          },
        },
      ],
    },
    {
      title: { ne: "पद र गणना", en: "Padas and calculation" },
      eyebrow: "Padas",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हरेक नक्षत्र फेरि **चार पद** मा बाँडिन्छ (३°२०′ प्रत्येक)। जन्म नक्षत्र र पदले कुण्डलीमा राशि र नामाक्षर तय गर्छ। नक्षत्र *अयनांश* मा भर पर्ने हुनाले सायन र निरयन गणनामा फरक आउँछ।",
            en: "Each nakshatra is further divided into **four padas** (3°20′ each). The birth nakshatra and pada set the rashi and name-syllable in the chart. Because nakshatra depends on *ayanamsha*, tropical and sidereal calculations differ.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "१३°२०′ प्रति नक्षत्र", en: "13°20′ per nakshatra" },
              p: {
                ne: "३६०° ÷ २७ — चन्द्र दिनमा करिब १ नक्षत्र पार गर्छ।",
                en: "360° ÷ 27 — the Moon crosses about 1 nakshatra per lunar day.",
              },
            },
            {
              h: { ne: "४ पद", en: "4 padas" },
              p: {
                ne: "प्रत्येक नक्षत्रको चौथाइ — नवांश र नामाक्षरको आधार।",
                en: "A quarter of each nakshatra — the basis of navamsha and name-syllable.",
              },
            },
            {
              h: { ne: "अधिपति ग्रह", en: "Ruling planet" },
              p: {
                ne: "हरेक नक्षत्रको एक स्वामी ग्रह — विंशोत्तरी दशाको जग।",
                en: "Each nakshatra has one lord planet — the foundation of Vimshottari dasha.",
              },
            },
          ],
        },
      ],
    },
  ],
};
