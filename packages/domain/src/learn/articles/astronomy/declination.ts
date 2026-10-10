import type { ArticleData } from "../../article-schema";

export const declination: ArticleData = {
  slug: "declination",
  seeAlso: ["celestial-equator", "uttarayana-dakshinayana", "calc-sunrise", "axial-tilt"],
  sections: [
    {
      title: { ne: "क्रान्ति — आकाशको अक्षांश", en: "Declination — latitude on the sky" },
      eyebrow: "North or south of the equator",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*क्रान्ति* कुनै खगोलीय पिण्ड खगोलीय विषुवत् रेखाभन्दा कति उत्तर वा दक्षिण छ भन्ने नाप हो — पृथ्वीको अक्षांशकै आकाशीय संस्करण।",
            en: "*Declination* measures how far north or south of the celestial equator a body lies — the sky's version of terrestrial latitude.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "धनात्मक क्रान्ति", en: "Positive declination" },
              p: { ne: "विषुवत् रेखाभन्दा **उत्तर**। नेपालबाट यस्ता पिण्ड आकाशमा अग्लो देखिन्छन्।", en: "**North** of the equator. From Nepal such bodies ride high in the sky." },
            },
            {
              h: { ne: "ऋणात्मक क्रान्ति", en: "Negative declination" },
              p: { ne: "विषुवत् रेखाभन्दा **दक्षिण**। यी क्षितिजनजिक रहन्छन्।", en: "**South** of the equator. These stay closer to the horizon." },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सूर्यको क्रान्ति वर्षभरि `+२३.४४°` देखि `−२३.४४°` सम्म ओहोरदोहोर गर्छ — यही ओहोरदोहोरले ऋतु, अयन र दिनको लम्बाइ तय गर्छ।",
            en: "The Sun's declination swings between `+23.44°` and `−23.44°` through the year — and that swing sets the seasons, the ayanas and the length of the day.",
          },
        },
        {
          kind: "diagram",
          id: "declination-year",
        },
      ],
    },
    {
      title: { ne: "दुई समन्वय प्रणाली", en: "Two coordinate systems" },
      eyebrow: "ecliptic vs equatorial",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्गले मुख्यतः **क्रान्तिवृत्तीय** समन्वय (देशान्तर) प्रयोग गर्छ, तर सूर्योदय जस्ता कुरा गणना गर्न **विषुवत्** समन्वय (क्रान्ति) चाहिन्छ।",
            en: "A panchanga mostly works in **ecliptic** coordinates (longitude), but computing something like sunrise needs **equatorial** coordinates (declination).",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "प्रणाली", en: "System" },
            { ne: "आधार तल", en: "Reference plane" },
            { ne: "समन्वय", en: "Coordinates" },
            { ne: "प्रयोग", en: "Used for" },
          ],
          rows: [
            [
              { ne: "क्रान्तिवृत्तीय", en: "ecliptic" },
              { ne: "सूर्यको मार्ग", en: "The Sun's path" },
              { ne: "देशान्तर, शर", en: "Longitude, latitude" },
              { ne: "राशि, तिथि, नक्षत्र", en: "Rashi, tithi, nakshatra" },
            ],
            [
              { ne: "विषुवत्", en: "Equatorial" },
              { ne: "पृथ्वीको विषुवत् रेखा", en: "Earth's equator" },
              { ne: "विषुवांश, क्रान्ति", en: "Right ascension, declination" },
              { ne: "उदय–अस्त, लग्न", en: "Rising and setting, lagna" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "दुईबीच रूपान्तरण अक्ष झुकाव `२३.४४°` प्रयोग गरेर गरिन्छ — गणनामा यो चरण अनिवार्य हुन्छ।",
            en: "Converting between them uses the `23.44°` axial tilt — an unavoidable step in the computation.",
          },
        },
      ],
    },
    {
      title: { ne: "सूर्योदयको समय यसैले बदल्छ", en: "This is what shifts sunrise" },
      eyebrow: "Declination + latitude",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्योदयको समय दुई कुराले तय हुन्छ: **सूर्यको क्रान्ति** र **स्थानको अक्षांश**। यी दुई मिलेर दिनको लम्बाइ दिन्छन्।",
            en: "Sunrise time is fixed by two things: **the Sun's declination** and **your latitude**. Together they give the length of the day.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "cos(H) = −tan(अक्षांश) × tan(क्रान्ति)", en: "cos(H) = −tan(latitude) × tan(declination)" },
            { ne: "दिनको लम्बाइ = `२`H", en: "day length = `2`H" },
          ],
          example: [
            { k: { ne: "काठमाडौँको अक्षांश", en: "Kathmandu's latitude" }, v: "27.7°N" },
            { k: { ne: "ग्रीष्म अयनान्त · δ = +२३.४४°", en: "summer solstice · δ = +23.44°" }, v: "~13h 50m" },
            { k: { ne: "शीत अयनान्त · δ = −२३.४४°", en: "winter solstice · δ = −23.44°" }, v: "~10h 25m" },
          ],
          result: {
            ne: "अक्षांश जति बढी, दुई अयनान्तबीचको दिन–लम्बाइको फरक त्यति नै ठूलो — भूमध्यरेखामा फरक शून्य, ध्रुवमा पूरै दिन/रात।",
            en: "The higher the latitude, the wider the gap between the two solstices — zero at the equator, a whole day or night at the pole.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "विषुवत् रेखामा (`०°` अक्षांश) क्रान्ति जे भए पनि दिन सधैँ झन्डै `१२` घण्टाको हुन्छ। ध्रुवमा भने महिनौँ लामो दिन र रात हुन्छन् — उही सूत्रको चरम परिणाम।",
            en: "At the equator (`0°` latitude) the day stays close to `12` hours whatever the declination. At the poles it becomes months of daylight and months of night — the same formula taken to its extreme.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "नेपाल `२६°`–`३०°` उत्तरमा पर्ने हुनाले दिनको लम्बाइ वर्षभरि झन्डै `३.५` घण्टा घटबढ हुन्छ — उल्लेख्य, तर युरोपजस्तो चरम होइन।",
            en: "Nepal lies between `26°` and `30°` north, so its day length varies by about `3.5` hours across the year — noticeable, but nothing like the extremes of Europe.",
          },
        },
      ],
    },
  ],
};
