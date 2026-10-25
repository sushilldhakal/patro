import type { ArticleData } from "../../article-schema";

export const earthRotationDay: ArticleData = {
  slug: "earth-rotation-day",
  seeAlso: ["sidereal-time", "solar-system", "vara", "sky-rotation"],
  sections: [
    {
      title: { ne: "दिन — पृथ्वीको एक फेरो", en: "A day is one turn of Earth" },
      eyebrow: "But one turn against what?",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अघिल्लो खण्डले नाक्षत्र दिन र सौर दिन छुट्यायो। ठ्याक्कै लम्बाइ यी हुन् — ताराको सापेक्ष, र सूर्यको सापेक्ष।",
            en: "The previous chapter separated the sidereal day from the solar day. These are the exact lengths — against the stars, and against the Sun.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "23h 56m 4s",
              label: { ne: "नाक्षत्र दिन", en: "Sidereal day" },
              desc: {
                ne: "ताराको सापेक्ष एक पूरा घुर्णन — वास्तविक घुर्णन काल।",
                en: "One full rotation against the stars — Earth's true rotation period.",
              },
            },
            {
              big: "24h 00m",
              label: { ne: "सौर दिन", en: "Solar day" },
              desc: {
                ne: "सूर्य फेरि उही स्थानमा फर्किन लाग्ने समय — हाम्रो घडीको आधार।",
                en: "The time for the Sun to return to the same place — what our clocks keep.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "४ मिनेटको फरक किन", en: "Where the four minutes go" },
      eyebrow: "Earth also orbits",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "थप चार मिनेट अघिल्लो खण्डमै छ। तलको चित्र त्यो थप घुमाइ हो — पृथ्वी कक्षमा झन्डै `१°` अघि बढेपछि सूर्यलाई उही ठाउँमा ल्याउने।",
            en: "The extra four minutes are already in the previous chapter. The figure below is that extra turn — about `1°` of orbit, to bring the Sun back to the same place.",
          },
        },
        {
          kind: "diagram",
          id: "sidereal-solar-day",
        },
        {
          kind: "note",
          text: {
            ne: "घडी र घाम किन बाझिन्छन् भन्ने कुरा पनि त्यहीँ छ — [[what-is-a-day|दिन के हो]]। पञ्चाङ्गको सूर्योदय औसत घडी होइन, सूर्यको वास्तविक स्थिति हो।",
            en: "Why the clock and the sundial disagree is there too — [[what-is-a-day|what a day is]]. A panchanga sunrise uses the Sun's real position, not the average clock.",
          },
        },
      ],
    },
  ],
};
