import type { ArticleData } from "../../article-schema";

export const calcSunset: ArticleData = {
  slug: "calc-sunset",
  seeAlso: ["calc-sunrise", "hora", "declination", "calc-moonrise"],
  sections: [
    {
      title: { ne: "सूर्यास्त — उदयकै ऐना", en: "Sunset — the mirror of sunrise" },
      eyebrow: "Same formula, other sign",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यास्तको गणना सूर्योदयकै हो, केवल घण्टा कोण **जोडिन्छ** — घटाइँदैन। परिभाषा पनि ऐनामा उभिन्छ: सूर्यको माथिल्लो किनारा क्षितिजमुनि हराउने क्षण।",
            en: "Computing sunset is computing sunrise with the hour angle **added** rather than subtracted. The definition mirrors it too: the instant the Sun's upper limb disappears below the horizon.",
          },
        },
        {
          kind: "diagram",
          id: "day-length-hour-angle",
        },
        {
          kind: "para",
          text: {
            ne: "“झन्डै” किन? किनभने दिनभरि सूर्यको क्रान्ति बदलिन्छ। बिहान र बेलुकाको क्रान्ति अलिकति फरक हुन्छ, त्यसैले सम्मिति पूर्ण हुँदैन — विशेष गरी विषुव वरिपरि, जहाँ क्रान्ति सबैभन्दा छिटो बदलिन्छ।",
            en: "Why \"almost\"? Because the Sun's declination shifts through the day. Morning and evening declinations differ slightly, so the symmetry is imperfect — most of all near the equinoxes, when declination changes fastest.",
          },
        },
      ],
    },
    {
      title: { ne: "दिनमान र रातिमान", en: "Dinamāna and rātrimāna" },
      eyebrow: "The day divided",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्योदयदेखि सूर्यास्तसम्मको अवधिलाई *दिनमान*, र सूर्यास्तदेखि अर्को सूर्योदयसम्मको अवधिलाई *रातिमान* भनिन्छ। पञ्चाङ्गका कैयन् गणना यी दुईलाई भाग गरेर बन्छन्।",
            en: "The span from sunrise to sunset is the *dinamāna*, and from sunset to the next sunrise the *rātrimāna*. Several panchanga quantities are simply subdivisions of these two.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "एकाइ", en: "Unit" },
            { ne: "कसरी बन्छ", en: "How it is formed" },
          ],
          rows: [
            [
              { ne: "होरा", en: "Hora" },
              { ne: "दिनमान ÷ १२ र रातिमान ÷ १२ — त्यसैले होरा ठ्याक्कै ६० मिनेटको हुँदैन।", en: "Dinamāna ÷ 12 and rātrimāna ÷ 12 — so a hora is not exactly 60 minutes." },
            ],
            [
              { ne: "मुहूर्त", en: "Muhurta" },
              { ne: "दिनमान ÷ १५ — दिनका पन्ध्र मुहूर्त।", en: "Dinamāna ÷ 15 — fifteen muhurtas in a day." },
            ],
            [
              { ne: "राहुकाल", en: "Rahu kaal" },
              { ne: "दिनमानलाई आठ भागमा बाँडेर, वारअनुसार एउटा भाग।", en: "Dinamāna split into eight parts, one of which is chosen by the vāra." },
            ],
            [
              { ne: "प्रहर", en: "Prahara" },
              { ne: "दिनमान ÷ ४ र रातिमान ÷ ४ — आठ प्रहर।", en: "Dinamāna ÷ 4 and rātrimāna ÷ 4 — eight praharas." },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसैले यी सबै एकाइ **लचिला** हुन्छन् — गर्मीमा दिनको होरा लामो र रातको छोटो; जाडोमा उल्टो। स्थिर ६० मिनेटको घण्टा आधुनिक अवधारणा हो।",
            en: "All these units are therefore **elastic** — in summer the day horas run long and the night ones short; in winter the reverse. The fixed sixty-minute hour is a modern idea.",
          },
        },
        {
          kind: "diagram",
          id: "sunrise-vriddhi",
        },
      ],
    },
    {
      title: { ne: "सन्ध्याकाल", en: "Twilight" },
      eyebrow: "Three definitions",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यास्तपछि आकाश तुरुन्तै अँध्यारो हुँदैन। खगोलशास्त्रले सन्ध्याकालका तीन चरण छुट्याउँछ, सूर्य क्षितिजभन्दा कति तल छ भन्ने आधारमा।",
            en: "The sky does not darken the instant the Sun sets. Astronomy distinguishes three stages of twilight by how far the Sun has sunk below the horizon.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "−6°",
              label: { ne: "नागरिक सन्ध्या", en: "Civil twilight" },
              desc: { ne: "बाहिर पढ्न पुग्ने उज्यालो — व्यावहारिक “उज्यालो”को सीमा।", en: "Bright enough to read outdoors — the practical limit of daylight." },
            },
            {
              big: "−12°",
              label: { ne: "नौसैनिक सन्ध्या", en: "Nautical twilight" },
              desc: { ne: "क्षितिज अझै छुट्टिन्छ — नौकायनका लागि उपयोगी।", en: "The horizon is still discernible — useful for navigation." },
            },
            {
              big: "−18°",
              label: { ne: "खगोलीय सन्ध्या", en: "Astronomical twilight" },
              desc: { ne: "पूर्ण रात — मधुरा तारा पनि देखिन थाल्छन्।", en: "True night — even faint stars become visible." },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "परम्परागत रूपमा *सन्ध्या* पूजाको समय सूर्यास्तको वरिपरिको यही सङ्क्रमण अवधि हो — न पूरै दिन, न पूरै रात।",
            en: "The traditional *sandhyā* period of worship is precisely this transitional window around sunset — neither fully day nor fully night.",
          },
        },
      ],
    },
  ],
};
