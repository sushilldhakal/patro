import type { ArticleData } from "../../article-schema";

export const moonLunarCalendar: ArticleData = {
  slug: "moon-lunar-calendar",
  seeAlso: ["lunar-month", "shukla-krishna-paksha", "chandramana", "lunar-solar-drift"],
  sections: [
    {
      title: { ne: "तिथिबाट पक्ष, पक्षबाट मास", en: "Tithi into paksha, paksha into month" },
      eyebrow: "The structure",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तिथि [[tithi|तिथि]] हो, दुई पक्ष [[shukla-krishna-paksha|शुक्ल र कृष्ण]], र तिनको जोड [[lunar-month|चान्द्र मास]]। आधार दिन होइन — दिन पछि आउँछ, जब ती कोण सूर्योदयको सीमामा नागरिक मितिमा बाँडिन्छन्।",
            en: "A tithi is [[tithi|tithi]], the two halves are [[shukla-krishna-paksha|shukla and krishna paksha]], and together they are [[lunar-month|the lunar month]]. The day is not the basis — it enters afterwards, when those angles are placed on a civil date at the sunrise boundary.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कलाबाट पक्ष, पक्षबाट मास — चन्द्रका कला कसरी बन्छन् भन्ने चलचित्र [[solar-system|सूर्य, पृथ्वी र चन्द्रको आपसी गति]] मा छ।",
            en: "Phases into paksha, paksha into the month — how the Moon's phases arise is animated in [[solar-system|how the Sun, Earth and Moon move]].",
          },
        },
      ],
    },
    {
      title: { ne: "चन्द्रले के–के तय गर्छ", en: "What the Moon decides" },
      eyebrow: "In the Nepali calendar",
      blocks: [
        {
          kind: "keys",
          items: [
            {
              h: { ne: "चाडपर्व", en: "Festivals" },
              p: {
                ne: "दसैँ, तिहार, तीज, होली — प्रायः सबै तिथिमा आधारित। यसैले तिनका ग्रेगोरियन मिति हरेक वर्ष सर्छ।",
                en: "Dashain, Tihar, Teej, Holi — nearly all are tithi-based, which is why their Gregorian dates shift each year.",
              },
            },
            {
              h: { ne: "व्रत", en: "Fasts" },
              p: {
                ne: "एकादशी, पूर्णिमा, अमावस्या, चतुर्थी — व्रत तिथिले तय हुन्छ, गतेले होइन।",
                en: "Ekādaśī, Pūrṇimā, Amāvasyā, Caturthī — a fast is set by tithi, never by gate.",
              },
            },
            {
              h: { ne: "श्राद्ध", en: "Shraddha" },
              p: {
                ne: "मृत्युको तिथि सम्झना गरिन्छ — त्यसैले हरेक वर्ष फरक नागरिक मितिमा पर्छ।",
                en: "Observed on the tithi of a death, so it lands on a different civil date each year.",
              },
            },
            {
              h: { ne: "मुहूर्त", en: "Muhurta" },
              p: {
                ne: "शुभ समय छान्दा तिथि, नक्षत्र र करण सँगै हेरिन्छ — तीनै चन्द्रसँग जोडिएका।",
                en: "Choosing an auspicious time weighs tithi, nakshatra and karana together — all three tied to the Moon.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "शुद्ध चान्द्र पात्रोको सीमा", en: "The limit of a purely lunar calendar" },
      eyebrow: "Why Nepal is not purely lunar",
      blocks: [
        {
          kind: "note",
          text: {
            ne: "सुधार नभएको शुद्ध चान्द्र पात्रो इस्लामी पात्रो हो। त्यसको मूल्य — र नेपाली चलनले चन्द्रलाई सूर्यसँग किन बाँध्छ — [[bs-calendar|सौर, चान्द्र र चान्द्र–सौर]] मा छ। बाँध्ने साधन [[adhik-kshaya-maas|अधिक र क्षय मास]] हो।",
            en: "A purely lunar calendar, with no correction, is the Islamic one. What that costs, and why Nepali practice ties the Moon back to the Sun, is [[bs-calendar|solar, lunar and lunisolar]]. The device that does the tying is [[adhik-kshaya-maas|the extra and the skipped month]].",
          },
        },
      ],
    },
  ],
};
