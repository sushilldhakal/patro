import type { ArticleData } from "../../article-schema";

/**
 * Transcribed from web's hand-written `WhatIsPanchang` (`src/lib/learn/learn-articles.tsx`)
 * — that component is JSX, not data, so it cannot be copied; this is a manual
 * re-authoring into the data schema. See `mobile-learn-taxonomy-deferred`
 * memory / Learn port plan Phase 2.
 */
export const whatIsPanchang: ArticleData = {
  slug: "what-is-panchang",
  sections: [
    {
      title: { ne: "पञ्चाङ्ग = पाँच अङ्ग", en: "Panchanga = five limbs" },
      eyebrow: "The five limbs",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "“पञ्चाङ्ग” शब्द **पञ्च (पाँच) + अङ्ग** बाट बनेको हो। हरेक दिनको खगोलीय अवस्था वर्णन गर्न पाँच तत्त्व प्रयोग हुन्छन् — यिनै पाँचले शुभ–अशुभ मुहूर्त, पर्व र दैनिक गणना निर्धारण गर्छन्।",
            en: "The word \"panchanga\" comes from **pancha (five) + anga (limb)**. Five elements describe each day's celestial state — together they determine auspicious/inauspicious muhurtas, festivals and the daily calculation.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "१. तिथि", en: "1. Tithi" },
              p: {
                ne: "चन्द्र–सूर्यको १२° कोणीय दूरीले बन्ने चान्द्र दिन।",
                en: "The lunar day formed by the 12° angular gap between Moon and Sun.",
              },
            },
            {
              h: { ne: "२. वार", en: "2. Vaara" },
              p: {
                ne: "हप्ताको सात दिन — सूर्य, सोम, मङ्गल…।",
                en: "The seven weekdays — Sunday, Monday, Tuesday…",
              },
            },
            {
              h: { ne: "३. नक्षत्र", en: "3. Nakshatra" },
              p: {
                ne: "चन्द्र रहेको २७ तारापुञ्जमध्ये एक।",
                en: "One of the 27 star-clusters the Moon occupies.",
              },
            },
            {
              h: { ne: "४. योग", en: "4. Yoga" },
              p: {
                ne: "सूर्य र चन्द्रको देशान्तर जोडबाट बन्ने २७ योग।",
                en: "The 27 yogas formed from the sum of the Sun's and Moon's longitudes.",
              },
            },
            {
              h: { ne: "५. करण", en: "5. Karana" },
              p: {
                ne: "तिथिको आधा भाग — एक तिथिमा दुई करण।",
                en: "Half of a tithi — two karanas per tithi.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यस ज्ञानकेन्द्रका छुट्टाछुट्टै लेखमा यी पाँचै अङ्ग कसरी गणना हुन्छन् भनेर विस्तारमा बुझाइएको छ।",
            en: "Separate articles in this knowledge center explain in detail how each of these five limbs is calculated.",
          },
        },
      ],
    },
  ],
};
