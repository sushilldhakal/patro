import type { ArticleData } from "../../article-schema";

/** What a nakshatra is, and how the 27-fold division is made. The arithmetic lives in the calculation guide. */
export const nakshatra: ArticleData = {
  slug: "nakshatra",
  seeAlso: ["what-is-panchang", "tithi", "yoga", "how-we-calculate"],
  sections: [
    {
      title: { ne: "नक्षत्र के हो", en: "What a nakshatra is" },
      eyebrow: "27 lunar mansions",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नक्षत्र चन्द्रमा बसेको तारा-खण्ड हो। चन्द्र–मार्ग **२७ बराबर भाग** मा बाँडिएको छ, अश्विनीदेखि रेवतीसम्म। चन्द्र जुन भागमा हुन्छ, त्यही दिनको ~नक्षत्र~।",
            en: "A nakshatra is the star-sector the Moon is standing in. The Moon's path is divided into **27 equal parts**, from Ashwini to Revati. Whichever part the Moon occupies is that moment's ~nakshatra~.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यो पञ्चाङ्गको एउटा अङ्ग हो, तर सूर्यलाई हेर्दैन। तिथि र करण चन्द्र *र* सूर्यको फरक हुन्; योग दुवैको जोड हो। नक्षत्र केवल चन्द्रको स्थान हो। ती अङ्गका लेख आफ्नै ठाउँमा छन् — यहाँ दोहोर्याइँदैन।",
            en: "It is one limb of the panchanga, and it does not look at the Sun. Tithi and karana are the *difference* of Moon and Sun; yoga is their sum. Nakshatra is only where the Moon stands. Those limbs have their own articles — they are not repeated here.",
          },
        },
      ],
    },
    {
      title: { ne: "यो कसरी बन्छ", en: "How it is formed" },
      eyebrow: "360° ÷ 27",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पूरा राशिचक्र `३६०°` हो। त्यसलाई २७ ले भाग गर्दा प्रत्येक नक्षत्र **१३°२०′** को हुन्छ। चन्द्रको *निरयन* देशान्तरलाई यही चौडाइले भाग गर्दा नक्षत्रको सङ्ख्या निस्कन्छ।",
            en: "The zodiac is `360°`. Divided by 27, each nakshatra is **13°20′** wide. Divide the Moon's *sidereal* longitude by that width and the nakshatra number falls out.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "13°20′",
              label: { ne: "एउटा नक्षत्र", en: "One nakshatra" },
              desc: {
                ne: "`३६०° ÷ २७`। चन्द्र औसतमा एक दिनमा लगभग एउटा नक्षत्र पार गर्छ।",
                en: "`360° ÷ 27`. On average the Moon crosses about one nakshatra a day.",
              },
            },
            {
              big: "27",
              label: { ne: "पूरा चक्र", en: "A full round" },
              desc: {
                ne: "अश्विनी ०° बाट सुरु। रेवती पछि फेरि अश्विनी।",
                en: "Ashwini begins at 0°. After Revati comes Ashwini again.",
              },
            },
            {
              big: { ne: "चन्द्र", en: "Moon" },
              label: { ne: "एउटै सङ्ख्या", en: "One number" },
              desc: {
                ne: "सूर्यको देशान्तर चाहिँदैन। सायन र निरयन फरक पर्नु अयनांशका कारण हो — त्यो छुट्टै लेखमा।",
                en: "The Sun's longitude is not required. Sidereal and tropical answers differ because of the ayanamsha — that is a separate article.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "table-nakshatra",
          caption: {
            ne: "सत्ताइस नक्षत्र — नाम, स्वामी र पद। गणनाको काम गरेर देखाइएको सूत्र [[how-we-calculate|गणना]] लेखमा छ।",
            en: "The twenty-seven nakshatras — name, lord and pada. The worked formula is in the [[how-we-calculate|calculation]] article.",
          },
        },
      ],
    },
    {
      title: { ne: "चार पद", en: "The four padas" },
      eyebrow: "Quarters",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हरेक नक्षत्र फेरि **चार पद** मा बाँडिन्छ, प्रत्येक `३°२०′`। जन्म नक्षत्र र पदले कुण्डलीमा नामाक्षर र नवांशको शुरू तय गर्छ।",
            en: "Each nakshatra is split again into **four padas**, each `3°20′`. The birth nakshatra and pada set the name-syllable and the start of the navamsha in a chart.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "४ पद", en: "4 padas" },
              p: {
                ne: "नक्षत्रको चौथाइ — `१३°२०′ ÷ ४`।",
                en: "A quarter of the nakshatra — `13°20′ ÷ 4`.",
              },
            },
            {
              h: { ne: "अधिपति ग्रह", en: "Ruling planet" },
              p: {
                ne: "हरेक नक्षत्रको एक स्वामी — विंशोत्तरी दशाको जग। स्वामीहरूको सूची माथिको तालिकामा छ।",
                en: "Each nakshatra has one lord — the foundation of Vimshottari dasha. The lords are the table above.",
              },
            },
          ],
        },
      ],
    },
  ],
};
