import type { ArticleData } from "../../article-schema";

export const lunarLongitude: ArticleData = {
  slug: "lunar-longitude",
  seeAlso: ["solar-longitude", "calc-tithi", "calc-nakshatra", "tithi-not-24-hours"],
  sections: [
    {
      title: { ne: "चन्द्रको देशान्तर", en: "The Moon's longitude" },
      eyebrow: "The fastest-moving number",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*चान्द्र देशान्तर* क्रान्तिवृत्तमा चन्द्रको स्थान हो। सूर्यको देशान्तरसँग मिलेर यसले पञ्चाङ्गका पाँचमध्ये चार अङ्ग बनाउँछ।",
            en: "*Lunar longitude* is the Moon's place along the ecliptic. Together with the Sun's it produces four of the panchanga's five limbs.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "अङ्ग", en: "Limb" },
            { ne: "गणना", en: "Computation" },
          ],
          rows: [
            [{ ne: "तिथि", en: "Tithi" }, "(चन्द्र − सूर्य) ÷ 12°"],
            [{ ne: "करण", en: "Karana" }, "(चन्द्र − सूर्य) ÷ 6°"],
            [{ ne: "नक्षत्र", en: "Nakshatra" }, "चन्द्र ÷ 13°20′"],
            [{ ne: "योग", en: "Yoga" }, "(सूर्य + चन्द्र) ÷ 13°20′"],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसैले चन्द्रको देशान्तरमा सानो त्रुटि भए पनि पञ्चाङ्गका चार अङ्गमा एकसाथ असर पर्छ — गणनामा यो सबैभन्दा संवेदनशील सङ्ख्या हो।",
            en: "A small error in lunar longitude therefore propagates into four limbs at once — it is the most sensitive number in the whole computation.",
          },
        },
        {
          kind: "diagram",
          id: "moon-orbit-tilt",
          caption: {
            ne: "चन्द्रको कक्ष क्रान्तिवृत्तबाट ५.१° झुकेको — देशान्तर यही तलमा नापिन्छ।",
            en: "The Moon's orbit tilted 5.1° from the ecliptic — longitude is measured on that plane.",
          },
        },
      ],
    },
    {
      title: { ne: "चन्द्र गणना गाह्रो किन", en: "Why the Moon is hard to compute" },
      eyebrow: "Many perturbations",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यको देखिने गतिमा मुख्यतः एउटा सुधार चाहिन्छ। चन्द्रमा भने **दर्जनौँ** — किनभने चन्द्र पृथ्वी र सूर्य दुवैको खिँचावमा छ।",
            en: "The Sun's apparent motion needs essentially one correction. The Moon needs **dozens**, because it is pulled by both Earth and the Sun.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "13.176°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "औसत गति", en: "Mean daily motion" },
              desc: { ne: "सूर्यभन्दा झन्डै तेह्र गुणा छिटो।", en: "About thirteen times faster than the Sun." },
            },
            {
              big: "11–15°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "वास्तविक दायरा", en: "Actual range" },
              desc: { ne: "उपभू र अपभूबीचको फरक — यसैले तिथि लामो–छोटो हुन्छ।", en: "Between perigee and apogee — the source of long and short tithis." },
            },
            {
              big: "±5°",
              label: { ne: "क्रान्तिवृत्तबाट विचलन", en: "Deviation from the ecliptic" },
              desc: { ne: "कक्ष झुकावका कारण; ग्रहणको सर्त यसैले तय गर्छ।", en: "From the orbital tilt; this is what governs the eclipse condition." },
            },
          ],
        },
        {
          kind: "list",
          items: [
            {
              ne: "**विषमता (evection)** — सूर्यले चन्द्रको कक्षको आकार बदल्छ; सबैभन्दा ठूलो सुधार, `±१.३°` सम्म।",
              en: "**Evection** — the Sun distorts the Moon's orbit; the largest correction, up to `±1.3°`.",
            },
            {
              ne: "**परिवर्तन (variation)** — औंसी र पूर्णिमामा चन्द्रको गति बढ्छ, पक्षको मध्यमा घट्छ।",
              en: "**Variation** — the Moon speeds up at the syzygies and slows at the quarters.",
            },
            {
              ne: "**वार्षिक समीकरण** — पृथ्वी उपसौरमा हुँदा सूर्यको प्रभाव बलियो हुन्छ।",
              en: "**Annual equation** — the Sun's influence strengthens when Earth is near perihelion.",
            },
          ],
        },
      ],
    },
    {
      title: { ne: "सिद्धान्तदेखि स्विस एफेमेरिससम्म", en: "From the siddhantas to Swiss Ephemeris" },
      eyebrow: "Same problem, better tools",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सिद्धान्त ग्रन्थले चन्द्रका लागि दुई मुख्य सुधार प्रयोग गर्थे — *मन्द* र *शीघ्र* फल। यीले वास्तविकतासँग राम्रै मेल खान्थे, तर शताब्दीयौँको दायरामा सानो त्रुटि जम्मा हुन्थ्यो।",
            en: "The siddhantas applied two main corrections to the Moon — the *manda* and *shighra phala*. They matched reality well, though small errors accumulated across centuries.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "आधुनिक पञ्चाङ्ग — वेदिक पात्रो सहित — **स्विस एफेमेरिस** प्रयोग गर्छ, जुन नासा/जेपीएल को ग्रहपातमा आधारित छ। यसले चन्द्रको स्थान विकलाभन्दा राम्रो शुद्धतामा दिन्छ।",
            en: "Modern panchangas — Vedic Patro included — use the **Swiss Ephemeris**, built on NASA/JPL's DE431. It gives the Moon's position to better than an arc-second.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यही कारण आजको गणना गरिएको पञ्चाङ्ग र परम्परागत विधिले बनाइएको पञ्चाङ्गमा कहिलेकाहीँ तिथिको सन्धि समय केही घण्टा फरक पर्न सक्छ — विधि फरक, आकाश उही।",
            en: "It is also why a computed panchanga and one prepared by traditional methods can differ by a few hours in a tithi's end time — different methods, the same sky.",
          },
        },
      ],
    },
  ],
};
