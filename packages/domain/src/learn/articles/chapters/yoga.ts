import type { ArticleData } from "../../article-schema";

/** Chapter text — written once, read by the website and the app. */
export const yoga: ArticleData = {
  slug: "yoga",
  seeAlso: ["what-is-panchang", "nakshatra", "tithi", "karana"],
  sections: [
    {
      title: {
        ne: "सूर्य + चन्द्रको जोड",
        en: "Sum of Sun + Moon",
      },
      eyebrow: "Sun + Moon longitude",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "योग सूर्य र चन्द्रको **देशान्तर जोडेर** बन्छ। जोड हरेक **१३°२०′** बढ्दा नयाँ योग सुरु हुन्छ — नक्षत्रकै चौडाइ, तर नक्षत्र चन्द्रको स्थान मात्र हो। जम्मा ~२७ योग~ छन्, विष्कम्भदेखि वैधृतिसम्म।",
            en: "A yoga is formed by **adding the longitudes** of the Sun and the Moon. Each time the sum grows by **13°20′** a new yoga begins — the same width as a nakshatra, but a nakshatra is only the Moon's place. There are ~27 yogas~, from Vishkambha to Vaidhriti.",
          },
        },
        {
          kind: "diagram",
          id: "table-yoga",
          caption: {
            ne: "सत्ताइस योग। तिथि र करण घटाउ हुन्; योग जोड हो। काम गरेर देखाइएको भाग [[how-we-calculate|गणना]] मा छ।",
            en: "The twenty-seven yogas. Tithi and karana are a difference; yoga is a sum. The worked division is in [[how-we-calculate|the calculation]].",
          },
        },
      ],
    },
    {
      title: {
        ne: "किन महत्त्व",
        en: "Why it matters",
      },
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
