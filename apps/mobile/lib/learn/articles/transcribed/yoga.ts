import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `Yoga` — see `what-is-panchang.ts` header note. */
export const yoga: ArticleData = {
  slug: "yoga",
  sections: [
    {
      title: { ne: "सूर्य + चन्द्रको जोड", en: "Sum of Sun + Moon" },
      eyebrow: "Sun + Moon longitude",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "योग पञ्चाङ्गको चौथो अङ्ग हो। यो सूर्य र चन्द्रको **देशान्तर जोडेर** निकालिन्छ — जोड हरेक **१३°२०′** बढ्दा नयाँ योग सुरु हुन्छ। जम्मा ~२७ योग~ छन् — विष्कम्भदेखि वैधृतिसम्म।",
            en: "Yoga is the fourth limb of the almanac. It is found by **adding the longitudes** of the Sun and Moon — each time the sum increases by **13°20′** a new yoga begins. There are ~27 yogas~ in all — from Vishkambha to Vaidhriti.",
          },
        },
      ],
    },
    {
      title: { ne: "किन महत्त्व", en: "Why it matters" },
      eyebrow: "Why it matters",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "केही योग शुभ मानिन्छन् भने केही (जस्तै व्यतीपात, वैधृति) त्याज्य। मुहूर्त निकाल्दा तिथि–वार–नक्षत्रसँगै योग पनि हेरिन्छ।",
            en: "Some yogas are considered auspicious while others (such as Vyatipata, Vaidhriti) are avoided. When choosing a muhurta, yoga is checked alongside tithi, vaara and nakshatra.",
          },
        },
      ],
    },
  ],
};
