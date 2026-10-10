import type { ArticleData } from "../../article-schema";

export const siderealTime: ArticleData = {
  slug: "sidereal-time",
  seeAlso: ["earth-rotation-day", "right-ascension", "celestial-sphere", "time-scales"],
  sections: [
    {
      title: { ne: "ताराको घडी", en: "The clock the stars keep" },
      eyebrow: "23h 56m 4s",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*नाक्षत्र काल* सूर्यको होइन, **ताराको सापेक्ष** नापिने समय हो। नाक्षत्र दिन `२३` घण्टा `५६` मिनेट `४` सेकेन्डको हुन्छ।",
            en: "*Sidereal time* is measured not against the Sun but **against the stars**. A sidereal day runs `23` hours `56` minutes `4` seconds.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "व्यावहारिक अर्थ — कुनै तारा आज राति `९:००` बजे जुन ठाउँमा देखिन्छ, भोलि त्यही ठाउँमा `८:५६` बजे नै पुगिसक्छ। हरेक दिन `~४` मिनेट अगाडि।",
            en: "In practice: a star seen in a given position at `9:00` tonight reaches the same position at `8:56` tomorrow. Four minutes earlier, every day.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~4",
              unit: { ne: "मिनेट / दिन", en: "min / day" },
              label: { ne: "ताराको अग्रता", en: "The stars gain" },
              desc: { ne: "यसैले ऋतुअनुसार रातको आकाश फरक देखिन्छ।", en: "Which is why the night sky differs from season to season." },
            },
            {
              big: "~2",
              unit: { ne: "घण्टा / महिना", en: "hr / month" },
              label: { ne: "मासिक सरण", en: "Monthly shift" },
              desc: { ne: "एक महिनामा आकाश दुई घण्टा अगाडि सरेको हुन्छ।", en: "In a month the sky has advanced by two hours." },
            },
            {
              big: "366.25",
              label: { ne: "वर्षमा नाक्षत्र दिन", en: "Sidereal days a year" },
              desc: { ne: "सौर दिनभन्दा ठ्याक्कै एक बढी — पृथ्वीको परिक्रमाका कारण।", en: "Exactly one more than the solar count — because of Earth's orbit." },
            },
          ],
        },
        {
          kind: "diagram",
          id: "earth-rotation",
          caption: {
            ne: "नाक्षत्र दिन र सौर दिनको ~४ मिनेटको फरक — नाक्षत्र समय यही छोटो दिनमा चल्छ।",
            en: "The ~4-minute gap between a sidereal and a solar day — sidereal time runs on the shorter one.",
          },
        },
      ],
    },
    {
      title: { ne: "पञ्चाङ्गमा किन चाहिन्छ", en: "Why a panchanga needs it" },
      eyebrow: "Lagna and the houses",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नाक्षत्र काल ~लग्न~ गणनाको आधार हो। लग्न भनेको कुनै क्षणमा पूर्वी क्षितिजमा उदाउँदै गरेको राशि — र त्यो कुन राशि हो भन्ने कुरा *त्यो क्षणमा आकाश कति घुमेको छ* भन्नेमा निर्भर हुन्छ।",
            en: "Sidereal time is the basis of ~lagna~. The lagna is the rashi rising on the eastern horizon at a given moment — and which one that is depends on *how far the sky has turned* by then.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यो घुमाइ सूर्यको घडीले होइन, ताराको घडीले नापिन्छ। त्यसैले जन्म कुण्डली बनाउँदा जन्मको स्थानीय नाक्षत्र काल निकाल्नु पहिलो चरण हो।",
            en: "That turning is measured by the stars' clock, not the Sun's. So the first step in casting a birth chart is computing the local sidereal time of birth.",
          },
        },
        {
          kind: "list",
          ordered: true,
          items: [
            {
              ne: "**जन्मको समय र मिति** — कुन क्षणको आकाश चाहिएको हो।",
              en: "**Time and date of birth** — which instant of sky is wanted.",
            },
            {
              ne: "→ **स्थानीय नाक्षत्र काल** — यसका लागि ~देशान्तर~ चाहिन्छ।",
              en: "→ **local sidereal time** — this needs the ~longitude~.",
            },
            {
              ne: "→ **पूर्वी क्षितिजमा कुन देशान्तर उदाउँदै छ** — यसका लागि ~अक्षांश~ चाहिन्छ।",
              en: "→ **which longitude is rising on the eastern horizon** — this needs the ~latitude~.",
            },
            {
              ne: "→ **लग्न र बाह्र भाव** — कुण्डलीको जग।",
              en: "→ **the lagna and the twelve houses** — the frame a kundali is built on.",
            },
          ],
        },
      ],
    },
    {
      title: { ne: "लग्न हरेक दुई घण्टामा बदलिन्छ", en: "The lagna changes about every two hours" },
      eyebrow: "12 signs, 24 hours",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक दिनमा पूरै राशिचक्र क्षितिजबाट उदाउँछ। बाह्र राशि, चौबीस घण्टा — त्यसैले औसतमा हरेक **दुई घण्टा**मा लग्न बदलिन्छ।",
            en: "In one day the whole zodiac rises past the horizon. Twelve signs, twenty-four hours — so on average the lagna changes every **two hours**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "तर “औसतमा” भन्ने शब्द महत्त्वपूर्ण छ। क्रान्तिवृत्त क्षितिजसँग ढल्केको हुनाले कुनै राशि छिटो उदाउँछ, कुनै ढिलो — र यो फरक अक्षांशसँगै बढ्दै जान्छ। काठमाडौँ (`२७.७°` उत्तर) मा यो फरक उल्लेख्य हुन्छ।",
            en: "But \"on average\" is doing work there. Because the ecliptic meets the horizon at an angle, some signs rise quickly and others slowly — and the disparity grows with latitude. At Kathmandu (`27.7°` N) it is already noticeable.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यही कारण जन्म समय केही मिनेट फरक पर्दा पनि लग्न बदलिन सक्छ — र त्यससँगै पूरै कुण्डलीको भाव संरचना।",
            en: "This is why a birth time off by a few minutes can change the lagna — and with it the entire house structure of a chart.",
          },
        },
      ],
    },
  ],
};
