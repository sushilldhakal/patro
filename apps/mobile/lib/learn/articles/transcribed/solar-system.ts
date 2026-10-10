import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `SolarSystem` — see `what-is-panchang.ts` header note. */
export const solarSystem: ArticleData = {
  slug: "solar-system",
  sections: [
    {
      title: { ne: "सूर्य केन्द्र, पृथ्वी परिक्रमा", en: "Sun at the centre, Earth orbiting" },
      eyebrow: "Heliocentric view",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हाम्रो सौर्यमण्डलमा पृथ्वी सूर्यको वरिपरि झन्डै **३६५.२५ दिन** मा एक फेरो लगाउँछ — यही परिक्रमाले *वर्ष* बन्छ। पृथ्वी आफैँ पनि २३.५° ढल्केर घुम्ने हुनाले ऋतु फेरिन्छन्।",
            en: "In our solar system the Earth completes one orbit around the Sun in about **365.25 days** — this revolution makes the *year*. Because the Earth also spins tilted at 23.5°, the seasons change.",
          },
        },
        { kind: "diagram", id: "earth-orbit" },
      ],
    },
    {
      title: { ne: "चन्द्रको गति", en: "Lunar motion" },
      eyebrow: "Lunar motion",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रमा पृथ्वीको वरिपरि झन्डै **२७.३ दिन** (नाक्षत्र मास) मा एक फेरो लगाउँछ, तर सूर्यसमेत सर्ने हुनाले एक **औंसीदेखि अर्को औंसी** सम्म करिब २९.५ दिन लाग्छ (चान्द्र मास)। यिनै दुई गतिको खेलले पञ्चाङ्गका तिथि, नक्षत्र र पक्ष निर्धारण गर्छन्।",
            en: "The Moon completes one orbit of the Earth in about **27.3 days** (sidereal month), but because the Sun also moves, one **new moon to the next** takes about 29.5 days (synodic month). The interplay of these two motions determines the almanac's tithi, nakshatra and paksha.",
          },
        },
        { kind: "diagram", id: "tithi-elongation" },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "नाक्षत्र मास करिब २७.३ दिन", en: "Sidereal month about 27.3 days" },
              p: {
                ne: "चन्द्र आकाशमा एकै तारापुञ्जमा फर्किन लाग्ने समय।",
                en: "The time for the Moon to return to the same star-cluster in the sky.",
              },
            },
            {
              h: { ne: "चान्द्र मास करिब २९.५ दिन", en: "Synodic month about 29.5 days" },
              p: {
                ne: "एक औंसीदेखि अर्को औंसीसम्म — तिथि गणनाको आधार।",
                en: "From one new moon to the next — the basis of tithi calculation.",
              },
            },
            {
              h: { ne: "सौर वर्ष करिब ३६५.२५ दिन", en: "Solar year about 365.25 days" },
              p: {
                ne: "पृथ्वीको एक पूर्ण परिक्रमा — ऋतु र साल यसैले बन्छ।",
                en: "One full orbit of the Earth — seasons and the year come from this.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "पृथ्वीको घूर्णन", en: "Earth's rotation" },
      eyebrow: "Earth's Rotation",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वी आफ्नै अक्षमा **पश्चिमबाट पूर्वतर्फ** घुम्छ। एक पूरा घूर्णन पूरा गर्न करिब **२४ घण्टा** लाग्छ। यही घूर्णनका कारण दिन र रात हुन्छन्।",
            en: "The Earth spins on its axis **from west to east**. One full rotation takes about **24 hours**. This rotation causes day and night.",
          },
        },
        { kind: "diagram", id: "earth-rotation" },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "१ घूर्णन ≈ २४ घण्टा", en: "1 rotation ≈ 24 hours" },
              p: {
                ne: "सौर दिन — सूर्य फेरि उस्तै स्थानमा देखा पर्ने समय।",
                en: "A solar day — the time for the Sun to reappear in the same place.",
              },
            },
            {
              h: { ne: "सूर्य पूर्वबाट उदाएजस्तो देखिनु", en: "The Sun appears to rise in the east" },
              p: {
                ne: "पृथ्वीको घूर्णनका कारण हो — सूर्य नभई पृथ्वी नै घुमिरहेको हुन्छ।",
                en: "This is due to Earth's rotation — it is the Earth turning, not the Sun.",
              },
            },
            {
              h: { ne: "सूर्योदय र सूर्यास्तको समय", en: "Sunrise and sunset times" },
              p: {
                ne: "स्थानअनुसार फरक हुन्छ — देशान्तर र समय क्षेत्रले निर्धारण गर्छ।",
                en: "Vary by location — determined by longitude and time zone.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "पृथ्वीको अक्षीय झुकाव", en: "Earth's axial tilt" },
      eyebrow: "Axial Tilt",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीको अक्ष लगभग **२३.५°** झुकेको छ। यही झुकावका कारण विभिन्न ऋतुहरू उत्पन्न हुन्छन् — नेपालमा छ ऋतु:",
            en: "The Earth's axis is tilted about **23.5°**. This tilt produces the different seasons — Nepal has six ṛtu:",
          },
        },
        {
          kind: "keys",
          items: [
            { h: { ne: "वसन्त", en: "Vasanta (Spring)" }, p: { ne: "तापमान बढ्दै, दिन लामो हुँदै।", en: "Warming up, days lengthening." } },
            { h: { ne: "ग्रीष्म", en: "Grishma (Summer)" }, p: { ne: "सबैभन्दा लामो दिन, उच्च ताप।", en: "Longest day, high heat." } },
            { h: { ne: "वर्षा", en: "Varsha (Monsoon)" }, p: { ne: "मनसुन — नेपालमा प्रमुख वर्षाकाल।", en: "The monsoon — Nepal's main rainy season." } },
            { h: { ne: "शरद", en: "Sharad (Autumn)" }, p: { ne: "ताप घट्दै, शुष्क र सफा आकाश।", en: "Cooling, dry and clear skies." } },
            { h: { ne: "हेमन्त", en: "Hemanta (Pre-winter)" }, p: { ne: "जाडो सुरु, रात लामो हुँदै।", en: "Cold begins, nights lengthening." } },
            { h: { ne: "शिशिर", en: "Shishira (Winter)" }, p: { ne: "सबैभन्दा चिसो, छोटो दिन।", en: "Coldest, shortest days." } },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यदि पृथ्वीको अक्ष नझुकेको भए ऋतुहरूको परिवर्तन धेरै कम हुने थियो।",
            en: "If the Earth's axis were not tilted, the change of seasons would be far smaller.",
          },
        },
      ],
    },
    {
      title: { ne: "चन्द्रका कला", en: "Phases of the Moon" },
      eyebrow: "Phases of the Moon",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रमा आफैं प्रकाश दिने वस्तु होइन। *सूर्यको प्रकाश* परावर्तित गरेर चम्किन्छ। **औंसी** मा चन्द्र देखिँदैन; **पूर्णिमा** मा पूरै चम्किन्छ — यिनै कलाहरूले पक्ष र तिथिको अनुभव गराउँछन्।",
            en: "The Moon does not give off its own light. It shines by reflecting *the Sun's light*. At the **new moon** the Moon is not seen; at the **full moon** it shines fully — these phases give us the sense of paksha and tithi.",
          },
        },
        { kind: "diagram", id: "moon-phases", caption: { ne: "मुख्य चरणहरू", en: "Main phases" } },
        {
          kind: "note",
          text: {
            ne: "खगोलीय गतिको यही नियमितताले नै नेपाली पात्रोदेखि पञ्चाङ्गसम्मका सबै गणनाको जग बसाल्छ।",
            en: "This very regularity of celestial motion is the foundation of every calculation from the Nepali patro to the almanac.",
          },
        },
      ],
    },
  ],
};
